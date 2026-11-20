-- Tablas de Inventario. MySQL las crea la primera vez que arranca el contenedor.

-- Para que las tildes se guarden bien
SET NAMES utf8mb4;

CREATE TABLE bodegas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  ciudad VARCHAR(60) NOT NULL,
  direccion VARCHAR(150),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Una fila por producto y bodega. version sirve para el bloqueo optimista:
-- si dos movimientos leen el mismo saldo, solo el primero logra guardarlo.
-- producto_id apunta a Catálogo, por eso no tiene llave foránea
CREATE TABLE stock (
  producto_id INT NOT NULL,
  bodega_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, bodega_id),
  FOREIGN KEY (bodega_id) REFERENCES bodegas(id)
);

-- El kardex en cada movimiento guarda el saldo que dejó en cada bodega
CREATE TABLE movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave_idempotencia VARCHAR(100) NULL UNIQUE,
  tipo ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR') NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  bodega_origen_id INT NULL,
  bodega_destino_id INT NULL,
  saldo_origen INT NULL,
  saldo_destino INT NULL,
  motivo VARCHAR(255),
  referencia_tipo ENUM('ORDEN_COMPRA', 'FACTURA', 'SUGERENCIA') NULL,
  referencia_id VARCHAR(100) NULL,
  usuario_id INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bodega_origen_id) REFERENCES bodegas(id),
  FOREIGN KEY (bodega_destino_id) REFERENCES bodegas(id),
  INDEX (producto_id, fecha)
);

CREATE TABLE sugerencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('TRASLADO', 'COMPRA') NOT NULL,
  producto_id INT NOT NULL,
  bodega_destino_id INT NOT NULL,
  bodega_origen_id INT NULL,
  cantidad INT NOT NULL,
  estado ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'DERIVADA') NOT NULL,
  movimiento_id INT NULL,
  creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  atendida_en DATETIME NULL,
  FOREIGN KEY (bodega_destino_id) REFERENCES bodegas(id),
  FOREIGN KEY (bodega_origen_id) REFERENCES bodegas(id),
  FOREIGN KEY (movimiento_id) REFERENCES movimientos(id)
);

-- Datos de prueba: las tres sedes y los productos de prueba de Catálogo (ids 1 a 4)
INSERT INTO bodegas (codigo, nombre, ciudad, direccion) VALUES
  ('MZL-01', 'Bodega principal', 'Manizales', 'Carrera 23 #45-10'),
  ('PER-01', 'Bodega Pereira', 'Pereira', 'Avenida 30 de Agosto #20-15'),
  ('ARM-01', 'Bodega Armenia', 'Armenia', 'Calle 21 #18-30');

INSERT INTO stock (producto_id, bodega_id, cantidad, stock_minimo) VALUES
  (1, 1, 500, 100), (1, 2, 120, 100), (1, 3, 50, 40),  -- tornillo: Manizales tiene excedente
  (2, 1, 30, 10),   (2, 2, 12, 10),   (2, 3, 8, 5),    -- martillo
  (3, 1, 10, 5),    (3, 2, 6, 5),     (3, 3, 4, 3),    -- taladro
  (4, 1, 20, 15),   (4, 2, 15, 15),   (4, 3, 10, 10);  -- pintura: ninguna sede tiene excedente

-- El saldo inicial queda en el kardex como un ajuste, para que kardex y stock coincidan
INSERT INTO movimientos (tipo, producto_id, cantidad, bodega_origen_id, saldo_origen, motivo, usuario_id)
SELECT 'AJUSTE', producto_id, cantidad, bodega_id, cantidad, 'Inventario inicial', 1 FROM stock;
