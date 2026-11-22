const rabbit = require("../config/rabbit");
const Reporte = require("../modelos/reporte");

// Consumidor de inventario.movimiento.registrado y catalogo.producto.actualizado (RF11, RF14)

async function procesarEvento(evento, clave) {
  if (clave === "inventario.movimiento.registrado") {
    await Reporte.registrarMovimiento(evento);
  } else if (clave === "catalogo.producto.actualizado") {
    await Reporte.actualizarProducto(evento);
  }
}

async function iniciar() {
  await rabbit.conectar();
  await rabbit.escuchar(
    "reportes.q",
    ["inventario.movimiento.registrado", "catalogo.producto.actualizado"],
    procesarEvento
  );
}

module.exports = { iniciar, procesarEvento };
