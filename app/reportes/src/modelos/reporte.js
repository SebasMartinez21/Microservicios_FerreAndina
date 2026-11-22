const { coleccion } = require("../config/db");

// Consultas y agregaciones MongoDB sobre las colecciones existencias y movimientos_resumen (Entrega 2, sección 3.6).
// Rotación e indicadores no se guardan: se calculan por agregación.

function formatoExistencia(doc) {
  return {
    productoId: doc.producto_id,
    producto: {
      codigo: doc.producto?.codigo,
      nombre: doc.producto?.nombre,
      categoria: doc.producto?.categoria,
    },
    bodegaId: doc.bodega_id,
    cantidad: doc.cantidad,
    stockMinimo: doc.stock_minimo,
    costoReferencia: Number(doc.costo_referencia),
    valor: Number(doc.valor),
    actualizadoEn: doc.actualizado_en ? new Date(doc.actualizado_en).toISOString() : null,
  };
}

// Normaliza el nombre de categoría si viene como objeto { id, nombre } o como string
function nombreCategoria(cat) {
  if (!cat) return "";
  return typeof cat === "object" ? cat.nombre || "" : String(cat);
}

// Actualiza movimintos_resumen y existencias al llegar inventario.movimiento.registrado
async function registrarMovimiento(evento) {
  const prod = evento.producto || {};
  const categoria = nombreCategoria(prod.categoria);
  const costo = Number(prod.costoReferencia) || 0;
  const fecha = evento.fecha ? new Date(evento.fecha) : new Date();
  const afectaciones = (evento.afectaciones || []).map((a) => ({
    bodega_id: Number(a.bodegaId),
    saldo: Number(a.saldo),
    stock_minimo: Number(a.stockMinimo ?? 0),
  }));

  // 1. Actualizar existencias con saldos absolutos (reprocesar un evento no daña existencias)
  for (const af of afectaciones) {
    await coleccion("existencias").updateOne(
      { producto_id: Number(prod.id), bodega_id: af.bodega_id },
      {
        $set: {
          producto_id: Number(prod.id),
          bodega_id: af.bodega_id,
          producto: { codigo: prod.codigo, nombre: prod.nombre, categoria },
          cantidad: af.saldo,
          stock_minimo: af.stock_minimo,
          costo_referencia: costo,
          valor: af.saldo * costo,
          actualizado_en: fecha,
        },
      },
      { upsert: true }
    );
  }

  // 2. Guardar copia resumida del movimiento (movimiento_id es UNIQUE)
  await coleccion("movimientos_resumen").insertOne({
    movimiento_id: Number(evento.movimientoId),
    tipo: evento.tipo,
    producto: {
      id: Number(prod.id),
      codigo: prod.codigo,
      nombre: prod.nombre,
      categoria,
      costo_referencia: costo,
    },
    cantidad: Number(evento.cantidad),
    afectaciones: afectaciones.map((a) => ({ bodega_id: a.bodega_id, saldo: a.saldo })),
    fecha,
  });
}

// Actualiza producto, costo_referencia y valor en todas sus existencias al llegar catalogo.producto.actualizado
async function actualizarProducto(evento) {
  const productoId = Number(evento.productoId);
  const categoria = nombreCategoria(evento.categoria);
  const costo = Number(evento.costoReferencia) || 0;
  const fecha = evento.actualizadoEn ? new Date(evento.actualizadoEn) : new Date();

  const filas = await coleccion("existencias").find({ producto_id: productoId }).toArray();
  for (const fila of filas) {
    await coleccion("existencias").updateOne(
      { _id: fila._id },
      {
        $set: {
          producto: { codigo: evento.codigo, nombre: evento.nombre, categoria },
          costo_referencia: costo,
          valor: fila.cantidad * costo,
          actualizado_en: fecha,
        },
      }
    );
  }
}

