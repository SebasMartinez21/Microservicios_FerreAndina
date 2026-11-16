const mysql = require("mysql2/promise");

// Pool de conexiones a la base de datos de Catálogo
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "catalogo",
});

module.exports = db;
