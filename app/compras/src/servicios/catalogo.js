const { ErrorHttp } = require("../errores");

// Llamada directa a Catálogo (①): valida el producto y obtiene su proveedor y costo de referencia.
// Va sin pasar por el gateway, pero con el mismo token interno.
const CATALOGO_URL = process.env.CATALOGO_URL || "http://catalogo:3000";

async function buscarProducto(productoId) {
  let respuesta;
  try {
    respuesta = await fetch(`${CATALOGO_URL}/productos/${productoId}`, {
      headers: { "X-Gateway-Token": process.env.GATEWAY_TOKEN },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new ErrorHttp(503, "CATALOGO_NO_DISPONIBLE", "No se pudo validar el producto: Catálogo no responde");
  }

  if (respuesta.status === 404) throw new ErrorHttp(400, "DATOS_INVALIDOS", `El producto ${productoId} no existe`);
  if (!respuesta.ok) throw new ErrorHttp(503, "CATALOGO_NO_DISPONIBLE", "Catálogo respondió con error");
  return respuesta.json();
}

// Exige que el producto exista y esté activo (Compras no crea órdenes de productos dados de baja)
async function buscarProductoActivo(productoId) {
  const producto = await buscarProducto(productoId);
  if (!producto.activo) throw new ErrorHttp(400, "DATOS_INVALIDOS", `El producto ${productoId} está dado de baja`);
  return producto;
}

module.exports = { buscarProducto, buscarProductoActivo };
