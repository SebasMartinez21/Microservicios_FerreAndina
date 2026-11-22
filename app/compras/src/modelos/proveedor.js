const db = require("../config/db");

// Consultas SQL de la tabla proveedores (RF03)

function formato(fila) {
  return {
    id: fila.id,
    nit: fila.nit,
    nombre: fila.nombre,
    contacto: fila.contacto,
    email: fila.correo,
    telefono: fila.telefono,
    activo: !!fila.activo,
  };
}

// filtros: { q, activo, pagina, limite }
async function listar(filtros) {
  let where = " WHERE activo = ?";
  const params = [filtros.activo];

  if (filtros.q) {
    where += " AND (nombre LIKE ? OR nit LIKE ?)";
    params.push(`%${filtros.q}%`, `%${filtros.q}%`);
  }

  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM proveedores" + where, params);
  const [filas] = await db.query(
    "SELECT * FROM proveedores" + where + " ORDER BY nombre LIMIT ? OFFSET ?",
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite]
  );
  return { total, datos: filas.map(formato) };
}

async function buscar(id) {
  const [filas] = await db.query("SELECT * FROM proveedores WHERE id = ?", [id]);
  return filas.length ? formato(filas[0]) : null;
}

async function crear(datos) {
  const [resultado] = await db.query(
    `INSERT INTO proveedores (nit, nombre, contacto, correo, telefono, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.nit, datos.nombre, datos.contacto || null, datos.email || null, datos.telefono || null, datos.activo !== false]
  );
  return buscar(resultado.insertId);
}

async function actualizar(id, datos) {
  const [resultado] = await db.query(
    `UPDATE proveedores SET nit = ?, nombre = ?, contacto = ?, correo = ?, telefono = ?, activo = ?
     WHERE id = ?`,
    [datos.nit, datos.nombre, datos.contacto || null, datos.email || null, datos.telefono || null, datos.activo !== false, id]
  );
  return resultado.affectedRows ? buscar(id) : null;
}

// No se permite dar de baja si tiene órdenes abiertas (BORRADOR, ENVIADA o RECIBIDA_PARCIAL)
async function tieneOrdenesAbiertas(id) {
  const [filas] = await db.query(
    `SELECT id FROM ordenes_compra
     WHERE proveedor_id = ? AND estado IN ('BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL')
     LIMIT 1`,
    [id]
  );
  return filas.length > 0;
}

async function darDeBaja(id) {
  const [resultado] = await db.query("UPDATE proveedores SET activo = 0 WHERE id = ?", [id]);
  return resultado.affectedRows > 0;
}

module.exports = { listar, buscar, crear, actualizar, tieneOrdenesAbiertas, darDeBaja };
