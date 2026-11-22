// Solo se aceptan peticiones que traen el token del gateway (o de otro servicio interno)
function validarToken(req, res, next) {
  if (req.path === "/health" || req.path.startsWith("/api-docs")) return next();

  if (req.headers["x-gateway-token"] !== process.env.GATEWAY_TOKEN) {
    return res.status(401).json({ codigo: "NO_AUTENTICADO", mensaje: "Token inválido" });
  }
  next();
}

module.exports = { validarToken };
