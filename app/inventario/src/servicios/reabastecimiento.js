const rabbit = require("../config/rabbit");
const Stock = require("../modelos/stock");
const Sugerencia = require("../modelos/sugerencia");

// Reabastecimiento inteligente entre sedes (RF16).
//
// Cuando un movimiento deja una bodega por debajo de su mínimo:
// 1. Se calcula cuánto le falta para llegar al doble del mínimo (la "necesidad").
// 2. Se busca la otra bodega con más excedente (lo que tiene por encima de su propio mínimo).
// 3. Si alguna tiene excedente, se sugiere un TRASLADO desde ella.
//    Si ninguna tiene, se sugiere una COMPRA y se le pasa a Compras por evento.
// 4. Siempre se publica inventario.stock.bajo para que Notificaciones avise.

async function revisar(producto, afectaciones) {
  for (const afectacion of afectaciones) {
    // Solo cuando el saldo CRUZA el mínimo (estaba en el mínimo o más y quedó por debajo).
    // Así las salidas siguientes no repiten la alerta ni la sugerencia.
    const cruzoMinimo = afectacion.saldoAnterior >= afectacion.stockMinimo && afectacion.saldo < afectacion.stockMinimo;
    if (cruzoMinimo) await sugerir(producto, afectacion);
  }
}

async function sugerir(producto, { bodegaId, saldo, stockMinimo }) {
  const necesidad = stockMinimo * 2 - saldo;

  const otras = await Stock.enOtrasBodegas(producto.id, bodegaId);
  const mejor = otras
    .map((s) => ({ bodegaId: s.bodegaId, excedente: s.cantidad - s.stockMinimo }))
    .sort((a, b) => b.excedente - a.excedente)[0];

  let sugerencia;
  if (mejor && mejor.excedente > 0) {
    sugerencia = await Sugerencia.crear({
      tipo: "TRASLADO",
      productoId: producto.id,
      bodegaDestinoId: bodegaId,
      bodegaOrigenId: mejor.bodegaId,
      cantidad: Math.min(necesidad, mejor.excedente),
    });
  } else {
    sugerencia = await Sugerencia.crear({ tipo: "COMPRA", productoId: producto.id, bodegaDestinoId: bodegaId, cantidad: necesidad });
    rabbit.publicar("inventario.reabastecimiento.requerido", {
      sugerenciaId: sugerencia.id,
      productoId: producto.id,
      bodegaDestinoId: bodegaId,
      cantidad: necesidad,
    });
  }

  rabbit.publicar("inventario.stock.bajo", {
    productoId: producto.id,
    productoNombre: producto.nombre,
    bodegaId,
    stockActual: saldo,
    stockMinimo,
    // Solo si hay traslado sugerido
    sugerencia: sugerencia.tipo === "TRASLADO"
      ? { id: sugerencia.id, bodegaOrigenId: sugerencia.bodegaOrigenId, cantidad: sugerencia.cantidad }
      : null,
  });
}

module.exports = { revisar };
