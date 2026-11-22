const Movimiento = require("../modelos/movimiento");
const servicio = require("../servicios/movimientos");
const { paginacion } = require("../paginacion");

// Una devolución no tiene tabla propia: es un movimiento (RF13).
// CLIENTE: el producto vuelve a la bodega. PROVEEDOR: el producto sale de la bodega.
const TIPO_MOVIMIENTO = { CLIENTE: "DEVOLUCION_CLIENTE", PROVEEDOR: "DEVOLUCION_PROVEEDOR" };

// Convierte el movimiento al formato Devolucion del contrato
function formato(m) {
  return {
    id: m.id,
    tipo: m.tipo === "DEVOLUCION_CLIENTE" ? "CLIENTE" : "PROVEEDOR",
    productoId: m.productoId,
    bodegaId: m.bodegaDestinoId || m.bodegaOrigenId,
    cantidad: m.cantidad,
    motivo: m.motivo,
    referencia: m.referencia?.id || null,
    usuarioId: m.usuarioId,
    fecha: m.fecha,
  };
}

// GET /devoluciones?tipo=CLIENTE|PROVEEDOR
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const tipo = TIPO_MOVIMIENTO[req.query.tipo];
  const tipos = tipo ? undefined : Object.values(TIPO_MOVIMIENTO);
  const { total, datos } = await Movimiento.listar({ tipo, tipos, pagina, limite });
  res.json({ pagina, limite, total, datos: datos.map(formato) });
}

// POST /devoluciones
async function registrar(req, res) {
  const { tipo, productoId, bodegaId, cantidad, motivo, referencia } = req.body;
  if (!TIPO_MOVIMIENTO[tipo]) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "tipo debe ser CLIENTE o PROVEEDOR" });
  if (!bodegaId || !motivo) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "bodegaId y motivo son obligatorios" });
  if (!Number.isInteger(cantidad) || cantidad < 1) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "cantidad debe ser un entero mayor a cero" });

  const datos = {
    tipo: TIPO_MOVIMIENTO[tipo],
    productoId,
    cantidad,
    motivo,
    bodegaOrigenId: tipo === "PROVEEDOR" ? bodegaId : null,
    bodegaDestinoId: tipo === "CLIENTE" ? bodegaId : null,
    // La referencia de una devolución es texto libre (factura, remisión...): se guarda sin tipo
    referencia: referencia ? { tipo: null, id: referencia } : null,
  };
  const usuarioId = Number(req.headers["x-usuario-id"]) || null;
  const { movimiento } = await servicio.registrar(datos, usuarioId);
  res.status(201).json(formato(movimiento));
}

module.exports = { listar, registrar };
