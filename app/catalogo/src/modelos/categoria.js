const db = require("../config/db");

// Consultas SQL de la tabla categorias

function formato(fila) {
  return { id: fila.id, nombre: fila.nombre, descripcion: fila.descripcion, padreId: fila.padre_id, activa: !!fila.activa };
}

async function listar(activa) {
  const [filas] = await db.query("SELECT * FROM categorias WHERE activa = ? ORDER BY nombre", [activa]);
  return filas.map(formato);
}

async function buscar(id) {
  const [filas] = await db.query("SELECT * FROM categorias WHERE id = ?", [id]);
  return filas.length ? formato(filas[0]) : null;
}

async function crear({ nombre, descripcion, padreId }) {
  const [resultado] = await db.query(
    "INSERT INTO categorias (nombre, descripcion, padre_id) VALUES (?, ?, ?)",
    [nombre, descripcion || null, padreId || null]
  );
  return buscar(resultado.insertId);
}

async function actualizar(id, { nombre, descripcion, padreId, activa }) {
  const [resultado] = await db.query(
    "UPDATE categorias SET nombre = ?, descripcion = ?, padre_id = ?, activa = ? WHERE id = ?",
    [nombre, descripcion || null, padreId || null, activa !== false, id]
  );
  return resultado.affectedRows ? buscar(id) : null;
}

// Una categoría no se puede dar de baja si todavía tiene productos o subcategorías activas
async function tieneDependientes(id) {
  const [productos] = await db.query("SELECT id FROM productos WHERE categoria_id = ? AND activo = 1 LIMIT 1", [id]);
  const [hijas] = await db.query("SELECT id FROM categorias WHERE padre_id = ? AND activa = 1 LIMIT 1", [id]);
  return productos.length > 0 || hijas.length > 0;
}

async function darDeBaja(id) {
  const [resultado] = await db.query("UPDATE categorias SET activa = 0 WHERE id = ?", [id]);
  return resultado.affectedRows > 0;
}

module.exports = { listar, buscar, crear, actualizar, tieneDependientes, darDeBaja };
