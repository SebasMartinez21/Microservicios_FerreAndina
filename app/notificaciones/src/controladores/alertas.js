const Alerta = require("../modelos/alerta");
const Suscripcion = require("../modelos/suscripcion");
const { paginacion } = require("../paginacion");

const noExiste = (res) =>
  res.status(404).json({ codigo: "ALERTA_NO_ENCONTRADA", mensaje: "No existe una alerta con ese identificador" });

// GET /alertas?estado=&tipo=&bodegaId=&misBodegas=
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  let bodegasSuscritas = null;

  if (req.query.misBodegas === "true") {
    const usuarioId = Number(req.headers["x-usuario-id"]);
    if (usuarioId) {
      const suscripcion = await Suscripcion.buscarPorUsuario(usuarioId);
      if (suscripcion && suscripcion.bodegas.length > 0) {
        bodegasSuscritas = suscripcion.bodegas;
      }
    }
  }

  const { total, datos } = await Alerta.listar({
    estado: req.query.estado,
    tipo: req.query.tipo,
    bodegaId: req.query.bodegaId,
    bodegasSuscritas,
    pagina,
    limite,
  });

  res.json({ pagina, limite, total, datos });
}

// GET /alertas/resumen
async function resumen(req, res) {
  const pendientes = await Alerta.contarPendientes();
  res.json({ pendientes });
}

// GET /alertas/:id
async function consultar(req, res) {
  const alerta = await Alerta.buscar(req.params.id);
  if (!alerta) return noExiste(res);
  res.json(alerta);
}

// POST /alertas/:id/leer
async function leer(req, res) {
  const alerta = await Alerta.marcarLeida(req.params.id);
  if (!alerta) return noExiste(res);
  res.json(alerta);
}

// POST /alertas/:id/atender
async function atender(req, res) {
  const alerta = await Alerta.marcarAtendida(req.params.id);
  if (!alerta) return noExiste(res);
  res.json(alerta);
}

module.exports = { listar, resumen, consultar, leer, atender };
