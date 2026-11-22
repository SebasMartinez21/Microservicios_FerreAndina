const Proveedor = require("../modelos/proveedor");
const { paginacion } = require("../paginacion");

const noExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El proveedor no existe" });
const invalido = (res, mensaje) => res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje });
const nitDuplicado = (res) => res.status(409).json({ codigo: "NIT_DUPLICADO", mensaje: "Ya existe un proveedor con ese NIT" });

function validar({ nit, nombre }) {
  if (!nit || !nombre) return "Faltan datos: nit y nombre son obligatorios";
  return null;
}

// GET /proveedores?q=&activo=&pagina=&limite=
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const { total, datos } = await Proveedor.listar({
    q: req.query.q,
    activo: req.query.activo !== "false",
    pagina,
    limite,
  });
  res.json({ pagina, limite, total, datos });
}

async function consultar(req, res) {
  const proveedor = await Proveedor.buscar(req.params.id);
  if (!proveedor) return noExiste(res);
  res.json(proveedor);
}

async function crear(req, res) {
  const error = validar(req.body);
  if (error) return invalido(res, error);

  try {
    res.status(201).json(await Proveedor.crear(req.body));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return nitDuplicado(res);
    throw error;
  }
}

async function actualizar(req, res) {
  const error = validar(req.body);
  if (error) return invalido(res, error);

  const actual = await Proveedor.buscar(req.params.id);
  if (!actual) return noExiste(res);

  if (actual.activo && req.body.activo === false && (await Proveedor.tieneOrdenesAbiertas(actual.id))) {
    return res.status(409).json({
      codigo: "PROVEEDOR_CON_ORDENES_ABIERTAS",
      mensaje: "El proveedor tiene órdenes en BORRADOR, ENVIADA o RECIBIDA_PARCIAL",
    });
  }

  try {
    res.json(await Proveedor.actualizar(actual.id, req.body));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return nitDuplicado(res);
    throw error;
  }
}

// Baja lógica: no se permite si tiene órdenes abiertas
async function darDeBaja(req, res) {
  const proveedor = await Proveedor.buscar(req.params.id);
  if (!proveedor) return noExiste(res);

  if (await Proveedor.tieneOrdenesAbiertas(proveedor.id)) {
    return res.status(409).json({
      codigo: "PROVEEDOR_CON_ORDENES_ABIERTAS",
      mensaje: "El proveedor tiene órdenes en BORRADOR, ENVIADA o RECIBIDA_PARCIAL",
    });
  }

  await Proveedor.darDeBaja(proveedor.id);
  res.status(204).send();
}

module.exports = { listar, consultar, crear, actualizar, darDeBaja };
