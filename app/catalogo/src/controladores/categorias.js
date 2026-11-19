const Categoria = require("../modelos/categoria");

const noExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La categoría no existe" });

// GET /categorias?arbol=true&activa=true
async function listar(req, res) {
  const categorias = await Categoria.listar(req.query.activa !== "false");
  if (req.query.arbol !== "true") return res.json(categorias);

  // Arma el árbol: cada categoría raíz con sus subcategorías
  const raices = categorias.filter((categoria) => categoria.padreId === null);
  for (const raiz of raices) {
    raiz.subcategorias = categorias.filter((categoria) => categoria.padreId === raiz.id);
  }
  res.json(raices);
}

async function consultar(req, res) {
  const categoria = await Categoria.buscar(req.params.id);
  if (!categoria) return noExiste(res);
  res.json(categoria);
}

async function crear(req, res) {
  if (!req.body.nombre) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "El nombre es obligatorio" });

  try {
    res.status(201).json(await Categoria.crear(req.body));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ codigo: "NOMBRE_DUPLICADO", mensaje: "Ya existe esa categoría" });
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "La categoría padre no existe" });
    throw error;
  }
}

async function actualizar(req, res) {
  if (!req.body.nombre) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "El nombre es obligatorio" });

  const categoria = await Categoria.actualizar(req.params.id, req.body);
  if (!categoria) return noExiste(res);
  res.json(categoria);
}

// Baja lógica: no se borra, se marca como inactiva
async function darDeBaja(req, res) {
  if (await Categoria.tieneDependientes(req.params.id)) {
    return res.status(409).json({ codigo: "CONFLICTO", mensaje: "La categoría tiene productos o subcategorías activas" });
  }
  if (!(await Categoria.darDeBaja(req.params.id))) return noExiste(res);
  res.status(204).send();
}

module.exports = { listar, consultar, crear, actualizar, darDeBaja };
