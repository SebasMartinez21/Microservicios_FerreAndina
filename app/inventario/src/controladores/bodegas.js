const Bodega = require("../modelos/bodega");
const { paginacion } = require("../paginacion");

const noExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La bodega no existe" });
const invalido = (res, mensaje) => res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje });
const codigoDuplicado = (res) => res.status(409).json({ codigo: "CODIGO_DUPLICADO", mensaje: "Ya existe una bodega con ese código" });
const conStock = (res) => res.status(409).json({ codigo: "BODEGA_CON_STOCK", mensaje: "La bodega todavía tiene stock; trasládelo antes de darla de baja" });

function validar({ codigo, nombre, ciudad }) {
  if (!codigo || !nombre || !ciudad) return "Faltan datos: codigo, nombre y ciudad son obligatorios";
  return null;
}

// GET /bodegas?activa=&pagina=&limite=
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const activa = req.query.activa === undefined ? undefined : req.query.activa === "true";
  const { total, datos } = await Bodega.listar({ activa, pagina, limite });
  res.json({ pagina, limite, total, datos });
}

async function consultar(req, res) {
  const bodega = await Bodega.buscar(req.params.id);
  if (!bodega) return noExiste(res);
  res.json(bodega);
}

async function crear(req, res) {
  const error = validar(req.body);
  if (error) return invalido(res, error);
  try {
    res.status(201).json(await Bodega.crear(req.body));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return codigoDuplicado(res);
    throw error;
  }
}

async function actualizar(req, res) {
  const error = validar(req.body);
  if (error) return invalido(res, error);

  const actual = await Bodega.buscar(req.params.id);
  if (!actual) return noExiste(res);
  // Desactivar por PUT tiene la misma regla que DELETE: la bodega no puede tener mercancía
  if (actual.activa && req.body.activa === false && await Bodega.unidadesEnBodega(actual.id) > 0) {
    return conStock(res);
  }

  try {
    res.json(await Bodega.actualizar(actual.id, req.body));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return codigoDuplicado(res);
    throw error;
  }
}

// Baja lógica, solo si la bodega ya no tiene mercancía queda como inactiva
async function darDeBaja(req, res) {
  const bodega = await Bodega.buscar(req.params.id);
  if (!bodega) return noExiste(res);
  if (await Bodega.unidadesEnBodega(bodega.id) > 0) return conStock(res);
  await Bodega.darDeBaja(bodega.id);
  res.status(204).send();
}

module.exports = { listar, consultar, crear, actualizar, darDeBaja };
