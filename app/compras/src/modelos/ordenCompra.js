const db = require("../config/db");

// Consultas SQL de las tablas ordenes_compra, detalle_orden_compra, recepciones y detalle_recepcion (RF06, RF16)

const SELECT_ORDEN = `
  SELECT ordenes_compra.*, proveedores.nombre AS proveedor_nombre
  FROM ordenes_compra
  JOIN proveedores ON proveedores.id = ordenes_compra.proveedor_id`;

function formatoResumen(fila) {
  return {
    id: fila.id,
    numero: fila.numero,
    proveedor: { id: fila.proveedor_id, nombre: fila.proveedor_nombre },
    bodegaId: fila.bodega_id,
    usuarioId: fila.usuario_id,
    estado: fila.estado,
    origen: fila.origen,
    sugerenciaId: fila.sugerencia_id,
    creadaEn: fila.creado_en,
    fechaEsperada: fila.fecha_esperada
      ? (fila.fecha_esperada instanceof Date ? fila.fecha_esperada.toISOString().slice(0, 10) : String(fila.fecha_esperada).slice(0, 10))
      : null,
    total: Number(fila.total),
  };
}

function formatoLinea(fila) {
  return {
    id: fila.id,
    productoId: fila.producto_id,
    productoNombre: fila.producto_nombre,
    cantidad: fila.cantidad,
    cantidadRecibida: fila.cantidad_recibida,
    costoUnitario: Number(fila.costo_unitario),
  };
}

// filtros: { estado, origen, proveedorId, bodegaId, desde, hasta, pagina, limite }
async function listar(filtros) {
  const condiciones = [];
  const params = [];

  if (filtros.estado) { condiciones.push("ordenes_compra.estado = ?"); params.push(filtros.estado); }
  if (filtros.origen) { condiciones.push("ordenes_compra.origen = ?"); params.push(filtros.origen); }
  if (filtros.proveedorId) { condiciones.push("ordenes_compra.proveedor_id = ?"); params.push(filtros.proveedorId); }
  if (filtros.bodegaId) { condiciones.push("ordenes_compra.bodega_id = ?"); params.push(filtros.bodegaId); }
  if (filtros.desde) { condiciones.push("ordenes_compra.creado_en >= ?"); params.push(filtros.desde); }
  if (filtros.hasta) { condiciones.push("ordenes_compra.creado_en < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(filtros.hasta); }

  const where = condiciones.length ? " WHERE " + condiciones.join(" AND ") : "";

  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM ordenes_compra" + where,
    params
  );
  const [filas] = await db.query(
    SELECT_ORDEN + where + " ORDER BY ordenes_compra.creado_en DESC, ordenes_compra.id DESC LIMIT ? OFFSET ?",
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite]
  );

  return { total, datos: filas.map(formatoResumen) };
}

async function buscar(id, conexion = db) {
  const [filas] = await conexion.query(SELECT_ORDEN + " WHERE ordenes_compra.id = ?", [id]);
  if (filas.length === 0) return null;

  const orden = formatoResumen(filas[0]);
  const [lineas] = await conexion.query(
    "SELECT * FROM detalle_orden_compra WHERE orden_id = ? ORDER BY id",
    [id]
  );
  orden.lineas = lineas.map(formatoLinea);
  return orden;
}

