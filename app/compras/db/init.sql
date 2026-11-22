-- Tablas de Compras (Entrega 2, sección 3.3). MySQL las crea la primera vez que arranca el contenedor.

-- Para que las tildes se guarden bien
SET NAMES utf8mb4;

CREATE TABLE proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nit VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(100),
  correo VARCHAR(150),
  telefono VARCHAR(40),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- bodega_id y sugerencia_id apuntan a Inventario; usuario_id apunta al Gateway (sin FK entre servicios, RNF02)
CREATE TABLE ordenes_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  proveedor_id INT NOT NULL,
  bodega_id INT NOT NULL,
  usuario_id INT NULL,
  estado ENUM('BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
  origen ENUM('MANUAL', 'SUGERIDA') NOT NULL DEFAULT 'MANUAL',
  total DECIMAL(14, 2) NOT NULL DEFAULT 0,
  fecha_esperada DATE NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sugerencia_id INT NULL UNIQUE,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- producto_id apunta a Catálogo; se guarda copia de producto_nombre para que la orden no dependa de Catálogo al consultarla
CREATE TABLE detalle_orden_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  producto_id INT NOT NULL,
  producto_nombre VARCHAR(150) NOT NULL,
  cantidad INT NOT NULL,
  cantidad_recibida INT NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id)
);

CREATE TABLE recepciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  usuario_id INT NULL,
  recibida_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id)
);

-- movimiento_id guarda el id de la ENTRADA generada en Inventario
CREATE TABLE detalle_recepcion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recepcion_id INT NOT NULL,
  detalle_orden_id INT NOT NULL,
  cantidad INT NOT NULL,
  movimiento_id INT NOT NULL,
  FOREIGN KEY (recepcion_id) REFERENCES recepciones(id),
  FOREIGN KEY (detalle_orden_id) REFERENCES detalle_orden_compra(id)
);

-- Datos de prueba: proveedores 1, 2 y 3 asociados a los productos de prueba en Catálogo
INSERT INTO proveedores (nit, nombre, contacto, correo, telefono) VALUES
  ('900123456-7', 'Distribuidora Andina de Tornillos S.A.S.', 'Carlos Ríos', 'ventas@andinatornillos.co', '3101234567'),
  ('900654321-0', 'Herramientas y Equipos del Eje S.A.', 'Marta Salazar', 'pedidos@herramientaseje.co', '3119876543'),
  ('890800111-2', 'Pinturas y Químicos de Caldas Ltda.', 'Jorge Mejía', 'comercial@pinturascaldas.co', '3125554433');
