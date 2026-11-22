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

// Escucha una o varias claves de ruteo en una misma cola durable
async function escuchar(cola, claves, funcion) {
  await canal.assertQueue(cola, { durable: true });
  const listaClaves = Array.isArray(claves) ? claves : [claves];
  for (const clave of listaClaves) {
    await canal.bindQueue(cola, EXCHANGE, clave);
  }
  canal.consume(cola, async (mensaje) => {
    try {
      const clave = mensaje.fields.routingKey;
      await funcion(JSON.parse(mensaje.content.toString()), clave);
      canal.ack(mensaje);
    } catch (error) {
      // Si el evento llega repetido (índice único en MongoDB: código 11000), se ignora y se confirma
      if (error.code === 11000 || error.code === "ER_DUP_ENTRY") {
        return canal.ack(mensaje);
      }
      console.log("Error procesando evento:", error.message);
      canal.nack(mensaje);
    }
  });
}

module.exports = { conectar, escuchar };
