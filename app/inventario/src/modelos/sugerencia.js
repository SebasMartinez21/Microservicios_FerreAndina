const db = require("../config/db");

// Consultas SQL de la tabla sugerencias (RF16)

function formato(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo,
    productoId: fila.producto_id,
    bodegaDestinoId: fila.bodega_destino_id,
    bodegaOrigenId: fila.bodega_origen_id,
    cantidad: fila.cantidad,
    estado: fila.estado,
    movimientoId: fila.movimiento_id,
    creadaEn: fila.creada_en,
    usuarioId: fila.usuario_id,
    atendidaEn: fila.atendida_en,
  };
}

async function listar({ estado, pagina, limite }) {
  const where = estado ? " WHERE estado = ?" : "";
  const params = estado ? [estado] : [];
  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM sugerencias" + where, params);
  const [filas] = await db.query(
    "SELECT * FROM sugerencias" + where + " ORDER BY creada_en DESC, id DESC LIMIT ? OFFSET ?",
    [...params, limite, (pagina - 1) * limite]
  );
  return { total, datos: filas.map(formato) };
}

async function buscar(id) {
  const [filas] = await db.query("SELECT * FROM sugerencias WHERE id = ?", [id]);
  return filas.length ? formato(filas[0]) : null;
}

// Las de TRASLADO nacen PENDIENTE; las de COMPRA nacen DERIVADA porque se entregan a Compras
async function crear({ tipo, productoId, bodegaDestinoId, bodegaOrigenId, cantidad }) {
  const estado = tipo === "TRASLADO" ? "PENDIENTE" : "DERIVADA";
  const [resultado] = await db.query(
    `INSERT INTO sugerencias (tipo, producto_id, bodega_destino_id, bodega_origen_id, cantidad, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tipo, productoId, bodegaDestinoId, bodegaOrigenId || null, cantidad, estado]
  );
  return buscar(resultado.insertId);
}

// Marca la sugerencia como atendida. Solo cambia si sigue PENDIENTE,
// así dos administradores no pueden aceptarla dos veces.
async function atender(id, estado, usuarioId, movimientoId = null) {
  const [resultado] = await db.query(
    `UPDATE sugerencias SET estado = ?, usuario_id = ?, movimiento_id = ?, atendida_en = NOW()
     WHERE id = ? AND estado = 'PENDIENTE'`,
    [estado, usuarioId || null, movimientoId, id]
  );
  return resultado.affectedRows > 0;
}

module.exports = { listar, buscar, crear, atender };
