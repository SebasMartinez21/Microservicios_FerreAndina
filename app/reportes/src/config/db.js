const { MongoClient } = require("mongodb");

// Conexión a la base de datos MongoDB de Reportes (Entrega 2, sección 3.6).
// Al arrancar crea los índices únicos (movimiento_id en movimientos_resumen, y producto_id + bodega_id en existencias)
// y carga las existencias iniciales de los 4 productos de prueba si la base está vacía.

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "reportes";

let baseDatos = null;

const PRODUCTOS_PRUEBA = [
  { id: 1, codigo: "TOR-HEX-014-2", nombre: "Tornillo hexagonal 1/4 x 2 pulgadas", categoria: "Tornillería", costo: 280 },
  { id: 2, codigo: "MAR-16OZ", nombre: "Martillo de uña 16 oz", categoria: "Herramientas", costo: 21000 },
  { id: 3, codigo: "TAL-500W", nombre: "Taladro percutor 500 W", categoria: "Herramientas eléctricas", costo: 130000 },
  { id: 4, codigo: "PIN-BLA-GAL", nombre: "Pintura blanca tipo 1", categoria: "Pinturas", costo: 52000 },
];

const STOCK_INICIAL = [
  { productoId: 1, bodegaId: 1, cantidad: 500, stockMinimo: 100 },
  { productoId: 1, bodegaId: 2, cantidad: 120, stockMinimo: 100 },
  { productoId: 1, bodegaId: 3, cantidad: 50, stockMinimo: 40 },
  { productoId: 2, bodegaId: 1, cantidad: 30, stockMinimo: 10 },
  { productoId: 2, bodegaId: 2, cantidad: 12, stockMinimo: 10 },
  { productoId: 2, bodegaId: 3, cantidad: 8, stockMinimo: 5 },
  { productoId: 3, bodegaId: 1, cantidad: 10, stockMinimo: 5 },
  { productoId: 3, bodegaId: 2, cantidad: 6, stockMinimo: 5 },
  { productoId: 3, bodegaId: 3, cantidad: 4, stockMinimo: 3 },
  { productoId: 4, bodegaId: 1, cantidad: 20, stockMinimo: 15 },
  { productoId: 4, bodegaId: 2, cantidad: 15, stockMinimo: 15 },
  { productoId: 4, bodegaId: 3, cantidad: 10, stockMinimo: 10 },
];

async function sembrarDatosIniciales(db) {
  const conteo = await db.collection("existencias").countDocuments();
  if (conteo > 0) return;

  const ahora = new Date();
  let movId = 1;

  for (const s of STOCK_INICIAL) {
    const p = PRODUCTOS_PRUEBA.find((prod) => prod.id === s.productoId);
    await db.collection("existencias").insertOne({
      producto_id: p.id,
      bodega_id: s.bodegaId,
      producto: { codigo: p.codigo, nombre: p.nombre, categoria: p.categoria },
      cantidad: s.cantidad,
      stock_minimo: s.stockMinimo,
      costo_referencia: p.costo,
      valor: s.cantidad * p.costo,
      actualizado_en: ahora,
    });

    await db.collection("movimientos_resumen").insertOne({
      movimiento_id: movId++,
      tipo: "AJUSTE",
      producto: { id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, costo_referencia: p.costo },
      cantidad: s.cantidad,
      afectaciones: [{ bodega_id: s.bodegaId, saldo: s.cantidad }],
      fecha: ahora,
    });
  }
}

async function conectar() {
  while (!baseDatos) {
    try {
      const cliente = new MongoClient(MONGO_URL);
      await cliente.connect();
      baseDatos = cliente.db(DB_NAME);

      await baseDatos.collection("movimientos_resumen").createIndex({ movimiento_id: 1 }, { unique: true });
      await baseDatos.collection("movimientos_resumen").createIndex({ fecha: -1 });
      await baseDatos.collection("existencias").createIndex({ producto_id: 1, bodega_id: 1 }, { unique: true });

      await sembrarDatosIniciales(baseDatos);
      console.log("Conectado a MongoDB (Reportes)");
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
