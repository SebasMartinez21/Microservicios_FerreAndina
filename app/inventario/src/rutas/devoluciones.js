const express = require("express");
const devoluciones = require("../controladores/devoluciones");

const router = express.Router();

router.get("/", devoluciones.listar);
router.post("/", devoluciones.registrar);

module.exports = router;
