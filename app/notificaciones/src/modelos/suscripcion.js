const { coleccion } = require("../config/db");

// Consultas MongoDB de la colección suscripciones (Entrega 2, sección 3.5)

function formato(doc) {
  return {
    usuarioId: doc.usuario_id,
    email: doc.correo,
    canalInterfaz: !!doc.canal_interfaz,
    canalCorreo: !!doc.canal_correo,
    bodegas: doc.bodegas || [],
    activa: !!doc.activa,
  };
}

async function buscarPorUsuario(usuarioId) {
  const doc = await coleccion("suscripciones").findOne({ usuario_id: Number(usuarioId) });
  return doc ? formato(doc) : null;
}

async function guardar(usuarioId, correo, datos) {
  const doc = {
    usuario_id: Number(usuarioId),
    correo,
    canal_interfaz: datos.canalInterfaz !== undefined ? !!datos.canalInterfaz : true,
    canal_correo: datos.canalCorreo !== undefined ? !!datos.canalCorreo : false,
    bodegas: Array.isArray(datos.bodegas) ? datos.bodegas.map(Number) : [],
    activa: datos.activa !== undefined ? !!datos.activa : true,
  };

  await coleccion("suscripciones").updateOne(
    { usuario_id: Number(usuarioId) },
    { $set: doc },
    { upsert: true }
  );
  return buscarPorUsuario(usuarioId);
}

// Suscripciones activas con canal_correo=true que cubren la bodega indicada (bodegas vacío = todas)
async function destinatariosCorreoPorBodega(bodegaId) {
  const docs = await coleccion("suscripciones")
    .find({
      activa: true,
      canal_correo: true,
      $or: [{ bodegas: { $size: 0 } }, { bodegas: Number(bodegaId) }],
    })
    .toArray();
  return docs.map(formato);
}

module.exports = { buscarPorUsuario, guardar, destinatariosCorreoPorBodega };
