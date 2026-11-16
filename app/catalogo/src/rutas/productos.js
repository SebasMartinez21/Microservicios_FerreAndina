const express = require("express");
const c = require("../controladores/productos");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", c.listar);
router.post("/", soloAdmin, c.crear);
router.get("/:id", c.consultar);
router.put("/:id", soloAdmin, c.actualizar);
router.delete("/:id", soloAdmin, c.darDeBaja);

router.get("/:id/proveedores", c.listarProveedores);
router.post("/:id/proveedores", soloAdmin, c.asociarProveedor);
router.put("/:id/proveedores/:proveedorId", soloAdmin, c.marcarPrincipal);
router.delete("/:id/proveedores/:proveedorId", soloAdmin, c.quitarProveedor);

module.exports = router;
