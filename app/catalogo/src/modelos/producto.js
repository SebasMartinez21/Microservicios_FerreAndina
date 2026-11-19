const db = require("../config/db");

// Consultas SQL de las tablas productos y producto_proveedor

const SELECT = `
  SELECT productos.*, categorias.nombre AS categoria_nombre
  FROM productos JOIN categorias ON categorias.id = productos.categoria_id`;

function formato(fila) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    categoria: { id: fila.categoria_id, nombre: fila.categoria_nombre },
    unidadMedida: fila.unidad_medida,
    precio: Number(fila.precio),
    costoReferencia: Number(fila.costo_referencia),
    activo: !!fila.activo,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

// filtros: { q, codigo, categoriaId, incluirSubcategorias, proveedorId, activo, pagina, limite }
async function listar(filtros) {
  let where = " WHERE productos.activo = ?";
  const params = [filtros.activo];

  if (filtros.q) {
    where += " AND (productos.nombre LIKE ? OR productos.codigo LIKE ?)";
    params.push(`%${filtros.q}%`, `%${filtros.q}%`);
  }
  if (filtros.codigo) {
    where += " AND productos.codigo = ?";
    params.push(filtros.codigo);
  }
  if (filtros.categoriaId) {
    if (filtros.incluirSubcategorias) {
      where += " AND (productos.categoria_id = ? OR categorias.padre_id = ?)";
      params.push(filtros.categoriaId, filtros.categoriaId);
    } else {
      where += " AND productos.categoria_id = ?";
      params.push(filtros.categoriaId);
    }
  }
  if (filtros.proveedorId) {
    where += " AND productos.id IN (SELECT producto_id FROM producto_proveedor WHERE proveedor_id = ?)";
    params.push(filtros.proveedorId);
  }

  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM productos JOIN categorias ON categorias.id = productos.categoria_id" + where, params
  );
  const [filas] = await db.query(
    SELECT + where + " ORDER BY productos.nombre LIMIT ? OFFSET ?",
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite]
  );
  return { total, datos: filas.map(formato) };
}

async function buscar(id) {
  const [filas] = await db.query(SELECT + " WHERE productos.id = ?", [id]);
  if (filas.length === 0) return null;
  const producto = formato(filas[0]);
  producto.proveedores = await listarProveedores(id);
  return producto;
}

async function crear(datos) {
  const [resultado] = await db.query(
    `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, unidad_medida, precio, costo_referencia)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [datos.codigo, datos.nombre, datos.descripcion || null, datos.categoriaId, datos.unidadMedida, datos.precio, datos.costoReferencia]
  );
  for (const prov of datos.proveedores || []) {
    await asociarProveedor(resultado.insertId, prov.proveedorId, !!prov.esPrincipal);
  }
  return buscar(resultado.insertId);
}

async function actualizar(id, datos) {
  const [resultado] = await db.query(
    `UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, unidad_medida = ?,
     precio = ?, costo_referencia = ?, activo = ? WHERE id = ?`,
    [datos.nombre, datos.descripcion || null, datos.categoriaId, datos.unidadMedida, datos.precio, datos.costoReferencia, datos.activo !== false, id]
  );
  return resultado.affectedRows ? buscar(id) : null;
}

async function darDeBaja(id) {
  const [resultado] = await db.query("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
  return resultado.affectedRows ? buscar(id) : null;
}

// ----- proveedores del producto -----

async function listarProveedores(productoId) {
  const [filas] = await db.query(
    "SELECT proveedor_id, es_principal FROM producto_proveedor WHERE producto_id = ?", [productoId]
  );
  return filas.map((fila) => ({ proveedorId: fila.proveedor_id, esPrincipal: !!fila.es_principal }));
}

// Si este queda como principal, los demás dejan de serlo
async function asociarProveedor(productoId, proveedorId, esPrincipal) {
  if (esPrincipal) {
    await db.query("UPDATE producto_proveedor SET es_principal = 0 WHERE producto_id = ?", [productoId]);
  }
  await db.query(
    "INSERT INTO producto_proveedor (producto_id, proveedor_id, es_principal) VALUES (?, ?, ?)",
    [productoId, proveedorId, esPrincipal]
  );
}

async function marcarPrincipal(productoId, proveedorId, esPrincipal) {
  if (esPrincipal) {
    await db.query("UPDATE producto_proveedor SET es_principal = 0 WHERE producto_id = ?", [productoId]);
  }
  const [resultado] = await db.query(
    "UPDATE producto_proveedor SET es_principal = ? WHERE producto_id = ? AND proveedor_id = ?",
    [esPrincipal, productoId, proveedorId]
  );
  return resultado.affectedRows > 0;
}

async function quitarProveedor(productoId, proveedorId) {
  const [resultado] = await db.query(
    "DELETE FROM producto_proveedor WHERE producto_id = ? AND proveedor_id = ?", [productoId, proveedorId]
  );
  return resultado.affectedRows > 0;
}

module.exports = {
  listar, buscar, crear, actualizar, darDeBaja,
  listarProveedores, asociarProveedor, marcarPrincipal, quitarProveedor,
};
