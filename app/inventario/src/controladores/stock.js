const Bodega = require("../modelos/bodega");
const Stock = require("../modelos/stock");
const catalogo = require("../servicios/catalogo");
const { paginacion } = require("../paginacion");

const bodegaNoExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La bodega no existe" });

// GET /bodegas/:id/stock?bajoMinimo=true
async function deBodega(req, res) {
  if (!(await Bodega.buscar(req.params.id))) return bodegaNoExiste(res);
  const { pagina, limite } = paginacion(req.query);
  const { total, datos } = await Stock.listarPorBodega({
    bodegaId: req.params.id,
    bajoMinimo: req.query.bajoMinimo === "true",
    pagina,
    limite,
  });
  res.json({ pagina, limite, total, datos });
}

// PUT /bodegas/:id/stock/:productoId/minimo  (RF09)
async function fijarMinimo(req, res) {
  const { stockMinimo } = req.body;
  if (!Number.isInteger(stockMinimo) || stockMinimo < 0) {
    return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "stockMinimo debe ser un entero mayor o igual a cero" });
  }
  if (!(await Bodega.buscar(req.params.id))) return bodegaNoExiste(res);
  await catalogo.buscarProducto(req.params.productoId); // 404 si el producto no existe en Catálogo

  res.json(await Stock.fijarMinimo(req.params.productoId, req.params.id, stockMinimo));
}

// GET /stock/:productoId  (RF05, RF15): stock del producto en cada bodega y el total
async function deProducto(req, res) {
  const productoId = Number(req.params.productoId);
  const bodegas = await Stock.listarPorProducto(productoId);

  // Sin filas puede ser un producto que aún no tiene stock, o uno que no existe: se pregunta a Catálogo
  if (bodegas.length === 0) await catalogo.buscarProducto(productoId);

  const total = bodegas.reduce((suma, s) => suma + s.cantidad, 0);
  res.json({ productoId, total, bodegas });
}

module.exports = { deBodega, fijarMinimo, deProducto };
