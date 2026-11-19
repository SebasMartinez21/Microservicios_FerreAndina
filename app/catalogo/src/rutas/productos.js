const express = require("express");
const productos = require("../controladores/productos");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", productos.listar);
router.post("/", soloAdmin, productos.crear);
router.get("/:id", productos.consultar);
router.put("/:id", soloAdmin, productos.actualizar);
router.delete("/:id", soloAdmin, productos.darDeBaja);

router.get("/:id/proveedores", productos.listarProveedores);
router.post("/:id/proveedores", soloAdmin, productos.asociarProveedor);
router.put("/:id/proveedores/:proveedorId", soloAdmin, productos.marcarPrincipal);
router.delete("/:id/proveedores/:proveedorId", soloAdmin, productos.quitarProveedor);

module.exports = router;
