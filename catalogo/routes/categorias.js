const express = require("express");
const db = require("../db");
const { soloAdmin } = require("../middleware");

const router = express.Router();

function formato(c) {
  return { id: c.id, nombre: c.nombre, descripcion: c.descripcion, padreId: c.padre_id, activa: !!c.activa };
}

// GET /categorias?arbol=true&activa=true
router.get("/", async (req, res) => {
  const activa = req.query.activa !== "false";
  const [filas] = await db.query("SELECT * FROM categorias WHERE activa = ? ORDER BY nombre", [activa]);
  const categorias = filas.map(formato);

  if (req.query.arbol !== "true") return res.json(categorias);

  // Arma el árbol: cada categoría raíz con sus subcategorías
  const arbol = categorias.filter((c) => c.padreId === null);
  for (const raiz of arbol) {
    raiz.subcategorias = categorias.filter((c) => c.padreId === raiz.id);
  }
  res.json(arbol);
});

router.get("/:id", async (req, res) => {
  const [filas] = await db.query("SELECT * FROM categorias WHERE id = ?", [req.params.id]);
  if (filas.length === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La categoría no existe" });
  res.json(formato(filas[0]));
});

router.post("/", soloAdmin, async (req, res) => {
  const { nombre, descripcion, padreId } = req.body;
  if (!nombre) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "El nombre es obligatorio" });

  try {
    const [resultado] = await db.query(
      "INSERT INTO categorias (nombre, descripcion, padre_id) VALUES (?, ?, ?)",
      [nombre, descripcion || null, padreId || null]
    );
    const [filas] = await db.query("SELECT * FROM categorias WHERE id = ?", [resultado.insertId]);
    res.status(201).json(formato(filas[0]));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ codigo: "NOMBRE_DUPLICADO", mensaje: "Ya existe esa categoría" });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "La categoría padre no existe" });
    }
    throw error;
  }
});

router.put("/:id", soloAdmin, async (req, res) => {
  const { nombre, descripcion, padreId, activa } = req.body;
  if (!nombre) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "El nombre es obligatorio" });

  const [resultado] = await db.query(
    "UPDATE categorias SET nombre = ?, descripcion = ?, padre_id = ?, activa = ? WHERE id = ?",
    [nombre, descripcion || null, padreId || null, activa !== false, req.params.id]
  );
  if (resultado.affectedRows === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La categoría no existe" });

  const [filas] = await db.query("SELECT * FROM categorias WHERE id = ?", [req.params.id]);
  res.json(formato(filas[0]));
});

// Baja lógica: no se borra, se marca como inactiva
router.delete("/:id", soloAdmin, async (req, res) => {
  const id = req.params.id;
  const [productos] = await db.query("SELECT id FROM productos WHERE categoria_id = ? AND activo = 1 LIMIT 1", [id]);
  const [hijas] = await db.query("SELECT id FROM categorias WHERE padre_id = ? AND activa = 1 LIMIT 1", [id]);
  if (productos.length > 0 || hijas.length > 0) {
    return res.status(409).json({ codigo: "CONFLICTO", mensaje: "La categoría tiene productos o subcategorías activas" });
  }

  const [resultado] = await db.query("UPDATE categorias SET activa = 0 WHERE id = ?", [id]);
  if (resultado.affectedRows === 0) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La categoría no existe" });
  res.status(204).send();
});

module.exports = router;
