const Producto = require("../modelos/producto");
const rabbit = require("../config/rabbit");

const noExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "El producto no existe" });
const invalido = (res, mensaje) => res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje });

const UNIDADES = ["UND", "KG", "M", "LT", "GAL", "CAJA"];

function validar(body) {
  const { nombre, categoriaId, unidadMedida, precio, costoReferencia } = body;
  if (!nombre || !categoriaId || !unidadMedida || precio == null || costoReferencia == null) {
    return "Faltan datos: nombre, categoriaId, unidadMedida, precio y costoReferencia son obligatorios";
  }
  if (!UNIDADES.includes(unidadMedida)) return "Unidad de medida inválida";
  if (precio < 0 || costoReferencia < 0) return "El precio y el costo no pueden ser negativos";
  return null;
}

// Avisa a Reportes que el producto cambió
function avisarCambio(producto) {
  rabbit.publicar("catalogo.producto.actualizado", {
    productoId: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    categoria: producto.categoria,
    costoReferencia: producto.costoReferencia,
    activo: producto.activo,
    actualizadoEn: producto.actualizadoEn,
  });
}

// GET /productos?q=&codigo=&categoriaId=&proveedorId=&activo=&pagina=&limite=
async function listar(req, res) {
  const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
  const limite = Math.min(Math.max(parseInt(req.query.limite) || 20, 1), 100);

  const { total, datos } = await Producto.listar({
    q: req.query.q,
    codigo: req.query.codigo,
    categoriaId: req.query.categoriaId,
    incluirSubcategorias: req.query.incluirSubcategorias !== "false",
    proveedorId: req.query.proveedorId,
    activo: req.query.activo !== "false",
    pagina,
    limite,
  });
  res.json({ pagina, limite, total, datos });
}

async function consultar(req, res) {
  const producto = await Producto.buscar(req.params.id);
  if (!producto) return noExiste(res);
  res.json(producto);
}

async function crear(req, res) {
  const error = validar(req.body) || (!req.body.codigo && "El código es obligatorio");
  if (error) return invalido(res, error);

  try {
    const producto = await Producto.crear(req.body);
    avisarCambio(producto);
    res.status(201).json(producto);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ codigo: "CODIGO_DUPLICADO", mensaje: "Ya existe un producto con ese código" });
    if (error.code === "ER_NO_REFERENCED_ROW_2") return invalido(res, "La categoría no existe");
    throw error;
  }
}

async function actualizar(req, res) {
  const error = validar(req.body);
  if (error) return invalido(res, error);

  try {
    const producto = await Producto.actualizar(req.params.id, req.body);
    if (!producto) return noExiste(res);
    avisarCambio(producto);
    res.json(producto);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return invalido(res, "La categoría no existe");
    throw error;
  }
}

// Baja lógica
async function darDeBaja(req, res) {
  const producto = await Producto.darDeBaja(req.params.id);
  if (!producto) return noExiste(res);
  avisarCambio(producto);
  res.status(204).send();
}

// ----- Proveedores del producto (Compras los consulta al crear una orden) -----

async function listarProveedores(req, res) {
  const producto = await Producto.buscar(req.params.id);
  if (!producto) return noExiste(res);
  res.json(producto.proveedores);
}

async function asociarProveedor(req, res) {
  const { proveedorId } = req.body;
  if (!proveedorId) return invalido(res, "proveedorId es obligatorio");

  const producto = await Producto.buscar(req.params.id);
  if (!producto) return noExiste(res);

  // Si es el primer proveedor del producto, queda como principal
  const esPrincipal = producto.proveedores.length === 0 || !!req.body.esPrincipal;
  try {
    await Producto.asociarProveedor(req.params.id, proveedorId, esPrincipal);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ codigo: "YA_ASOCIADO", mensaje: "El proveedor ya está asociado a este producto" });
    throw error;
  }
  res.status(201).json({ proveedorId, esPrincipal });
}

async function marcarPrincipal(req, res) {
  const esPrincipal = !!req.body.esPrincipal;
  const ok = await Producto.marcarPrincipal(req.params.id, req.params.proveedorId, esPrincipal);
  if (!ok) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La asociación no existe" });
  res.json({ proveedorId: Number(req.params.proveedorId), esPrincipal });
}

async function quitarProveedor(req, res) {
  const ok = await Producto.quitarProveedor(req.params.id, req.params.proveedorId);
  if (!ok) return res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La asociación no existe" });
  res.status(204).send();
}

module.exports = {
  listar, consultar, crear, actualizar, darDeBaja,
  listarProveedores, asociarProveedor, marcarPrincipal, quitarProveedor,
};
