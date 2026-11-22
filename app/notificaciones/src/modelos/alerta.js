const { ObjectId } = require("mongodb");
const { coleccion } = require("../config/db");

// Consultas MongoDB de la colección alertas (Entrega 2, sección 3.5)

function formatoEnvio(e) {
  return {
    destinatario: e.destinatario,
    estado: e.estado,
    intentos: e.intentos,
    ultimoError: e.ultimo_error ?? null,
    enviadoEn: e.enviado_en ? new Date(e.enviado_en).toISOString() : null,
  };
}

function formato(doc) {
  return {
    id: String(doc._id),
    tipo: doc.tipo,
    productoId: doc.producto_id,
    productoNombre: doc.producto_nombre,
    bodegaId: doc.bodega_id,
    stockActual: doc.stock_actual ?? null,
    stockMinimo: doc.stock_minimo ?? null,
    estado: doc.estado,
    referencia: doc.referencia || null,
    envios: (doc.envios || []).map(formatoEnvio),
    creadaEn: doc.creada_en ? new Date(doc.creada_en).toISOString() : null,
    atendidaEn: doc.atendida_en ? new Date(doc.atendida_en).toISOString() : null,
  };
}

// filtros: { estado, tipo, bodegaId, bodegasSuscritas, pagina, limite }
async function listar(filtros) {
  const query = {};
  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.tipo) query.tipo = filtros.tipo;
  if (filtros.bodegaId) {
    query.bodega_id = Number(filtros.bodegaId);
  } else if (Array.isArray(filtros.bodegasSuscritas) && filtros.bodegasSuscritas.length > 0) {
    query.bodega_id = { $in: filtros.bodegasSuscritas };
  }

  const col = coleccion("alertas");
  const total = await col.countDocuments(query);
  const docs = await col
    .find(query)
    .sort({ creada_en: -1, _id: -1 })
    .skip((filtros.pagina - 1) * filtros.limite)
    .limit(filtros.limite)
    .toArray();

  return { total, datos: docs.map(formato) };
}

async function contarPendientes() {
  return coleccion("alertas").countDocuments({ estado: "PENDIENTE" });
}

async function buscar(id) {
  if (!ObjectId.isValid(id)) return null;
  const doc = await coleccion("alertas").findOne({ _id: new ObjectId(id) });
  return doc ? formato(doc) : null;
}

async function crear(datos) {
  const doc = {
    evento_id: datos.eventoId,
    tipo: datos.tipo,
    producto_id: datos.productoId,
    producto_nombre: datos.productoNombre,
    bodega_id: datos.bodegaId,
    stock_actual: datos.stockActual ?? null,
    stock_minimo: datos.stockMinimo ?? null,
    estado: "PENDIENTE",
    referencia: datos.referencia || null,
    envios: datos.envios || [],
    creada_en: new Date(),
    atendida_en: null,
  };
  const resultado = await coleccion("alertas").insertOne(doc);
  return buscar(String(resultado.insertedId));
}

async function actualizarEnvios(id, envios) {
  await coleccion("alertas").updateOne({ _id: new ObjectId(id) }, { $set: { envios } });
}

// Pasa de PENDIENTE a LEIDA; si ya estaba leída o atendida, no cambia
async function marcarLeida(id) {
  if (!ObjectId.isValid(id)) return null;
  const oid = new ObjectId(id);
  const doc = await coleccion("alertas").findOne({ _id: oid });
  if (!doc) return null;

  if (doc.estado === "PENDIENTE") {
    await coleccion("alertas").updateOne({ _id: oid }, { $set: { estado: "LEIDA" } });
  }
  return buscar(id);
}

// Pasa a ATENDIDA desde PENDIENTE o LEIDA y registra atendida_en
async function marcarAtendida(id) {
  if (!ObjectId.isValid(id)) return null;
  const oid = new ObjectId(id);
  const doc = await coleccion("alertas").findOne({ _id: oid });
  if (!doc) return null;

  if (doc.estado !== "ATENDIDA") {
    await coleccion("alertas").updateOne(
      { _id: oid },
      { $set: { estado: "ATENDIDA", atendida_en: new Date() } }
    );
  }
  return buscar(id);
}

module.exports = {
  listar,
  contarPendientes,
  buscar,
  crear,
  actualizarEnvios,
  marcarLeida,
  marcarAtendida,
};
