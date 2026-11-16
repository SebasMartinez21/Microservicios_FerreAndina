const express = require("express");
const fs = require("fs");
const YAML = require("yaml");
const swaggerUi = require("swagger-ui-express");

const rabbit = require("./config/rabbit");
const { validarToken } = require("./middlewares/auth");

const app = express();
app.use(express.json());

// Documentación de la API en /api-docs
const contrato = YAML.parse(fs.readFileSync(__dirname + "/../openapi.yaml", "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(contrato));

app.use(validarToken);

app.get("/health", (req, res) => res.json({ estado: "ok" }));
app.use("/productos", require("./rutas/productos"));
app.use("/categorias", require("./rutas/categorias"));

// Ruta que no existe
app.use((req, res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "Ruta no encontrada" }));

// Cualquier error no controlado
app.use((error, req, res, next) => {
  console.log(error);
  res.status(500).json({ codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log("Catálogo escuchando en el puerto " + PUERTO));
rabbit.conectar();
