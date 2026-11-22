const OrdenCompra = require("../modelos/ordenCompra");
const Proveedor = require("../modelos/proveedor");
const catalogo = require("../servicios/catalogo");
const inventario = require("../servicios/inventario");
const { paginacion } = require("../paginacion");
const { ErrorHttp } = require("../errores");

const noExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La orden de compra no existe" });
const invalido = (res, mensaje) => res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje });
const conflicto = (res, codigo, mensaje) => res.status(409).json({ codigo, mensaje });

// Valida proveedor, bodega y líneas contra Catálogo, y resuelve nombre y costoUnitario de cada línea
async function prepararOrdenInput(body) {
  const { proveedorId, bodegaId, fechaEsperada, lineas } = body;
  if (!Number.isInteger(proveedorId) || !Number.isInteger(bodegaId)) {
    throw new ErrorHttp(400, "DATOS_INVALIDOS", "proveedorId y bodegaId son obligatorios y deben ser enteros");
  }
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new ErrorHttp(400, "DATOS_INVALIDOS", "La orden debe tener al menos una línea");
  }

  const proveedor = await Proveedor.buscar(proveedorId);
  if (!proveedor || !proveedor.activo) {
    throw new ErrorHttp(400, "DATOS_INVALIDOS", "El proveedor no existe o está inactivo");
  }

  const lineasPreparadas = [];
  for (const item of lineas) {
    if (!Number.isInteger(item.productoId) || !Number.isInteger(item.cantidad) || item.cantidad < 1) {
      throw new ErrorHttp(400, "DATOS_INVALIDOS", "Cada línea requiere productoId entero y cantidad mayor o igual a 1");
    }
    if (item.costoUnitario !== undefined && (typeof item.costoUnitario !== "number" || item.costoUnitario < 0)) {
      throw new ErrorHttp(400, "DATOS_INVALIDOS", "costoUnitario no puede ser negativo");
    }

    const producto = await catalogo.buscarProductoActivo(item.productoId);
    lineasPreparadas.push({
      productoId: producto.id,
      productoNombre: producto.nombre,
      cantidad: item.cantidad,
      costoUnitario: item.costoUnitario !== undefined ? item.costoUnitario : Number(producto.costoReferencia),
    });
  }

  return { proveedorId, bodegaId, fechaEsperada: fechaEsperada || null, lineas: lineasPreparadas };
}

// GET /ordenes-compra?estado=&origen=&proveedorId=&bodegaId=&desde=&hasta=
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const { estado, origen, proveedorId, bodegaId, desde, hasta } = req.query;
  const { total, datos } = await OrdenCompra.listar({
    estado,
    origen,
    proveedorId,
    bodegaId,
    desde,
    hasta,
    pagina,
    limite,
  });
  res.json({ pagina, limite, total, datos });
}

async function consultar(req, res) {
  const orden = await OrdenCompra.buscar(req.params.id);
  if (!orden) return noExiste(res);
  res.json(orden);
}

// POST /ordenes-compra (RF06)
async function crear(req, res) {
  const datos = await prepararOrdenInput(req.body);
  const usuarioId = Number(req.headers["x-usuario-id"]) || null;
  const orden = await OrdenCompra.crear({ ...datos, usuarioId, origen: "MANUAL" });
  res.status(201).json(orden);
}

// PUT /ordenes-compra/:id (solo en estado BORRADOR)
async function actualizar(req, res) {
  const actual = await OrdenCompra.buscar(req.params.id);
  if (!actual) return noExiste(res);
  if (actual.estado !== "BORRADOR") {
    return conflicto(res, "ORDEN_NO_EDITABLE", "Solo se puede editar una orden en estado BORRADOR");
  }

  const datos = await prepararOrdenInput(req.body);
  const orden = await OrdenCompra.actualizar(actual.id, datos);
  res.json(orden);
}

// POST /ordenes-compra/:id/enviar (RF06, RF16)
async function enviar(req, res) {
  const orden = await OrdenCompra.buscar(req.params.id);
  if (!orden) return noExiste(res);
  if (orden.estado !== "BORRADOR") {
    return conflicto(res, "ESTADO_INVALIDO", "Solo se puede enviar una orden que esté en BORRADOR");
  }

  res.json(await OrdenCompra.cambiarEstado(orden.id, "ENVIADA"));
}

