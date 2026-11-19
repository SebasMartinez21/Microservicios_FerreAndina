const express = require("express");
const categorias = require("../controladores/categorias");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", categorias.listar);
router.post("/", soloAdmin, categorias.crear);
router.get("/:id", categorias.consultar);
router.put("/:id", soloAdmin, categorias.actualizar);
router.delete("/:id", soloAdmin, categorias.darDeBaja);

module.exports = router;
