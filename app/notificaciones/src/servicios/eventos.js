const rabbit = require("../config/rabbit");
const Alerta = require("../modelos/alerta");
const Suscripcion = require("../modelos/suscripcion");
const correo = require("./correo");

// Consumidor de inventario.stock.bajo y compras.orden.sugerida (RF09, RF16).
// Crea la alerta en MongoDB (evento_id único) y envía correos a las suscripciones activas de esa bodega.

async function procesarEvento(evento, clave) {
  let datosAlerta;

  if (clave === "inventario.stock.bajo") {
    const tieneSugerencia = evento.sugerencia && evento.sugerencia.id;
    datosAlerta = {
      eventoId: evento.eventoId,
      tipo: tieneSugerencia ? "TRASLADO_SUGERIDO" : "STOCK_BAJO",
      productoId: evento.productoId,
      productoNombre: evento.productoNombre,
      bodegaId: evento.bodegaId,
      stockActual: evento.stockActual,
      stockMinimo: evento.stockMinimo,
      referencia: tieneSugerencia ? { tipo: "SUGERENCIA", id: evento.sugerencia.id } : null,
    };
  } else if (clave === "compras.orden.sugerida") {
    datosAlerta = {
      eventoId: evento.eventoId,
      tipo: "ORDEN_SUGERIDA",
      productoId: evento.productoId,
      productoNombre: evento.productoNombre,
      bodegaId: evento.bodegaId,
      stockActual: null,
      stockMinimo: null,
      referencia: { tipo: "ORDEN_COMPRA", id: evento.ordenId },
    };
  } else {
    return;
  }

  const alerta = await Alerta.crear(datosAlerta);
  const suscriptores = await Suscripcion.destinatariosCorreoPorBodega(alerta.bodegaId);
  if (suscriptores.length === 0) return;

  const envios = [];
  for (const s of suscriptores) {
    envios.push(await correo.enviarConReintentos(s.email, alerta));
  }
  await Alerta.actualizarEnvios(alerta.id, envios);
}

async function iniciar() {
  await rabbit.conectar();
  await rabbit.escuchar(
    "notificaciones.q",
    ["inventario.stock.bajo", "compras.orden.sugerida"],
    procesarEvento
  );
}

module.exports = { iniciar, procesarEvento };
