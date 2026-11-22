const amqp = require("amqplib");

// Todos los servicios publican en el mismo exchange de tipo topic
const EXCHANGE = "ferreandina.events";
let canal = null;

async function conectar() {
  // RabbitMQ tarda en arrancar, así que se reintenta cada 5 segundos
  while (!canal) {
    try {
      const conexion = await amqp.connect(process.env.RABBIT_URL || "amqp://localhost");
      canal = await conexion.createChannel();
      await canal.assertExchange(EXCHANGE, "topic", { durable: true });
      console.log("Conectado a RabbitMQ");
    } catch (error) {
      console.log("RabbitMQ no responde, reintentando...");
      await new Promise((esperar) => setTimeout(esperar, 5000));
    }
  }
}

// Publica un evento, por ejemplo publicar("compras.orden.sugerida", {...})
function publicar(clave, datos) {
  if (!canal) return console.log("Evento sin enviar, no hay conexión:", clave);
  const evento = { eventoId: crypto.randomUUID(), fecha: new Date().toISOString(), ...datos };
  canal.publish(EXCHANGE, clave, Buffer.from(JSON.stringify(evento)), { persistent: true });
}

// Escucha eventos en una cola propia, por ejemplo escuchar("compras.q", "inventario.reabastecimiento.requerido", fn)
async function escuchar(cola, clave, funcion) {
  await canal.assertQueue(cola, { durable: true });
  await canal.bindQueue(cola, EXCHANGE, clave);
  canal.consume(cola, async (mensaje) => {
    try {
      await funcion(JSON.parse(mensaje.content.toString()));
      canal.ack(mensaje);
    } catch (error) {
      // Si el evento llega repetido (índice único en MySQL o MongoDB), se ignora y se confirma
      if (error.code === "ER_DUP_ENTRY" || error.code === 11000) {
        return canal.ack(mensaje);
      }
      console.log("Error procesando evento:", error.message);
      canal.nack(mensaje);
    }
  });
}

module.exports = { conectar, publicar, escuchar };
