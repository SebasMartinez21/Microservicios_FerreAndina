const Sugerencia = require("../modelos/sugerencia");
const servicio = require("../servicios/movimientos");
const { paginacion } = require("../paginacion");

const noExiste = (res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "La sugerencia no existe" });
const conflicto = (res, mensaje) => res.status(409).json({ codigo: "SUGERENCIA_NO_PENDIENTE", mensaje });

// GET /sugerencias-reabastecimiento?estado=
async function listar(req, res) {
  const { pagina, limite } = paginacion(req.query);
  const { total, datos } = await Sugerencia.listar({ estado: req.query.estado, pagina, limite });
  res.json({ pagina, limite, total, datos });
}

// POST /sugerencias-reabastecimiento/:id/aceptar: registra el traslado sugerido
async function aceptar(req, res) {
  const sugerencia = await Sugerencia.buscar(req.params.id);
  if (!sugerencia) return noExiste(res);
  if (sugerencia.tipo !== "TRASLADO") return conflicto(res, "Las sugerencias de compra las atiende Compras");
  if (sugerencia.estado !== "PENDIENTE") return conflicto(res, `La sugerencia ya está ${sugerencia.estado}`);

  const usuarioId = Number(req.headers["x-usuario-id"]) || null;
  const datos = {
    tipo: "TRASLADO",
    productoId: sugerencia.productoId,
    cantidad: sugerencia.cantidad,
    bodegaOrigenId: sugerencia.bodegaOrigenId,
    bodegaDestinoId: sugerencia.bodegaDestinoId,
    motivo: "Traslado sugerido por reabastecimiento",
    referencia: { tipo: "SUGERENCIA", id: String(sugerencia.id) },
  };
  // La clave evita que dos clics seguidos (o dos administradores) registren el traslado dos veces
  const { movimiento } = await servicio.registrar(datos, usuarioId, `sugerencia-${sugerencia.id}`);
  await Sugerencia.atender(sugerencia.id, "ACEPTADA", usuarioId, movimiento.id);
  res.json(movimiento);
}

async function rechazar(req, res) {
  const sugerencia = await Sugerencia.buscar(req.params.id);
  if (!sugerencia) return noExiste(res);

  const usuarioId = Number(req.headers["x-usuario-id"]) || null;
  if (!(await Sugerencia.atender(sugerencia.id, "RECHAZADA", usuarioId))) {
    return conflicto(res, `La sugerencia ya está ${sugerencia.estado}`);
  }
  res.json(await Sugerencia.buscar(sugerencia.id));
}

module.exports = { listar, aceptar, rechazar };
