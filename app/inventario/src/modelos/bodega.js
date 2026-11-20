const db = require("../config/db");

// Consultas SQL de la tabla bodegas

function formato(fila) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    direccion: fila.direccion,
    activa: !!fila.activa,
  };
}

async function listar({ activa, pagina, limite }) {
  let where = "";
  const params = [];
  if (activa !== undefined) {
    where = " WHERE activa = ?";
    params.push(activa);
  }
  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM bodegas" + where, params);
  const [filas] = await db.query(
    "SELECT * FROM bodegas" + where + " ORDER BY id LIMIT ? OFFSET ?",
    [...params, limite, (pagina - 1) * limite]
  );
  return { total, datos: filas.map(formato) };
}

async function buscar(id) {
  const [filas] = await db.query("SELECT * FROM bodegas WHERE id = ?", [id]);
  return filas.length ? formato(filas[0]) : null;
}

async function crear(datos) {
  const [resultado] = await db.query(
    "INSERT INTO bodegas (codigo, nombre, ciudad, direccion) VALUES (?, ?, ?, ?)",
    [datos.codigo, datos.nombre, datos.ciudad, datos.direccion || null]
  );
  return buscar(resultado.insertId);
}

// Con activa se puede reactivar una bodega dada de baja
async function actualizar(id, datos) {
  const [resultado] = await db.query(
    "UPDATE bodegas SET codigo = ?, nombre = ?, ciudad = ?, direccion = ?, activa = ? WHERE id = ?",
    [datos.codigo, datos.nombre, datos.ciudad, datos.direccion || null, datos.activa !== false, id]
  );
  return resultado.affectedRows ? buscar(id) : null;
}

async function darDeBaja(id) {
  await db.query("UPDATE bodegas SET activa = 0 WHERE id = ?", [id]);
}

// Total de unidades que hay en la bodega (para no dar de baja una bodega con mercancía)
async function unidadesEnBodega(id) {
  const [[{ total }]] = await db.query("SELECT COALESCE(SUM(cantidad), 0) AS total FROM stock WHERE bodega_id = ?", [id]);
  return Number(total);
}

module.exports = { listar, buscar, crear, actualizar, darDeBaja, unidadesEnBodega };