// Crea la orden y sus líneas en una sola transacción; asigna el número OC-000123 a partir de su id
async function crear({ proveedorId, bodegaId, usuarioId, origen = "MANUAL", sugerenciaId = null, fechaEsperada = null, lineas }) {
  const total = lineas.reduce((suma, l) => suma + l.cantidad * l.costoUnitario, 0);
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const numeroTemporal = "TMP-" + crypto.randomUUID().slice(0, 12);
    const [resultado] = await conexion.query(
      `INSERT INTO ordenes_compra (numero, proveedor_id, bodega_id, usuario_id, estado, origen, total, fecha_esperada, sugerencia_id)
       VALUES (?, ?, ?, ?, 'BORRADOR', ?, ?, ?, ?)`,
      [numeroTemporal, proveedorId, bodegaId, usuarioId || null, origen, total, fechaEsperada || null, sugerenciaId]
    );

    const ordenId = resultado.insertId;
    const numero = "OC-" + String(ordenId).padStart(6, "0");
    await conexion.query("UPDATE ordenes_compra SET numero = ? WHERE id = ?", [numero, ordenId]);

    for (const linea of lineas) {
      await conexion.query(
        `INSERT INTO detalle_orden_compra (orden_id, producto_id, producto_nombre, cantidad, cantidad_recibida, costo_unitario)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [ordenId, linea.productoId, linea.productoNombre, linea.cantidad, linea.costoUnitario]
      );
    }

    await conexion.commit();
    return buscar(ordenId);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

// Reemplaza proveedor, bodega, fecha esperada y líneas de una orden que sigue en BORRADOR
async function actualizar(id, { proveedorId, bodegaId, fechaEsperada = null, lineas }) {
  const total = lineas.reduce((suma, l) => suma + l.cantidad * l.costoUnitario, 0);
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    await conexion.query(
      `UPDATE ordenes_compra SET proveedor_id = ?, bodega_id = ?, fecha_esperada = ?, total = ?
       WHERE id = ? AND estado = 'BORRADOR'`,
      [proveedorId, bodegaId, fechaEsperada || null, total, id]
    );

    await conexion.query("DELETE FROM detalle_orden_compra WHERE orden_id = ?", [id]);
    for (const linea of lineas) {
      await conexion.query(
        `INSERT INTO detalle_orden_compra (orden_id, producto_id, producto_nombre, cantidad, cantidad_recibida, costo_unitario)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [id, linea.productoId, linea.productoNombre, linea.cantidad, linea.costoUnitario]
      );
    }

    await conexion.commit();
    return buscar(id);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

async function cambiarEstado(id, nuevoEstado) {
  await db.query("UPDATE ordenes_compra SET estado = ? WHERE id = ?", [nuevoEstado, id]);
  return buscar(id);
}

// ----- Recepciones de mercancía (RF06) -----

async function tieneRecepciones(ordenId) {
  const [filas] = await db.query("SELECT id FROM recepciones WHERE orden_id = ? LIMIT 1", [ordenId]);
  return filas.length > 0;
}

async function buscarRecepcion(recepcionId, conexion = db) {
  const [filas] = await conexion.query("SELECT * FROM recepciones WHERE id = ?", [recepcionId]);
  if (filas.length === 0) return null;

  const r = filas[0];
  const [lineas] = await conexion.query(
    `SELECT detalle_recepcion.*, detalle_orden_compra.producto_id
     FROM detalle_recepcion
     JOIN detalle_orden_compra ON detalle_orden_compra.id = detalle_recepcion.detalle_orden_id
     WHERE detalle_recepcion.recepcion_id = ?
     ORDER BY detalle_recepcion.id`,
    [recepcionId]
  );

  return {
    id: r.id,
    ordenId: r.orden_id,
    usuarioId: r.usuario_id,
    recibidaEn: r.recibida_en,
    observaciones: r.observaciones,
    lineas: lineas.map((l) => ({
      detalleOrdenId: l.detalle_orden_id,
      productoId: l.producto_id,
      cantidad: l.cantidad,
      movimientoId: l.movimiento_id,
    })),
  };
}

async function listarRecepciones(ordenId) {
  const [filas] = await db.query("SELECT id FROM recepciones WHERE orden_id = ? ORDER BY id", [ordenId]);
  const resultado = [];
  for (const fila of filas) {
    resultado.push(await buscarRecepcion(fila.id));
  }
  return resultado;
}

// Guarda la recepción, actualiza cantidad_recibida de cada línea y el estado de la orden en una sola transacción
async function guardarRecepcion(ordenId, { usuarioId, observaciones, lineasRecibidas }) {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const [resultado] = await conexion.query(
      "INSERT INTO recepciones (orden_id, usuario_id, observaciones) VALUES (?, ?, ?)",
      [ordenId, usuarioId || null, observaciones || null]
    );
    const recepcionId = resultado.insertId;

    for (const linea of lineasRecibidas) {
      await conexion.query(
        `INSERT INTO detalle_recepcion (recepcion_id, detalle_orden_id, cantidad, movimiento_id)
         VALUES (?, ?, ?, ?)`,
        [recepcionId, linea.detalleOrdenId, linea.cantidad, linea.movimientoId]
      );
      await conexion.query(
        "UPDATE detalle_orden_compra SET cantidad_recibida = cantidad_recibida + ? WHERE id = ?",
        [linea.cantidad, linea.detalleOrdenId]
      );
    }

    // Si todas las líneas ya completaron su cantidad pedida, la orden pasa a RECIBIDA; si no, a RECIBIDA_PARCIAL
    const [pendientes] = await conexion.query(
      "SELECT id FROM detalle_orden_compra WHERE orden_id = ? AND cantidad_recibida < cantidad LIMIT 1",
      [ordenId]
    );
    const nuevoEstado = pendientes.length === 0 ? "RECIBIDA" : "RECIBIDA_PARCIAL";
    await conexion.query("UPDATE ordenes_compra SET estado = ? WHERE id = ?", [nuevoEstado, ordenId]);

    await conexion.commit();
    return buscarRecepcion(recepcionId);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  listar,
  buscar,
  crear,
  actualizar,
  cambiarEstado,
  tieneRecepciones,
  listarRecepciones,
  guardarRecepcion,
};
