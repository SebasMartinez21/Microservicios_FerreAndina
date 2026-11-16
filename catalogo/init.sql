-- Tablas de Catálogo. MySQL las crea la primera vez que arranca el contenedor.

CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  padre_id INT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (nombre, padre_id),
  FOREIGN KEY (padre_id) REFERENCES categorias(id)
);

CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  categoria_id INT NOT NULL,
  unidad_medida ENUM('UND', 'KG', 'M', 'LT', 'GAL', 'CAJA') NOT NULL,
  precio DECIMAL(12, 2) NOT NULL,
  costo_referencia DECIMAL(12, 2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX (nombre)
);

-- proveedor_id apunta al servicio de Compras, por eso no tiene llave foránea
CREATE TABLE producto_proveedor (
  producto_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Datos de prueba
INSERT INTO categorias (nombre, descripcion, padre_id) VALUES
  ('Herramientas', 'Herramientas manuales y eléctricas', NULL),
  ('Tornillería', 'Tornillos, tuercas y arandelas', NULL),
  ('Pinturas', 'Pinturas y solventes', NULL),
  ('Herramientas eléctricas', NULL, 1);

INSERT INTO productos (codigo, nombre, categoria_id, unidad_medida, precio, costo_referencia) VALUES
  ('TOR-HEX-014-2', 'Tornillo hexagonal 1/4 x 2 pulgadas', 2, 'UND', 450, 280),
  ('MAR-16OZ', 'Martillo de uña 16 oz', 1, 'UND', 32000, 21000),
  ('TAL-500W', 'Taladro percutor 500 W', 4, 'UND', 189000, 130000),
  ('PIN-BLA-GAL', 'Pintura blanca tipo 1', 3, 'GAL', 78000, 52000);

INSERT INTO producto_proveedor (producto_id, proveedor_id, es_principal) VALUES
  (1, 1, TRUE), (2, 1, TRUE), (3, 2, TRUE), (4, 3, TRUE);
