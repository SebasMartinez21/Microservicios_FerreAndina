const db = require("../config/db");

// Consultas SQL de la tabla movimientos (que también es el kardex)

function formato(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo,
    productoId: fila.producto_id,
    cantidad: fila.cantidad,
    bodegaOrigenId: fila.bodega_origen_id,
    bodegaDestinoId: fila.bodega_destino_id,
    motivo: fila.motivo,
    referencia: fila.referencia_id ? { tipo: fila.referencia_tipo, id: fila.referencia_id } : null,
    usuarioId: fila.usuario_id,
    fecha: fila.fecha,
    saldoOrigen: fila.saldo_origen,
    saldoDestino: fila.saldo_destino,
  };
}

// Arma el WHERE con los filtros comunes de movimientos y kardex
function filtrar({ productoId, bodegaId, tipo, tipos, desde, hasta }, columnaBodega) {
  const condiciones = [];
  const params = [];
  if (productoId) { condiciones.push("producto_id = ?"); params.push(productoId); }
  if (bodegaId) {
    if (columnaBodega) {
      condiciones.push(`${columnaBodega} = ?`);
      params.push(bodegaId);
    } else {
      condiciones.push("(bodega_origen_id = ? OR bodega_destino_id = ?)");
      params.push(bodegaId, bodegaId);
    }
  }
  if (tipo) { condiciones.push("tipo = ?"); params.push(tipo); }
  if (tipos) { condiciones.push("tipo IN (?)"); params.push(tipos); }
  if (desde) { condiciones.push("fecha >= ?"); params.push(desde); }
  if (hasta) { condiciones.push("fecha < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(hasta); }
  return { where: condiciones.length ? " WHERE " + condiciones.join(" AND ") : "", params };
}

// filtros: { productoId, bodegaId, tipo, tipos, desde, hasta, pagina, limite }
async function listar(filtros) {
  const { where, params } = filtrar(filtros);
  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM movimientos" + where, params);
  const [filas] = await db.query(
    "SELECT * FROM movimientos" + where + " ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?",
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite]
  );
  return { total, datos: filas.map(formato) };
}

async function buscar(id, conexion = db) {
  const [filas] = await conexion.query("SELECT * FROM movimientos WHERE id = ?", [id]);
  return filas.length ? formato(filas[0]) : null;
}

async function buscarPorClave(clave) {
  const [filas] = await db.query("SELECT * FROM movimientos WHERE clave_idempotencia = ?", [clave]);
  return filas.length ? formato(filas[0]) : null;
}

// Se llama dentro de la transacción del movimiento
async function insertar(conexion, datos) {
  const [resultado] = await conexion.query(
    `INSERT INTO movimientos (clave_idempotencia, tipo, producto_id, cantidad, bodega_origen_id, bodega_destino_id,
       saldo_origen, saldo_destino, motivo, referencia_tipo, referencia_id, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.clave || null, datos.tipo, datos.productoId, datos.cantidad,
      datos.bodegaOrigenId || null, datos.bodegaDestinoId || null,
      datos.saldoOrigen ?? null, datos.saldoDestino ?? null, datos.motivo || null,
      datos.referencia?.tipo || null, datos.referencia?.id ?? null, datos.usuarioId || null,
    ]
  );
  return buscar(resultado.insertId, conexion);
}

// El kardex no es una tabla: cada movimiento se parte en una línea por bodega afectada.
// Un traslado da dos líneas: salida en el origen y entrada en el destino.
const LINEAS_KARDEX = `
  SELECT id, fecha, tipo, producto_id, bodega_origen_id AS bodega_id,
         IF(tipo = 'AJUSTE' AND cantidad > 0, cantidad, 0) AS entrada,
         IF(tipo = 'AJUSTE' AND cantidad > 0, 0, ABS(cantidad)) AS salida,
         saldo_origen AS saldo, usuario_id
  FROM movimientos WHERE bodega_origen_id IS NOT NULL
  UNION ALL
  SELECT id, fecha, tipo, producto_id, bodega_destino_id, cantidad, 0, saldo_destino, usuario_id
  FROM movimientos WHERE bodega_destino_id IS NOT NULL`;

// filtros: { productoId, bodegaId, desde, hasta, pagina, limite }
async function kardex(filtros) {
  const { where, params } = filtrar(filtros, "bodega_id");
  const desde = `FROM (${LINEAS_KARDEX}) AS lineas` + where;

  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total " + desde, params);
  const [filas] = await db.query(
    "SELECT * " + desde + " ORDER BY fecha, id, salida DESC LIMIT ? OFFSET ?",
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite]
  );
  const datos = filas.map((fila) => ({
    movimientoId: fila.id,
    fecha: fila.fecha,
    tipo: fila.tipo,
    bodegaId: fila.bodega_id,
    entrada: Number(fila.entrada),
    salida: Number(fila.salida),
    saldo: fila.saldo,
    usuarioId: fila.usuario_id,
  }));
  return { total, datos };
}

module.exports = { formato, listar, buscar, buscarPorClave, insertar, kardex };
