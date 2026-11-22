# FerreAndina: Sistema de Gestión de Inventarios

Proyecto de aula de Ingeniería de Software II (UNAL Manizales, 2026-2). Es un sistema de inventarios con
microservicios. Todas las peticiones entran por un API Gateway hecho por nosotros.

## Estructura

```
app/                      código del sistema
  docker-compose.yml      levanta todo junto
  gateway/                API Gateway (Laravel + JWT): login, usuarios, roles y reenvío a los servicios
  catalogo/               microservicio de Catálogo (Express + MySQL)
    db/init.sql           tablas y datos de prueba
    src/
      index.js            arranque del servidor
      config/             conexión a MySQL y a RabbitMQ
      middlewares/        token del gateway y permisos por rol
      rutas/              qué controlador atiende cada endpoint
      controladores/      validan los datos y arman la respuesta
      modelos/            consultas SQL
  inventario/             microservicio de Inventario (Express + MySQL), misma estructura que catalogo
    src/servicios/        lógica que no es de un solo endpoint: registrar movimientos,
                          reabastecimiento entre sedes (RF16) y la llamada a Catálogo
docs/
  entrega-1/              investigación y requerimientos
  entrega-2/              diseño, diagramas y modelo de datos
  contratos-api/          contratos OpenAPI de cada servicio
pruebas-rendimiento/      las 15 pruebas de Locust de cada integrante, una carpeta por persona
```

## Cómo correrlo

Hace falta Docker. Desde la carpeta `app/`:

```
docker compose up --build
```

- Gateway: http://localhost:8000/api
- Swagger del gateway: http://localhost:8000/api/docs
- Swagger de Catálogo: http://localhost:8000/api/catalogo/api-docs
- Swagger de Inventario: http://localhost:8000/api/inventario/api-docs
- Panel de RabbitMQ: http://localhost:15672 (guest / guest)

Usuarios de prueba: `admin@ferreandina.com` / `admin1234` y `operador@ferreandina.com` / `operador1234`.

```
POST /api/auth/login   { "email": "admin@ferreandina.com", "password": "admin1234" }
GET  /api/catalogo/productos   (con la cabecera Authorization: Bearer <token>)
```

### Probar Inventario

Trae datos de prueba: las bodegas de Manizales (1), Pereira (2) y Armenia (3), con stock de los productos 1 a 4
de Catálogo. Con el token de ADMIN:

```
GET  /api/inventario/stock/1                       stock del producto en cada bodega
POST /api/inventario/movimientos                   { "tipo": "SALIDA", "productoId": 1, "cantidad": 30, "bodegaOrigenId": 2 }
GET  /api/inventario/sugerencias-reabastecimiento  la salida dejó Pereira bajo el mínimo: sugiere traer 110 desde Manizales
GET  /api/inventario/kardex?productoId=1&bodegaId=2
```

Para ver los eventos que publica Inventario, crear en el panel de RabbitMQ una cola enlazada al exchange
`ferreandina.events` con la clave `inventario.#` y leerla con **Get messages**. Para volver a los datos
iniciales: `docker compose down -v`.

## Agregar un microservicio

Copiar la carpeta `app/catalogo` y cambiarle el nombre. Después se agrega en `docker-compose.yml` un bloque
para el servicio y otro para su base de datos, igual a `catalogo` y `catalogo-db`. El gateway ya reenvía
`/api/inventario`, `/api/compras`, `/api/notificaciones` y `/api/reportes` a `http://<servicio>:3000`.
