const express = require("express");
const bodegas = require("../controladores/bodegas");
const stock = require("../controladores/stock");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", bodegas.listar);
router.post("/", soloAdmin, bodegas.crear);
router.get("/:id", bodegas.consultar);
router.put("/:id", soloAdmin, bodegas.actualizar);
router.delete("/:id", soloAdmin, bodegas.darDeBaja);

router.get("/:id/stock", stock.deBodega);
router.put("/:id/stock/:productoId/minimo", soloAdmin, stock.fijarMinimo);

module.exports = router;
