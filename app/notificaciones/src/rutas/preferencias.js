const express = require("express");
const preferencias = require("../controladores/preferencias");

const router = express.Router();

router.get("/", preferencias.consultar);
router.put("/", preferencias.guardar);

module.exports = router;
