const nodemailer = require("nodemailer");

// Envío de correos con reintentos (máximo 3 intentos por destinatario).
// Si no hay servidor SMTP configurado, usa el transporte jsonTransport/stream de Nodemailer
// y deja constancia en los logs del contenedor (igual que MAIL_MAILER=log en el Gateway).

const MAX_INTENTOS = 3;

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

function armarMensaje(alerta) {
  if (alerta.tipo === "ORDEN_SUGERIDA") {
    return {
      asunto: `[FerreAndina] Orden de compra sugerida - ${alerta.productoNombre}`,
      texto: `Se generó una orden de compra sugerida en borrador (ID ${alerta.referencia?.id}) para el producto ${alerta.productoNombre} en la bodega ${alerta.bodegaId}.`,
    };
  }
  if (alerta.tipo === "TRASLADO_SUGERIDO") {
    return {
      asunto: `[FerreAndina] Stock bajo con traslado sugerido - ${alerta.productoNombre}`,
      texto: `El producto ${alerta.productoNombre} en la bodega ${alerta.bodegaId} bajó a ${alerta.stockActual} (mínimo ${alerta.stockMinimo}). Se creó la sugerencia de traslado #${alerta.referencia?.id}.`,
    };
  }
  return {
    asunto: `[FerreAndina] Alerta de stock bajo - ${alerta.productoNombre}`,
    texto: `El producto ${alerta.productoNombre} en la bodega ${alerta.bodegaId} bajó a ${alerta.stockActual} unidades (mínimo ${alerta.stockMinimo}).`,
  };
}

async function enviarConReintentos(destinatario, alerta) {
  const { asunto, texto } = armarMensaje(alerta);
  let intentos = 0;
  let ultimoError = null;

  while (intentos < MAX_INTENTOS) {
    intentos++;
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || "alertas@ferreandina.com",
        to: destinatario,
        subject: asunto,
        text: texto,
      });
      console.log(`Correo enviado a ${destinatario}: ${asunto}`);
      return {
        destinatario,
        estado: "ENVIADO",
        intentos,
        ultimo_error: null,
        enviado_en: new Date(),
      };
    } catch (error) {
      ultimoError = error.message;
    }
  }

  return {
    destinatario,
    estado: "FALLIDO",
    intentos,
    ultimo_error: ultimoError,
    enviado_en: null,
  };
}

module.exports = { enviarConReintentos };