// GET /reportes/existencias
async function listarExistencias({ bodegaId, categoria, q, bajoMinimo, pagina, limite }) {
  const query = {};
  if (bodegaId) query.bodega_id = Number(bodegaId);
  if (categoria) query["producto.categoria"] = categoria;
  if (q) {
    const regex = new RegExp(q, "i");
    query.$or = [{ "producto.nombre": regex }, { "producto.codigo": regex }];
  }
  if (bajoMinimo) {
    query.$expr = { $lt: ["$cantidad", "$stock_minimo"] };
  }

  const col = coleccion("existencias");
  const total = await col.countDocuments(query);
  const docs = await col
    .find(query)
    .sort({ producto_id: 1, bodega_id: 1 })
    .skip((pagina - 1) * limite)
    .limit(limite)
    .toArray();

  return { total, datos: docs.map(formatoExistencia) };
}

// GET /reportes/valorizacion
async function calcularValorizacion({ agruparPor = "BODEGA", bodegaId }) {
  const match = {};
  if (bodegaId) match.bodega_id = Number(bodegaId);

  const campoGrupo = agruparPor === "CATEGORIA" ? "$producto.categoria" : { $toString: "$bodega_id" };
  const gruposRaw = await coleccion("existencias")
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: campoGrupo,
          unidades: { $sum: "$cantidad" },
          valor: { $sum: "$valor" },
          ultimaFecha: { $max: "$actualizado_en" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  let valorTotal = 0;
  let ultimaFecha = null;
  const grupos = gruposRaw.map((g) => {
    valorTotal += Number(g.valor);
    if (g.ultimaFecha && (!ultimaFecha || g.ultimaFecha > ultimaFecha)) {
      ultimaFecha = g.ultimaFecha;
    }
    return {
      grupo: String(g._id),
      unidades: g.unidades,
      valor: Number(g.valor),
    };
  });

  return {
    agruparPor,
    valorTotal,
    grupos,
    actualizadoEn: ultimaFecha ? new Date(ultimaFecha).toISOString() : new Date().toISOString(),
  };
}

// Calcula la rotación de cada producto en un rango de fechas [desdeDate, hastaDate]
// indiceRotacion = unidadesSalidas / stockPromedio (solo cuentan movimientos de tipo SALIDA)
async function calcularItemsRotacion({ desdeDate, hastaDate, bodegaId }) {
  const matchExistencias = {};
  if (bodegaId) matchExistencias.bodega_id = Number(bodegaId);

  const existencias = await coleccion("existencias").find(matchExistencias).toArray();
  const mapaProductos = new Map();

  for (const ex of existencias) {
    const actual = mapaProductos.get(ex.producto_id) || {
      productoId: ex.producto_id,
      producto: ex.producto,
      stockActual: 0,
      unidadesSalidas: 0,
      saldosPeriodo: [],
    };
    actual.stockActual += ex.cantidad;
    mapaProductos.set(ex.producto_id, actual);
  }

  const matchMov = { fecha: { $gte: desdeDate, $lt: hastaDate } };
  if (bodegaId) matchMov["afectaciones.bodega_id"] = Number(bodegaId);

  const movimientos = await coleccion("movimientos_resumen").find(matchMov).toArray();

  for (const mov of movimientos) {
    const prodId = mov.producto?.id;
    if (!prodId) continue;

    if (!mapaProductos.has(prodId)) {
      mapaProductos.set(prodId, {
        productoId: prodId,
        producto: {
          codigo: mov.producto.codigo,
          nombre: mov.producto.nombre,
          categoria: mov.producto.categoria,
        },
        stockActual: 0,
        unidadesSalidas: 0,
        saldosPeriodo: [],
      });
    }

    const item = mapaProductos.get(prodId);
    const afectaciones = bodegaId
      ? (mov.afectaciones || []).filter((a) => a.bodega_id === Number(bodegaId))
      : mov.afectaciones || [];

    if (mov.tipo === "SALIDA" && afectaciones.length > 0) {
      item.unidadesSalidas += Math.abs(mov.cantidad);
    }
    for (const af of afectaciones) {
      item.saldosPeriodo.push(af.saldo);
    }
  }

  const resultado = [];
  for (const item of mapaProductos.values()) {
    const stockPromedio =
      item.saldosPeriodo.length > 0
        ? item.saldosPeriodo.reduce((s, v) => s + v, 0) / item.saldosPeriodo.length
        : item.stockActual;

    const indiceRotacion = stockPromedio > 0 ? item.unidadesSalidas / stockPromedio : 0;

    resultado.push({
      productoId: item.productoId,
      producto: item.producto,
      unidadesSalidas: item.unidadesSalidas,
      stockPromedio: Number(stockPromedio.toFixed(2)),
      indiceRotacion: Number(indiceRotacion.toFixed(2)),
    });
  }

  return resultado;
}

// GET /reportes/rotacion
async function calcularRotacion({ desde, hasta, bodegaId, orden = "MAYOR", limite = 10 }) {
  const hoy = new Date();
  const hastaStr = hasta || hoy.toISOString().slice(0, 10);
  const desdeDefault = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const desdeStr = desde || desdeDefault;

  const desdeDate = new Date(desdeStr + "T00:00:00.000Z");
  const hastaDate = new Date(new Date(hastaStr + "T00:00:00.000Z").getTime() + 24 * 60 * 60 * 1000);

  const items = await calcularItemsRotacion({ desdeDate, hastaDate, bodegaId });
  items.sort((a, b) => (orden === "MENOR" ? a.indiceRotacion - b.indiceRotacion : b.indiceRotacion - a.indiceRotacion));

  return {
    desde: desdeStr,
    hasta: hastaStr,
    orden,
    datos: items.slice(0, limite),
  };
}

// GET /indicadores (RF14)
async function calcularIndicadores({ bodegaId, dias = 30 }) {
  const match = {};
  if (bodegaId) match.bodega_id = Number(bodegaId);

  const porBodegaRaw = await coleccion("existencias")
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: "$bodega_id",
          valor: { $sum: "$valor" },
          unidades: { $sum: "$cantidad" },
          productosEnQuiebre: {
            $sum: { $cond: [{ $lt: ["$cantidad", "$stock_minimo"] }, 1, 0] },
          },
          ultimaFecha: { $max: "$actualizado_en" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  let valorTotal = 0;
  let totalUnidades = 0;
  let productosEnQuiebre = 0;
  let ultimaFecha = null;

  const porBodega = porBodegaRaw.map((b) => {
    valorTotal += Number(b.valor);
    totalUnidades += b.unidades;
    productosEnQuiebre += b.productosEnQuiebre;
    if (b.ultimaFecha && (!ultimaFecha || b.ultimaFecha > ultimaFecha)) {
      ultimaFecha = b.ultimaFecha;
    }
    return {
      bodegaId: b._id,
      valor: Number(b.valor),
      productosEnQuiebre: b.productosEnQuiebre,
    };
  });

  const hoy = new Date();
  const hastaStr = hoy.toISOString().slice(0, 10);
  const desdeStr = new Date(hoy.getTime() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const desdeDate = new Date(desdeStr + "T00:00:00.000Z");
  const hastaDate = new Date(new Date(hastaStr + "T00:00:00.000Z").getTime() + 24 * 60 * 60 * 1000);

  const itemsRotacion = await calcularItemsRotacion({ desdeDate, hastaDate, bodegaId });
  const rotacionPromedio =
    itemsRotacion.length > 0
      ? Number(
          (itemsRotacion.reduce((s, i) => s + i.indiceRotacion, 0) / itemsRotacion.length).toFixed(2)
        )
      : 0;

  return {
    valorTotal,
    totalUnidades,
    productosEnQuiebre,
    rotacionPromedio,
    periodoRotacion: { desde: desdeStr, hasta: hastaStr },
    porBodega,
    actualizadoEn: ultimaFecha ? new Date(ultimaFecha).toISOString() : new Date().toISOString(),
  };
}

module.exports = {
  registrarMovimiento,
  actualizarProducto,
  listarExistencias,
  calcularValorizacion,
  calcularRotacion,
  calcularIndicadores,
};
