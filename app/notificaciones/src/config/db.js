const { MongoClient } = require("mongodb");

// Conexión a la base de datos MongoDB de Notificaciones.
// Al arrancar crea los índices únicos (evento_id en alertas y usuario_id en suscripciones)
// y la suscripción inicial del administrador de prueba.

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "notificaciones";

let baseDatos = null;

async function conectar() {
  while (!baseDatos) {
    try {
      const cliente = new MongoClient(MONGO_URL);
      await cliente.connect();
      baseDatos = cliente.db(DB_NAME);

      await baseDatos.collection("alertas").createIndex({ evento_id: 1 }, { unique: true });
      await baseDatos.collection("alertas").createIndex({ creada_en: -1 });
      await baseDatos.collection("suscripciones").createIndex({ usuario_id: 1 }, { unique: true });

      // Suscripción de prueba para el administrador (id 1 en el Gateway)
      await baseDatos.collection("suscripciones").updateOne(
        { usuario_id: 1 },
        {
          $setOnInsert: {
            usuario_id: 1,
            correo: "admin@ferreandina.com",
            canal_interfaz: true,
            canal_correo: true,
            bodegas: [],
            activa: true,
          },
        },
        { upsert: true }
      );

      console.log("Conectado a MongoDB (Notificaciones)");
    } catch (error) {
      console.log("MongoDB no responde, reintentando...");
      await new Promise((esperar) => setTimeout(esperar, 3000));
    }
  }
  return baseDatos;
}

function coleccion(nombre) {
  return baseDatos.collection(nombre);
}

module.exports = { conectar, coleccion };
