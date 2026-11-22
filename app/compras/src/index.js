const express = require("express");
const path = require("path");

const reabastecimiento = require("./servicios/reabastecimiento");
const { validarToken } = require("./middlewares/auth");
const { ErrorHttp } = require("./errores");

const app = express();
app.use(express.json());

// Documentación de la API (Swagger). Se ve desde el gateway en /api/compras/api-docs
app.get("/api-docs", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>API de Compras - FerreAndina</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: "/api/compras/api-docs/openapi.yaml", dom_id: "#swagger" });</script>
</body>
</html>`);
});
app.get("/api-docs/openapi.yaml", (req, res) => res.sendFile(path.join(__dirname, "..", "openapi.yaml")));

app.use(validarToken);

app.get("/health", (req, res) => res.json({ estado: "ok" }));
app.use("/proveedores", require("./rutas/proveedores"));
app.use("/ordenes-compra", require("./rutas/ordenesCompra"));

// Ruta que no existe
app.use((req, res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "Ruta no encontrada" }));

// Cualquier error no controlado
app.use((error, req, res, next) => {
  if (error instanceof ErrorHttp) return res.status(error.estado).json({ codigo: error.codigo, mensaje: error.message });
  if (error.type === "entity.parse.failed") return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "El cuerpo no es un JSON válido" });
  console.log(error);
  res.status(500).json({ codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log("Compras escuchando en el puerto " + PUERTO));
reabastecimiento.iniciar();
