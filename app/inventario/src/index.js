const express = require("express");
const path = require("path");

const rabbit = require("./config/rabbit");
const { validarToken } = require("./middlewares/auth");
const { ErrorHttp } = require("./errores");

const app = express();
app.use(express.json());

// Documentación de la API (Swagger). Se ve desde el gateway en /api/inventario/api-docs
app.get("/api-docs", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>API de Inventario - FerreAndina</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: "/api/inventario/api-docs/openapi.yaml", dom_id: "#swagger" });</script>
</body>
</html>`);
});
app.get("/api-docs/openapi.yaml", (req, res) => res.sendFile(path.join(__dirname, "..", "openapi.yaml")));

app.use(validarToken);

app.get("/health", (req, res) => res.json({ estado: "ok" }));
app.use("/bodegas", require("./rutas/bodegas"));
app.get("/stock/:productoId", require("./controladores/stock").deProducto);
app.use("/movimientos", require("./rutas/movimientos"));
app.get("/kardex", require("./controladores/movimientos").kardex);
app.use("/devoluciones", require("./rutas/devoluciones"));
app.use("/sugerencias-reabastecimiento", require("./rutas/sugerencias"));

// Ruta que no existe
app.use((req, res) => res.status(404).json({ codigo: "NO_ENCONTRADO", mensaje: "Ruta no encontrada" }));

// Cualquier error no controlado
// Los ErrorHttp (stock insuficiente, Catálogo caído...) responden con su propio código
app.use((error, req, res, next) => {
  if (error instanceof ErrorHttp) return res.status(error.estado).json({ codigo: error.codigo, mensaje: error.message });
  // JSON mal escrito en el cuerpo de la petición
  if (error.type === "entity.parse.failed") return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "El cuerpo no es un JSON válido" });
  console.log(error);
  res.status(500).json({ codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log("Inventario escuchando en el puerto " + PUERTO));
rabbit.conectar();
