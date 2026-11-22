const Reporte = require("../modelos/reporte");
const { paginacion } = require("../paginacion");

// GET /reportes/existencias?bodegaId=&categoria=&q=&bajoMinimo=&pagina=&limite=
async function existencias(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const { total, datos } = await Reporte.listarExistencias({
    bodegaId: req.query.bodegaId,
    categoria: req.query.categoria,
    q: req.query.q,
    bajoMinimo: req.query.bajoMinimo === "true",
    pagina,
    limite,
  });
  res.json({ pagina, limite, total, datos });
}

// GET /reportes/valorizacion?agruparPor=BODEGA|CATEGORIA&bodegaId=
async function valorizacion(req, res) {
  const agruparPor = req.query.agruparPor || "BODEGA";
  if (!["BODEGA", "CATEGORIA"].includes(agruparPor)) {
    return res.status(400).json({
      codigo: "DATOS_INVALIDOS",
      mensaje: "agruparPor debe ser BODEGA o CATEGORIA",
    });
  }
  res.json(await Reporte.calcularValorizacion({ agruparPor, bodegaId: req.query.bodegaId }));
}

// GET /reportes/rotacion?desde=&hasta=&bodegaId=&orden=MAYOR|MENOR&limite=
async function rotacion(req, res) {
  const { desde, hasta, bodegaId } = req.query;
  const orden = req.query.orden || "MAYOR";
  if (!["MAYOR", "MENOR"].includes(orden)) {
    return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "orden debe ser MAYOR o MENOR" });
  }
  if (desde && hasta && desde > hasta) {
    return res.status(400).json({
      codigo: "RANGO_FECHAS_INVALIDO",
      mensaje: "La fecha inicial no puede ser posterior a la final",
    });
  }
  const limite = Math.min(Math.max(parseInt(req.query.limite) || 10, 1), 100);
  res.json(await Reporte.calcularRotacion({ desde, hasta, bodegaId, orden, limite }));
}

// GET /indicadores?bodegaId=&dias=
async function indicadores(req, res) {
  const dias = Math.min(Math.max(parseInt(req.query.dias) || 30, 1), 365);
  res.json(await Reporte.calcularIndicadores({ bodegaId: req.query.bodegaId, dias }));
}

module.exports = { existencias, valorizacion, rotacion, indicadores };
