const express = require("express");
const c = require("../controladores/categorias");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", c.listar);
router.post("/", soloAdmin, c.crear);
router.get("/:id", c.consultar);
router.put("/:id", soloAdmin, c.actualizar);
router.delete("/:id", soloAdmin, c.darDeBaja);

module.exports = router;
