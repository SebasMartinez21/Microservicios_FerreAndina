const express = require("express");
const reportes = require("../controladores/reportes");
const { soloAdmin } = require("../middlewares/auth");

const router = express.Router();

router.use(soloAdmin);
router.get("/existencias", reportes.existencias);
router.get("/valorizacion", reportes.valorizacion);
router.get("/rotacion", reportes.rotacion);

module.exports = router;
