const Suscripcion = require("../modelos/suscripcion");

// GET /preferencias
async function consultar(req, res) {
  const usuarioId = Number(req.headers["x-usuario-id"]);
  if (!usuarioId) {
    return res.status(401).json({ codigo: "NO_AUTENTICADO", mensaje: "Usuario no identificado" });
  }

  const preferencias = await Suscripcion.buscarPorUsuario(usuarioId);
  if (!preferencias) {
    return res.status(404).json({
      codigo: "PREFERENCIAS_NO_CONFIGURADAS",
      mensaje: "El usuario aún no ha configurado sus preferencias",
    });
  }

  res.json(preferencias);
}

// PUT /preferencias
async function guardar(req, res) {
  const usuarioId = Number(req.headers["x-usuario-id"]);
  const correo = req.headers["x-usuario-email"] || "usuario@ferreandina.com";
  if (!usuarioId) {
    return res.status(401).json({ codigo: "NO_AUTENTICADO", mensaje: "Usuario no identificado" });
  }

  const { bodegas } = req.body || {};
  if (bodegas !== undefined && (!Array.isArray(bodegas) || !bodegas.every((b) => Number.isInteger(b)))) {
    return res.status(400).json({
      codigo: "DATOS_INVALIDOS",
      mensaje: "bodegas debe ser una lista de identificadores enteros",
    });
  }

  const preferencias = await Suscripcion.guardar(usuarioId, correo, req.body || {});
  res.json(preferencias);
}

module.exports = { consultar, guardar };
