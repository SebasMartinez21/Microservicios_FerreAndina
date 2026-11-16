const express = require("express");
const db = require("../db");
const rabbit = require("../rabbit");
const { soloAdmin } = require("../middleware");

const router = express.Router();

const SELECT_PRODUCTO = `
  SELECT p.*, c.nombre AS categoria_nombre
  FROM productos p JOIN categorias c ON c.id = p.categoria_id`;

async function buscarProducto(id) {
  const [filas] = await db.query(SELECT_PRODUCTO + " WHERE p.id = ?", [id]);
  if (filas.length === 0) return null;
  const p = filas[0];
  const [proveedores] = await db.query(
    "SELECT proveedor_id, es_principal FROM producto_proveedor WHERE producto_id = ?", [id]
  );
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
    proveedores: proveedores.map((x) => ({ proveedorId: x.proveedor_id, esPrincipal: !!x.es_principal })),
    creadoEn: p.creado_en,
    actualizadoEn: p.actualizado_en,
  };
}

// Avisa a Reportes que el producto cambió
function avisarCambio(p) {
  rabbit.publicar("catalogo.producto.actualizado", {
    productoId: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    costoReferencia: p.costoReferencia,
    activo: p.activo,
  });
}

function validar(body) {
  const { nombre, categoriaId, unidadMedida, precio, costoReferencia } = body;
  if (!nombre || !categoriaId || !unidadMedida || precio == null || costoReferencia == null) {
    return "Faltan datos: nombre, categoriaId, unidadMedida, precio y costoReferencia son obligatorios";
  }
  if (!["UND", "KG", "M", "LT", "GAL", "CAJA"].includes(unidadMedida)) return "Unidad de medida inválida";
  if (precio < 0 || costoReferencia < 0) return "El precio y el costo no pueden ser negativos";
  return null;
}

// GET /productos?q=&codigo=&categoriaId=&proveedorId=&activo=&pagina=&limite=
router.get("/", async (req, res) => {
  const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
  const limite = Math.min(Math.max(parseInt(req.query.limite) || 20, 1), 100);

  let where = " WHERE p.activo = ?";
  const params = [req.query.activo !== "false"];

  if (req.query.q) {
    where += " AND (p.nombre LIKE ? OR p.codigo LIKE ?)";
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  if (req.query.codigo) {
    where += " AND p.codigo = ?";
    params.push(req.query.codigo);
  }
  if (req.query.categoriaId) {
    // Incluye también las subcategorías de esa categoría
    if (req.query.incluirSubcategorias === "false") {
      where += " AND p.categoria_id = ?";
      params.push(req.query.categoriaId);
    } else {
      where += " AND (p.categoria_id = ? OR c.padre_id = ?)";
      params.push(req.query.categoriaId, req.query.categoriaId);
    }
  }
  if (req.query.proveedorId) {
    where += " AND p.id IN (SELECT producto_id FROM producto_proveedor WHERE proveedor_id = ?)";
    params.push(req.query.proveedorId);
  }

  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM productos p JOIN categorias c ON c.id = p.categoria_id" + where, params
  );
  const [filas] = await db.query(
    SELECT_PRODUCTO + where + " ORDER BY p.nombre LIMIT ? OFFSET ?",
    [...params, limite, (pagina - 1) * limite]
  );

  const datos = filas.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    categoria: { id: p.categoria_id, nombre: p.categoria_nombre },
    unidadMedida: p.unidad_medida,
    precio: Number(p.precio),
    costoReferencia: Number(p.costo_referencia),
    activo: !!p.activo,
  }));
  res.json({ pagina, limite, total, datos });
});

router.get("/:id", async (req, res) => {
  const producto = await buscarProducto(req.params.id);
  if (!producto) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El producto no existe" });
  res.json(producto);
});

