# FerreAndina S.A.S. — Sistema de Gestión de Inventarios en Microservicios

Proyecto de aula de **Ingeniería de Software II** (Universidad Nacional de Colombia — Sede Manizales, 2026-2).
Sistema de gestión de inventarios multi-bodega (Manizales, Pereira y Armenia) para la distribuidora mayorista de ferretería **FerreAndina S.A.S.**, diseñado bajo una arquitectura de microservicios con persistencia políglota e independiente por servicio, comunicación híbrida (REST síncrono y eventos asíncronos con RabbitMQ) y un **API Gateway propio** como único punto de entrada.

### Equipo de Desarrollo

- **Luis Felipe Giraldo Ortega**
- **Steven López Parra**
- **Jhoan Sebastián Martínez Martínez**

---

## 1. Arquitectura del Sistema

Todas las peticiones externas ingresan únicamente por el **API Gateway** (`http://localhost:8000/api`), que valida el token JWT, verifica la lista de tokens revocados, comprueba los permisos por rol (`ADMIN` u `OPERADOR`) y enruta la solicitud al microservicio correspondiente inyectando las cabeceras de identidad (`X-Usuario-Id`, `X-Usuario-Email`, `X-Usuario-Rol` y `X-Gateway-Token`).

| Componente               | Tecnología          | Base de Datos | Responsabilidad Principal                                                                                                                       | Requerimientos                     |
| :----------------------- | :------------------- | :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------- |
| **API Gateway**    | Laravel 11 (PHP 8.2) | MySQL 8.0     | Punto único de entrada (proxy), autenticación JWT, gestión de usuarios, roles y recuperación de contraseña.                                | RF07, RF08, RNF07, RNF09           |
| **Catálogo**      | Node.js + Express    | MySQL 8.0     | Gestión de productos, categorías y subcategorías, búsqueda/filtrado, costo de referencia y asociación producto–proveedor.                 | RF01, RF02, RF12                   |
| **Inventario**     | Node.js + Express    | MySQL 8.0     | Gestión de bodegas, control de stock con bloqueo optimista (`version`), movimientos, kardex, devoluciones y sugerencias de reabastecimiento. | RF04, RF05, RF10, RF13, RF15, RF16 |
| **Compras**        | Node.js + Express    | MySQL 8.0     | Gestión de proveedores, órdenes de compra (manuales y sugeridas en borrador) y recepción parcial o total de mercancía.                      | RF03, RF06, RF16                   |
| **Notificaciones** | Node.js + Express    | MongoDB 7     | Alertas de stock bajo, traslados sugeridos y órdenes sugeridas (en interfaz y por correo con reintentos) y preferencias por usuario.           | RF09, RF16                         |
| **Reportes**       | Node.js + Express    | MongoDB 7     | Modelo de lectura alimentado por eventos: existencias actuales, valorización del inventario, rotación y panel de indicadores (dashboard).     | RF11, RF14                         |
| **RabbitMQ**       | RabbitMQ 3           | —            | Broker de mensajería asíncrona (exchange tipo *topic* `ferreandina.events` con colas durables e idempotencia en consumidores).            | RNF01                              |

### Comunicación entre Microservicios

- **Llamadas REST internas (síncronas, cuando se requiere la respuesta inmediata para continuar):**

  1. `Compras → Catálogo`: valida que el producto exista y esté activo, y obtiene su proveedor y costo de referencia.
  2. `Inventario → Catálogo`: valida que el producto exista y esté activo, y obtiene código, nombre, categoría y costo de referencia.
  3. `Compras → Inventario`: registra un movimiento de tipo `ENTRADA` (`POST /movimientos`) por cada línea recibida, enviando una cabecera `Idempotency-Key` determinista para evitar entradas duplicadas ante reintentos.
- **Eventos asíncronos por RabbitMQ (exchange `ferreandina.events`):**

  1. `inventario.movimiento.registrado` (**Inventario → Reportes**): actualiza saldos en `existencias` y registra el histórico en `movimientos_resumen`.
  2. `inventario.stock.bajo` (**Inventario → Notificaciones**): genera alerta de stock bajo (o de traslado sugerido si otra sede tiene excedente) y envía correos a los suscriptores de la bodega.
  3. `inventario.reabastecimiento.requerido` (**Inventario → Compras**): cuando el stock cruza el mínimo y ninguna otra sede tiene excedente, solicita generar una orden de compra sugerida.
  4. `compras.orden.sugerida` (**Compras → Notificaciones**): notifica que se creó una orden de compra en estado `BORRADOR` lista para revisión y aprobación del administrador.
  5. `catalogo.producto.actualizado` (**Catálogo → Reportes**): actualiza nombre, categoría, costo de referencia y valorización en la base de lectura de Reportes.

