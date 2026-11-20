const Movimiento = require("../modelos/movimiento");
const servicio = require("../servicios/movimientos");
const { paginacion } = require("../paginacion");

// GET /movimientos?productoId=&bodegaId=&tipo=&desde=&hasta=
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const { productoId, bodegaId, tipo, desde, hasta } = req.query;
  const { total, datos } = await Movimiento.listar({ productoId, bodegaId, tipo, desde, hasta, pagina, limite });
  res.json({ pagina, limite, total, datos });
}

async function consultar(req, res) {
  const movimiento = await Movimiento.buscar(req.params.id);
  if (!movimiento) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El movimiento no existe" });
  res.json(movimiento);
}

// POST /movimientos. Con una Idempotency-Key repetida devuelve el original con 200.
async function registrar(req, res) {
  const usuarioId = Number(req.headers["x-usuario-id"]) || null;
  const clave = req.headers["idempotency-key"];
  const { movimiento, nuevo } = await servicio.registrar(req.body, usuarioId, clave);
  res.status(nuevo ? 201 : 200).json(movimiento);
}

// GET /kardex?productoId=&bodegaId=&desde=&hasta=  (RF10)
async function kardex(req, res) {
  const { productoId, bodegaId, desde, hasta } = req.query;
  if (!productoId) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "productoId es obligatorio" });
  const { pagina, limite } = paginacion(req.query);
  const { total, datos } = await Movimiento.kardex({ productoId, bodegaId, desde, hasta, pagina, limite });
  res.json({ pagina, limite, total, datos });
}

module.exports = { listar, consultar, registrar, kardex };
