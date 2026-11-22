const express = require("express");
const sugerencias = require("../controladores/sugerencias");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", sugerencias.listar);
router.post("/:id/aceptar", soloAdmin, sugerencias.aceptar);
router.post("/:id/rechazar", soloAdmin, sugerencias.rechazar);

module.exports = router;
