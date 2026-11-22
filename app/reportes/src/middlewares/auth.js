// Solo se aceptan peticiones que traen el token del gateway.
// Todos los endpoints de Reportes son exclusivos para ADMIN (exponen costos y valorización).
function validarToken(req, res, next) {
  if (req.path === "/health" || req.path.startsWith("/api-docs")) return next();

  if (req.headers["x-gateway-token"] !== process.env.GATEWAY_TOKEN) {
    return res.status(401).json({ codigo: "NO_AUTENTICADO", mensaje: "Token inválido" });
  }
  next();
}

function soloAdmin(req, res, next) {
  if (req.headers["x-usuario-rol"] !== "ADMIN") {
    return res.status(403).json({ codigo: "SIN_PERMISO", mensaje: "Solo un ADMIN puede consultar reportes" });
  }
  next();
}

module.exports = { validarToken, soloAdmin };
