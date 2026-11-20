const { ErrorHttp } = require("../errores");

// Llamada directa a Catálogo (②): valida el producto y trae sus datos.
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

  if (respuesta.status === 404) throw new ErrorHttp(404, "PRODUCTO_NO_EXISTE", "El producto no existe");
  if (!respuesta.ok) throw new ErrorHttp(503, "CATALOGO_NO_DISPONIBLE", "Catálogo respondió con error");
  return respuesta.json();
}

// Igual que buscarProducto, pero además exige que esté activo
async function buscarProductoActivo(productoId) {
  const producto = await buscarProducto(productoId);
  if (!producto.activo) throw new ErrorHttp(400, "PRODUCTO_INACTIVO", "El producto está dado de baja");
  return producto;
}

module.exports = { buscarProducto, buscarProductoActivo };
