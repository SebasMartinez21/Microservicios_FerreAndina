const express = require("express");
const ordenes = require("../controladores/ordenesCompra");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", ordenes.listar);
router.post("/", soloAdmin, ordenes.crear);
router.get("/:id", ordenes.consultar);
router.put("/:id", soloAdmin, ordenes.actualizar);
router.post("/:id/enviar", soloAdmin, ordenes.enviar);
router.post("/:id/cancelar", soloAdmin, ordenes.cancelar);
router.get("/:id/recepciones", ordenes.listarRecepciones);
router.post("/:id/recepciones", ordenes.recibirMercancia);

module.exports = router;
