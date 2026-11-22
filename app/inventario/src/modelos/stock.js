const db = require("../config/db");
const { ErrorHttp } = require("../errores");

// Consultas SQL de la tabla stock

function formato(fila) {
  return {
    productoId: fila.producto_id,
    bodegaId: fila.bodega_id,
    cantidad: fila.cantidad,
    stockMinimo: fila.stock_minimo,
  };
}

async function listarPorBodega({ bodegaId, bajoMinimo, pagina, limite }) {
  let where = " WHERE bodega_id = ?";
  if (bajoMinimo) where += " AND cantidad < stock_minimo";

  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM stock" + where, [bodegaId]);
  const [filas] = await db.query(
    "SELECT * FROM stock" + where + " ORDER BY producto_id LIMIT ? OFFSET ?",
    [bodegaId, limite, (pagina - 1) * limite]
  );
  return { total, datos: filas.map(formato) };
}

async function listarPorProducto(productoId) {
  const [filas] = await db.query(
    "SELECT stock.* FROM stock JOIN bodegas ON bodegas.id = stock.bodega_id WHERE producto_id = ? AND bodegas.activa = 1 ORDER BY bodega_id",
    [productoId]
  );
  return filas.map(formato);
}

// Crea la fila si no existía y fija el mínimo
async function fijarMinimo(productoId, bodegaId, stockMinimo) {
  await db.query(
    `INSERT INTO stock (producto_id, bodega_id, stock_minimo) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE stock_minimo = VALUES(stock_minimo)`,
    [productoId, bodegaId, stockMinimo]
  );
  const [filas] = await db.query("SELECT * FROM stock WHERE producto_id = ? AND bodega_id = ?", [productoId, bodegaId]);
  return formato(filas[0]);
}

// Suma (o resta, si cambio es negativo) unidades al saldo de una bodega.
// Se llama dentro de la transacción del movimiento.
// Bloqueo optimista: el UPDATE solo funciona si nadie cambió la fila desde que se leyó (misma version).
async function aplicarCambio(conexion, productoId, bodegaId, cambio) {
  await conexion.query("INSERT IGNORE INTO stock (producto_id, bodega_id) VALUES (?, ?)", [productoId, bodegaId]);
  const [[fila]] = await conexion.query(
    "SELECT cantidad, stock_minimo, version FROM stock WHERE producto_id = ? AND bodega_id = ?",
    [productoId, bodegaId]
  );

  const saldo = fila.cantidad + cambio;
  if (saldo < 0) {
    throw new ErrorHttp(409, "STOCK_INSUFICIENTE", `La bodega ${bodegaId} solo tiene ${fila.cantidad} unidades`);
  }

  const [resultado] = await conexion.query(
    "UPDATE stock SET cantidad = ?, version = version + 1 WHERE producto_id = ? AND bodega_id = ? AND version = ?",
    [saldo, productoId, bodegaId, fila.version]
  );
  if (resultado.affectedRows === 0) {
    const error = new Error("Otro movimiento cambió el saldo al mismo tiempo");
    error.conflictoVersion = true;
    throw error;
  }

  return { bodegaId, saldoAnterior: fila.cantidad, saldo, stockMinimo: fila.stock_minimo };
}

// Stock del producto en las demás bodegas activas, para buscar una con excedente (RF16)
async function enOtrasBodegas(productoId, bodegaId) {
  const [filas] = await db.query(
    `SELECT stock.* FROM stock JOIN bodegas ON bodegas.id = stock.bodega_id
     WHERE producto_id = ? AND bodega_id <> ? AND bodegas.activa = 1`,
    [productoId, bodegaId]
  );
  return filas.map(formato);
}

module.exports = { listarPorBodega, listarPorProducto, fijarMinimo, aplicarCambio, enOtrasBodegas };
