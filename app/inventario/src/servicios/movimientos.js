const db = require("../config/db");
const rabbit = require("../config/rabbit");
const catalogo = require("./catalogo");
const reabastecimiento = require("./reabastecimiento");
const Bodega = require("../modelos/bodega");
const Stock = require("../modelos/stock");
const Movimiento = require("../modelos/movimiento");
const { ErrorHttp } = require("../errores");

// Lógica de registrar un movimiento. La usan POST /movimientos, POST /devoluciones
// y aceptar una sugerencia de traslado.

const TIPOS = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO", "DEVOLUCION_CLIENTE", "DEVOLUCION_PROVEEDOR"];
const REFERENCIAS = ["ORDEN_COMPRA", "FACTURA", "SUGERENCIA"];
const INTENTOS = 3;

// Qué bodegas toca cada tipo: "origen" pierde unidades y "destino" las gana
const BODEGAS_POR_TIPO = {
  ENTRADA: ["destino"],
  DEVOLUCION_CLIENTE: ["destino"],
  SALIDA: ["origen"],
  DEVOLUCION_PROVEEDOR: ["origen"],
  AJUSTE: ["origen"],
  TRASLADO: ["origen", "destino"],
};

function validar(datos) {
  const { tipo, productoId, cantidad, bodegaOrigenId, bodegaDestinoId, referencia } = datos;
  if (!TIPOS.includes(tipo)) return "tipo debe ser uno de: " + TIPOS.join(", ");
  if (!Number.isInteger(productoId)) return "productoId es obligatorio y debe ser entero";
  if (!Number.isInteger(cantidad) || cantidad === 0) return "cantidad es obligatoria, entera y distinta de cero";
  if (cantidad < 0 && tipo !== "AJUSTE") return "cantidad solo puede ser negativa en un AJUSTE";

  const bodegas = BODEGAS_POR_TIPO[tipo];
  if (bodegas.includes("origen") && !bodegaOrigenId) return `${tipo} requiere bodegaOrigenId`;
  if (bodegas.includes("destino") && !bodegaDestinoId) return `${tipo} requiere bodegaDestinoId`;
  if (tipo === "TRASLADO" && bodegaOrigenId === bodegaDestinoId) return "Las bodegas del traslado deben ser distintas";

  // El tipo de la referencia puede ir vacío (las devoluciones guardan solo el texto de la factura o remisión)
  if (referencia && (!referencia.id || (referencia.tipo && !REFERENCIAS.includes(referencia.tipo)))) {
    return "referencia debe tener id, y su tipo debe ser uno de: " + REFERENCIAS.join(", ");
  }
  return null;
}

async function validarBodega(id) {
  const bodega = await Bodega.buscar(id);
  if (!bodega || !bodega.activa) throw new ErrorHttp(404, "BODEGA_NO_EXISTE", `La bodega ${id} no existe o está inactiva`);
}

// Actualiza los saldos y guarda el movimiento en una sola transacción.
// Si otro movimiento cambió el mismo saldo al tiempo (bloqueo optimista), se reintenta.
async function guardar(datos) {
  const bodegas = BODEGAS_POR_TIPO[datos.tipo];

  for (let intento = 1; intento <= INTENTOS; intento++) {
    const conexion = await db.getConnection();
    try {
      await conexion.beginTransaction();
      const afectaciones = [];

      if (bodegas.includes("origen")) {
        // En un AJUSTE la cantidad ya trae el signo; en los demás tipos el origen pierde unidades
        const cambio = datos.tipo === "AJUSTE" ? datos.cantidad : -datos.cantidad;
        const resultado = await Stock.aplicarCambio(conexion, datos.productoId, datos.bodegaOrigenId, cambio);
        datos.saldoOrigen = resultado.saldo;
        afectaciones.push(resultado);
      }
      if (bodegas.includes("destino")) {
        const resultado = await Stock.aplicarCambio(conexion, datos.productoId, datos.bodegaDestinoId, datos.cantidad);
        datos.saldoDestino = resultado.saldo;
        afectaciones.push(resultado);
      }

      const movimiento = await Movimiento.insertar(conexion, datos);
      await conexion.commit();
      return { movimiento, afectaciones, nuevo: true };
    } catch (error) {
      await conexion.rollback();

      // La misma Idempotency-Key llegó dos veces al mismo tiempo: se devuelve el que ganó
      if (error.code === "ER_DUP_ENTRY" && datos.clave) {
        return { movimiento: await Movimiento.buscarPorClave(datos.clave), nuevo: false };
      }
      if (!error.conflictoVersion) throw error;
      console.log(`Conflicto de saldo, reintento ${intento} de ${INTENTOS}`);
    } finally {
      conexion.release();
    }
  }
  throw new ErrorHttp(409, "CONFLICTO_CONCURRENCIA", "El saldo cambió mientras se registraba; intente de nuevo");
}

// Avisa a Reportes con el producto y el saldo de cada bodega afectada
function publicarMovimiento(movimiento, producto, afectaciones) {
  rabbit.publicar("inventario.movimiento.registrado", {
    movimientoId: movimiento.id,
    tipo: movimiento.tipo,
    cantidad: movimiento.cantidad,
    producto: {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: producto.categoria,
      costoReferencia: producto.costoReferencia,
    },
    afectaciones: afectaciones.map((a) => ({ bodegaId: a.bodegaId, saldo: a.saldo, stockMinimo: a.stockMinimo })),
  });
}

// datos: MovimientoInput. clave: Idempotency-Key (opcional). usuarioId: cabecera X-Usuario-Id.
// Devuelve { movimiento, nuevo } donde nuevo=false si la clave ya se había usado.
async function registrar(datos, usuarioId, clave) {
  const error = validar(datos);
  if (error) throw new ErrorHttp(400, "DATOS_INVALIDOS", error);

  if (clave) {
    const existente = await Movimiento.buscarPorClave(clave);
    if (existente) return { movimiento: existente, nuevo: false };
  }

  // Solo se guardan las bodegas que usa el tipo (una ENTRADA no tiene origen, por ejemplo)
  const bodegas = BODEGAS_POR_TIPO[datos.tipo];
  const bodegaOrigenId = bodegas.includes("origen") ? datos.bodegaOrigenId : null;
  const bodegaDestinoId = bodegas.includes("destino") ? datos.bodegaDestinoId : null;

  const producto = await catalogo.buscarProductoActivo(datos.productoId);
  if (bodegaOrigenId) await validarBodega(bodegaOrigenId);
  if (bodegaDestinoId) await validarBodega(bodegaDestinoId);

  const resultado = await guardar({ ...datos, bodegaOrigenId, bodegaDestinoId, clave, usuarioId });
  if (!resultado.nuevo) return resultado;

  // El movimiento ya quedó guardado: si falla un evento se registra en el log, pero no se deshace
  publicarMovimiento(resultado.movimiento, producto, resultado.afectaciones);
  reabastecimiento.revisar(producto, resultado.afectaciones).catch((e) => console.log("Error en reabastecimiento:", e.message));

  return resultado;
}

module.exports = { registrar };
