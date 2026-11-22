const rabbit = require("../config/rabbit");
const catalogo = require("./catalogo");
const Proveedor = require("../modelos/proveedor");
const OrdenCompra = require("../modelos/ordenCompra");

// Consumidor del evento inventario.reabastecimiento.requerido (RF16).
// Cuando ninguna bodega tiene excedente, Inventario pide una orden sugerida en BORRADOR.
// El campo sugerencia_id es UNIQUE en ordenes_compra, así un evento repetido se rechaza y se ignora.

async function procesarReabastecimiento(evento) {
  const { sugerenciaId, productoId, bodegaDestinoId, cantidad } = evento;
  if (!sugerenciaId || !productoId || !bodegaDestinoId || !cantidad) {
    return console.log("Evento de reabastecimiento incompleto:", evento);
  }

  let producto;
  try {
    producto = await catalogo.buscarProductoActivo(productoId);
  } catch (error) {
    return console.log(`No se pudo crear orden sugerida para producto ${productoId}: ${error.message}`);
  }

  const proveedores = producto.proveedores || [];
  if (proveedores.length === 0) {
    return console.log(`El producto ${productoId} no tiene proveedor asociado en Catálogo; no se crea la orden sugerida`);
  }

  const asociado = proveedores.find((p) => p.esPrincipal) || proveedores[0];
  const proveedor = await Proveedor.buscar(asociado.proveedorId);
  if (!proveedor || !proveedor.activo) {
    return console.log(`El proveedor ${asociado.proveedorId} del producto ${productoId} no existe o está inactivo`);
  }

  const orden = await OrdenCompra.crear({
    proveedorId: proveedor.id,
    bodegaId: bodegaDestinoId,
    usuarioId: null,
    origen: "SUGERIDA",
    sugerenciaId,
    lineas: [
      {
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidad,
        costoUnitario: Number(producto.costoReferencia),
      },
    ],
  });

  rabbit.publicar("compras.orden.sugerida", {
    ordenId: orden.id,
    numero: orden.numero,
    productoId: producto.id,
    productoNombre: producto.nombre,
    proveedorId: proveedor.id,
    bodegaId: bodegaDestinoId,
    cantidad,
  });
}

async function iniciar() {
  await rabbit.conectar();
  await rabbit.escuchar("compras.q", "inventario.reabastecimiento.requerido", procesarReabastecimiento);
}

module.exports = { iniciar, procesarReabastecimiento };
