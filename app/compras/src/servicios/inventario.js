const { ErrorHttp } = require("../errores");

// Llamada directa a Inventario (③): registra una ENTRADA por cada línea recibida,
// con una Idempotency-Key determinista para que un reintento no duplique la entrada.
const INVENTARIO_URL = process.env.INVENTARIO_URL || "http://inventario:3000";

async function registrarEntrada({ productoId, bodegaId, cantidad, ordenId, numeroOrden, usuarioId, claveIdempotencia }) {
  let respuesta;
  try {
    const headers = {
      "Content-Type": "application/json",
      "X-Gateway-Token": process.env.GATEWAY_TOKEN,
      "Idempotency-Key": claveIdempotencia,
    };
    if (usuarioId) headers["X-Usuario-Id"] = String(usuarioId);

    respuesta = await fetch(`${INVENTARIO_URL}/movimientos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tipo: "ENTRADA",
        productoId,
        cantidad,
        bodegaDestinoId: bodegaId,
        motivo: `Recepción de orden de compra ${numeroOrden}`,
        referencia: { tipo: "ORDEN_COMPRA", id: String(ordenId) },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new ErrorHttp(503, "INVENTARIO_NO_DISPONIBLE", "No se pudo registrar la entrada: Inventario no responde");
  }

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 404 || respuesta.status === 400) {
    throw new ErrorHttp(400, cuerpo.codigo || "DATOS_INVALIDOS", cuerpo.mensaje || "Datos inválidos al registrar entrada en Inventario");
  }
  if (!respuesta.ok) {
    throw new ErrorHttp(503, "INVENTARIO_NO_DISPONIBLE", cuerpo.mensaje || "Inventario respondió con error");
  }
  return cuerpo;
}

module.exports = { registrarEntrada };