---

## 2. Estructura del Repositorio

```text
Microservicios_FerreAndina/
├── app/
│   ├── docker-compose.yml       # Orquestación local (6 servicios + 6 BDs + RabbitMQ)
│   ├── gateway/                 # API Gateway + Autenticación y Usuarios (Laravel + MySQL)
│   ├── catalogo/                # Microservicio de Catálogo (Express + MySQL)
│   ├── inventario/              # Microservicio de Inventario (Express + MySQL)
│   ├── compras/                 # Microservicio de Compras (Express + MySQL)
│   ├── notificaciones/          # Microservicio de Notificaciones (Express + MongoDB)
│   └── reportes/                # Microservicio de Reportes (Express + MongoDB)
├── docs/
│   ├── entrega-1/               # Investigación del estado del arte y requerimientos (RF y RNF)
│   ├── entrega-2/               # Diagrama de arquitectura, modelos ER y diseño de eventos
│   └── contratos-api/           # 6 contratos OpenAPI 3.0.3 validados (*-openapi.yaml)
└── pruebas-rendimiento/         # Suites de 15 pruebas de rendimiento en Locust por integrante
    ├── felipe/                  # Pruebas de API Gateway y Catálogo
    ├── steven/                  # Pruebas de Inventario
    └── sebas/                   # Pruebas de Compras, Notificaciones y Reportes
```

---

## 3. Cómo Ejecutar el Sistema (Entorno Local con Docker)

Requisito único: tener **Docker** y **Docker Compose** instalados.

Desde la carpeta `app/`:

```bash
cd app
docker compose up --build
```

> **Nota:** Si se actualizaron esquemas de base de datos (`init.sql` o migraciones) y ya existían contenedores previos, recrear los volúmenes con:
>
> ```bash
> docker compose down -v
> docker compose up --build
> ```

### Accesos y Documentación Interactiva (Swagger UI)

Solo el **API Gateway** expone su puerto (`8000`) hacia el exterior; todos los microservicios y bases de datos corren aislados en la red interna de Docker.

- **Punto de entrada de la API (Gateway):** `http://localhost:8000/api`
- **Swagger UI — API Gateway:** `http://localhost:8000/api/docs`
- **Swagger UI — Catálogo:** `http://localhost:8000/api/catalogo/api-docs`
- **Swagger UI — Inventario:** `http://localhost:8000/api/inventario/api-docs`
- **Swagger UI — Compras:** `http://localhost:8000/api/compras/api-docs`
- **Swagger UI — Notificaciones:** `http://localhost:8000/api/notificaciones/api-docs`
- **Swagger UI — Reportes:** `http://localhost:8000/api/reportes/api-docs`
- **Panel de administración de RabbitMQ:** `http://localhost:15672` (usuario: `guest` / contraseña: `guest`)

---

## 4. Usuarios y Datos de Prueba Iniciales

Al levantar el sistema se cargan automáticamente usuarios, roles, categorías, productos, proveedores, las 3 bodegas (Manizales, Pereira y Armenia), saldos iniciales, suscripciones y existencias de reporte:

| Rol          | Correo (`email`)           | Contraseña (`password`) | Permisos                                                                                                                   |
| :----------- | :--------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN`    | `admin@ferreandina.com`    | `admin1234`              | Acceso total (gestión de usuarios, catálogo, bodegas, proveedores, órdenes, sugerencias y reportes).                    |
| `OPERADOR` | `operador@ferreandina.com` | `operador1234`           | Operación de bodega (consulta de catálogo/stock/órdenes, registro de movimientos, devoluciones, recepciones y alertas). |

### Ejemplo rápido de uso

1. **Iniciar sesión y obtener el token JWT:**

   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@ferreandina.com", "password": "admin1234"}'
   ```
2. **Consultar endpoints a través del Gateway (reemplazar `<TOKEN>`):**

   ```bash
   # Catálogo de productos
   curl http://localhost:8000/api/catalogo/productos -H "Authorization: Bearer <TOKEN>"

   # Stock del producto 1 en todas las bodegas
   curl http://localhost:8000/api/inventario/stock/1 -H "Authorization: Bearer <TOKEN>"

   # Proveedores registrados en Compras
   curl http://localhost:8000/api/compras/proveedores -H "Authorization: Bearer <TOKEN>"

   # Alertas y notificaciones
   curl http://localhost:8000/api/notificaciones/alertas -H "Authorization: Bearer <TOKEN>"

   # Panel de indicadores ejecutivos (solo ADMIN)
   curl http://localhost:8000/api/reportes/indicadores -H "Authorization: Bearer <TOKEN>"
   ```
