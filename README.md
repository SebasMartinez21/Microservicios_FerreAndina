# FerreAndina: Sistema de Gestión de Inventarios

Proyecto de aula de Ingeniería de Software II (UNAL Manizales, 2026-2). Es un sistema de inventarios con
microservicios. Todas las peticiones entran por un API Gateway hecho por nosotros.

## Estructura

```
app/                      código del sistema
  docker-compose.yml      levanta todo junto
  gateway/                API Gateway (Laravel + Sanctum): login, usuarios, roles y reenvío a los servicios
  catalogo/               microservicio de Catálogo (Express + MySQL)
    db/init.sql           tablas y datos de prueba
    src/
      index.js            arranque del servidor
      config/             conexión a MySQL y a RabbitMQ
      middlewares/        token del gateway y permisos por rol
      rutas/              qué controlador atiende cada endpoint
      controladores/      validan los datos y arman la respuesta
      modelos/            consultas SQL
docs/
  entrega-1/              investigación y requerimientos
  entrega-2/              diseño, diagramas y modelo de datos
  contratos-api/          contratos OpenAPI de cada servicio
```

## Cómo correrlo

Hace falta Docker. Desde la carpeta `app/`:

```
docker compose up --build
```

- Gateway: http://localhost:8000/api
- Swagger del gateway: http://localhost:8000/api/docs
- Swagger de Catálogo: http://localhost:8000/api/catalogo/api-docs
- Panel de RabbitMQ: http://localhost:15672 (guest / guest)

Usuarios de prueba: `admin@ferreandina.com` / `admin1234` y `operador@ferreandina.com` / `operador1234`.

```
POST /api/auth/login   { "email": "admin@ferreandina.com", "password": "admin1234" }
GET  /api/catalogo/productos   (con la cabecera Authorization: Bearer <token>)
```

## Agregar un microservicio

Copiar la carpeta `app/catalogo` y cambiarle el nombre. Después se agrega en `docker-compose.yml` un bloque
para el servicio y otro para su base de datos, igual a `catalogo` y `catalogo-db`. El gateway ya reenvía
`/api/inventario`, `/api/compras`, `/api/notificaciones` y `/api/reportes` a `http://<servicio>:3000`.
