const express = require("express");
const alertas = require("../controladores/alertas");

const router = express.Router();

router.get("/", alertas.listar);
router.get("/resumen", alertas.resumen);
router.get("/:id", alertas.consultar);
router.post("/:id/leer", alertas.leer);
router.post("/:id/atender", alertas.atender);

module.exports = router;
