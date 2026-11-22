const express = require("express");
const proveedores = require("../controladores/proveedores");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", proveedores.listar);
router.post("/", soloAdmin, proveedores.crear);
router.get("/:id", proveedores.consultar);
router.put("/:id", soloAdmin, proveedores.actualizar);
router.delete("/:id", soloAdmin, proveedores.darDeBaja);

module.exports = router;