// POST /ordenes-compra/:id/cancelar (RF06)
async function cancelar(req, res) {
  const orden = await OrdenCompra.buscar(req.params.id);
  if (!orden) return noExiste(res);
  if (!["BORRADOR", "ENVIADA"].includes(orden.estado) || (await OrdenCompra.tieneRecepciones(orden.id))) {
    return conflicto(res, "NO_CANCELABLE", "La orden ya tiene recepciones o no está en BORRADOR o ENVIADA");
  }

  res.json(await OrdenCompra.cambiarEstado(orden.id, "CANCELADA"));
}

// GET /ordenes-compra/:id/recepciones (RF06)
async function listarRecepciones(req, res) {
  const orden = await OrdenCompra.buscar(req.params.id);
  if (!orden) return noExiste(res);
  res.json(await OrdenCompra.listarRecepciones(orden.id));
}

// POST /ordenes-compra/:id/recepciones (RF06)
async function recibirMercancia(req, res) {
  const orden = await OrdenCompra.buscar(req.params.id);
  if (!orden) return noExiste(res);

  if (!["ENVIADA", "RECIBIDA_PARCIAL"].includes(orden.estado)) {
    return conflicto(res, "ORDEN_NO_RECIBIBLE", "Solo se puede recibir mercancía de una orden ENVIADA o RECIBIDA_PARCIAL");
  }

  const { observaciones, lineas } = req.body;
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return invalido(res, "Debe enviar al menos una línea para recibir");
  }

  // Validar que todas las líneas pertenezcan a la orden y no superen la cantidad pendiente
  const mapaLineas = new Map(orden.lineas.map((l) => [l.id, l]));
  const vistos = new Set();

  for (const item of lineas) {
    if (!Number.isInteger(item.detalleOrdenId) || !Number.isInteger(item.cantidad) || item.cantidad < 1) {
      return invalido(res, "Cada línea requiere detalleOrdenId entero y cantidad mayor o igual a 1");
    }
    if (vistos.has(item.detalleOrdenId)) {
      return invalido(res, `La línea ${item.detalleOrdenId} está repetida en la misma recepción`);
    }
    vistos.add(item.detalleOrdenId);

    const lineaOrden = mapaLineas.get(item.detalleOrdenId);
    if (!lineaOrden) {
      return invalido(res, `La línea ${item.detalleOrdenId} no pertenece a la orden ${orden.id}`);
    }

    const pendiente = lineaOrden.cantidad - lineaOrden.cantidadRecibida;
    if (item.cantidad > pendiente) {
      return conflicto(
        res,
        "CANTIDAD_EXCEDE_PENDIENTE",
        `La cantidad recibida (${item.cantidad}) supera la pendiente (${pendiente}) de la línea ${item.detalleOrdenId}`
      );
    }
  }

  // Registrar cada entrada en Inventario con Idempotency-Key determinista
  const usuarioId = Number(req.headers["x-usuario-id"]) || null;
  const lineasRecibidas = [];

  for (const item of lineas) {
    const lineaOrden = mapaLineas.get(item.detalleOrdenId);
    const claveIdempotencia = `recepcion-orden-${orden.id}-linea-${lineaOrden.id}-prev-${lineaOrden.cantidadRecibida}-cant-${item.cantidad}`;

    const movimiento = await inventario.registrarEntrada({
      productoId: lineaOrden.productoId,
      bodegaId: orden.bodegaId,
      cantidad: item.cantidad,
      ordenId: orden.id,
      numeroOrden: orden.numero,
      usuarioId,
      claveIdempotencia,
    });

    lineasRecibidas.push({
      detalleOrdenId: lineaOrden.id,
      cantidad: item.cantidad,
      movimientoId: movimiento.id,
    });
  }

  const recepcion = await OrdenCompra.guardarRecepcion(orden.id, {
    usuarioId,
    observaciones,
    lineasRecibidas,
  });

  res.status(201).json(recepcion);
}

module.exports = {
  listar,
  consultar,
  crear,
  actualizar,
  enviar,
  cancelar,
  listarRecepciones,
  recibirMercancia,
};
