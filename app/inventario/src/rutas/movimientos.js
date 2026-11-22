const express = require("express");
const movimientos = require("../controladores/movimientos");

const router = express.Router();

router.get("/", movimientos.listar);
router.post("/", movimientos.registrar);
router.get("/:id", movimientos.consultar);

module.exports = router;