router.post("/", soloAdmin, async (req, res) => {
  const error = validar(req.body);
  if (error || !req.body.codigo) {
    return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: error || "El código es obligatorio" });
  }

  const { codigo, nombre, descripcion, categoriaId, unidadMedida, precio, costoReferencia } = req.body;
  const proveedores = req.body.proveedores || [];

  try {
    const [resultado] = await db.query(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, unidad_medida, precio, costo_referencia)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, descripcion || null, categoriaId, unidadMedida, precio, costoReferencia]
    );
    for (const prov of proveedores) {
      await db.query(
        "INSERT INTO producto_proveedor (producto_id, proveedor_id, es_principal) VALUES (?, ?, ?)",
        [resultado.insertId, prov.proveedorId, !!prov.esPrincipal]
      );
    }

    const producto = await buscarProducto(resultado.insertId);
    avisarCambio(producto);
    res.status(201).json(producto);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ codigo: "CODIGO_DUPLICADO", mensaje: "Ya existe un producto con ese código" });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "La categoría no existe" });
    }
    throw error;
  }
});

router.put("/:id", soloAdmin, async (req, res) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: error });

  const { nombre, descripcion, categoriaId, unidadMedida, precio, costoReferencia, activo } = req.body;
  try {
    const [resultado] = await db.query(
      `UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, unidad_medida = ?,
       precio = ?, costo_referencia = ?, activo = ? WHERE id = ?`,
      [nombre, descripcion || null, categoriaId, unidadMedida, precio, costoReferencia, activo !== false, req.params.id]
    );
    if (resultado.affectedRows === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El producto no existe" });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "La categoría no existe" });
    }
    throw error;
  }

  const producto = await buscarProducto(req.params.id);
  avisarCambio(producto);
  res.json(producto);
});

// Baja lógica
router.delete("/:id", soloAdmin, async (req, res) => {
  const [resultado] = await db.query("UPDATE productos SET activo = 0 WHERE id = ?", [req.params.id]);
  if (resultado.affectedRows === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El producto no existe" });

  avisarCambio(await buscarProducto(req.params.id));
  res.status(204).send();
});

// ----- Proveedores de un producto (Compras los consulta al crear una orden) -----

router.get("/:id/proveedores", async (req, res) => {
  const producto = await buscarProducto(req.params.id);
  if (!producto) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El producto no existe" });
  res.json(producto.proveedores);
});

router.post("/:id/proveedores", soloAdmin, async (req, res) => {
  const { proveedorId } = req.body;
  if (!proveedorId) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "proveedorId es obligatorio" });

  const producto = await buscarProducto(req.params.id);
  if (!producto) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El producto no existe" });

  // Si es el primer proveedor del producto, queda como principal
  const esPrincipal = producto.proveedores.length === 0 || !!req.body.esPrincipal;
  if (esPrincipal) {
    await db.query("UPDATE producto_proveedor SET es_principal = 0 WHERE producto_id = ?", [req.params.id]);
  }

  try {
    await db.query(
      "INSERT INTO producto_proveedor (producto_id, proveedor_id, es_principal) VALUES (?, ?, ?)",
      [req.params.id, proveedorId, esPrincipal]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ codigo: "YA_ASOCIADO", mensaje: "El proveedor ya está asociado a este producto" });
    }
    throw error;
  }
  res.status(201).json({ proveedorId, esPrincipal });
});

router.put("/:id/proveedores/:proveedorId", soloAdmin, async (req, res) => {
  const esPrincipal = !!req.body.esPrincipal;
  if (esPrincipal) {
    await db.query("UPDATE producto_proveedor SET es_principal = 0 WHERE producto_id = ?", [req.params.id]);
  }
  const [resultado] = await db.query(
    "UPDATE producto_proveedor SET es_principal = ? WHERE producto_id = ? AND proveedor_id = ?",
    [esPrincipal, req.params.id, req.params.proveedorId]
  );
  if (resultado.affectedRows === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La asociación no existe" });
  res.json({ proveedorId: Number(req.params.proveedorId), esPrincipal });
});

router.delete("/:id/proveedores/:proveedorId", soloAdmin, async (req, res) => {
  const [resultado] = await db.query(
    "DELETE FROM producto_proveedor WHERE producto_id = ? AND proveedor_id = ?",
    [req.params.id, req.params.proveedorId]
  );
  if (resultado.affectedRows === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La asociación no existe" });
  res.status(204).send();
});

module.exports = router;
