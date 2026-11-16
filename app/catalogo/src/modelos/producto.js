const db = require("../config/db");

// Consultas SQL de las tablas productos y producto_proveedor

const SELECT = `
  SELECT p.*, c.nombre AS categoria_nombre
  FROM productos p JOIN categorias c ON c.id = p.categoria_id`;

function formato(p) {
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    categoria: { id: p.categoria_id, nombre: p.categoria_nombre },
    unidadMedida: p.unidad_medida,
    precio: Number(p.precio),
    costoReferencia: Number(p.costo_referencia),
    activo: !!p.activo,
    creadoEn: p.creado_en,
    actualizadoEn: p.actualizado_en,
  };
}

// filtros: { q, codigo, categoriaId, incluirSubcategorias, proveedorId, activo, pagina, limite }
async function listar(f) {
  let where = " WHERE p.activo = ?";
  const params = [f.activo];

  if (f.q) {
    where += " AND (p.nombre LIKE ? OR p.codigo LIKE ?)";
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.codigo) {
    where += " AND p.codigo = ?";
    params.push(f.codigo);
  }
  if (f.categoriaId) {
    if (f.incluirSubcategorias) {
      where += " AND (p.categoria_id = ? OR c.padre_id = ?)";
      params.push(f.categoriaId, f.categoriaId);
    } else {
      where += " AND p.categoria_id = ?";
      params.push(f.categoriaId);
    }
  }
  if (f.proveedorId) {
    where += " AND p.id IN (SELECT producto_id FROM producto_proveedor WHERE proveedor_id = ?)";
    params.push(f.proveedorId);
  }

  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM productos p JOIN categorias c ON c.id = p.categoria_id" + where, params
  );
  const [filas] = await db.query(
    SELECT + where + " ORDER BY p.nombre LIMIT ? OFFSET ?",
    [...params, f.limite, (f.pagina - 1) * f.limite]
  );
  return { total, datos: filas.map(formato) };
}

async function buscar(id) {
  const [filas] = await db.query(SELECT + " WHERE p.id = ?", [id]);
  if (filas.length === 0) return null;
  const producto = formato(filas[0]);
  producto.proveedores = await listarProveedores(id);
  return producto;
}

async function crear(d) {
  const [r] = await db.query(
    `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, unidad_medida, precio, costo_referencia)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [d.codigo, d.nombre, d.descripcion || null, d.categoriaId, d.unidadMedida, d.precio, d.costoReferencia]
  );
  for (const prov of d.proveedores || []) {
    await asociarProveedor(r.insertId, prov.proveedorId, !!prov.esPrincipal);
  }
  return buscar(r.insertId);
}

async function actualizar(id, d) {
  const [r] = await db.query(
    `UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, unidad_medida = ?,
     precio = ?, costo_referencia = ?, activo = ? WHERE id = ?`,
    [d.nombre, d.descripcion || null, d.categoriaId, d.unidadMedida, d.precio, d.costoReferencia, d.activo !== false, id]
  );
  return r.affectedRows ? buscar(id) : null;
}

async function darDeBaja(id) {
  const [r] = await db.query("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
  return r.affectedRows ? buscar(id) : null;
}

// ----- proveedores del producto -----

async function listarProveedores(productoId) {
  const [filas] = await db.query(
    "SELECT proveedor_id, es_principal FROM producto_proveedor WHERE producto_id = ?", [productoId]
  );
  return filas.map((x) => ({ proveedorId: x.proveedor_id, esPrincipal: !!x.es_principal }));
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
  const [r] = await db.query(
    "UPDATE producto_proveedor SET es_principal = ? WHERE producto_id = ? AND proveedor_id = ?",
    [esPrincipal, productoId, proveedorId]
  );
  return r.affectedRows > 0;
}

async function quitarProveedor(productoId, proveedorId) {
  const [r] = await db.query(
    "DELETE FROM producto_proveedor WHERE producto_id = ? AND proveedor_id = ?", [productoId, proveedorId]
  );
  return r.affectedRows > 0;
}

module.exports = {
  listar, buscar, crear, actualizar, darDeBaja,
  listarProveedores, asociarProveedor, marcarPrincipal, quitarProveedor,
};
