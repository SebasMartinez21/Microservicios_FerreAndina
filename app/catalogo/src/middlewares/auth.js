// Solo se aceptan peticiones que traen el token del gateway (o de otro servicio interno)
function validarToken(req, res, next) {
  if (req.path === "/health" || req.path.startsWith("/api-docs")) return next();

  if (req.headers["x-gateway-token"] !== process.env.GATEWAY_TOKEN) {
    return res.status(401).json({ codigo: "NO_AUTENTICADO", mensaje: "Token inválido" });
  }
  next();
}

// El gateway manda el rol del usuario en la cabecera X-Usuario-Rol
function soloAdmin(req, res, next) {
  if (req.headers["x-usuario-rol"] !== "ADMIN") {
    return res.status(403).json({ codigo: "SIN_PERMISO", mensaje: "Solo un ADMIN puede hacer esto" });
  }
  next();
}

module.exports = { validarToken, soloAdmin };
