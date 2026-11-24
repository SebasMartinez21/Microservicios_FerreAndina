# Pruebas de rendimiento: Jhoan Sebastián Martínez (Compras, Notificaciones y Reportes)

Son 15 pruebas con [Locust](https://locust.io/): cinco endpoints de los microservicios de **Compras** (MySQL),
**Notificaciones** (MongoDB) y **Reportes** (MongoDB), cada uno en tres escenarios.
Todas pasan por el API Gateway, como cualquier cliente real (RNF09). Miden las consultas sobre MySQL y MongoDB,
las agregaciones del dashboard de indicadores y la creación de órdenes de compra (que además llama a Catálogo por REST).

**Métricas:** tiempo de respuesta (promedio y percentil 95), peticiones por segundo y tasa de error.
Una petición cuenta como error si no devuelve el código esperado o si tarda más de 2 s (RNF06).

**Escenarios:** los mismos de todo el equipo para poder comparar resultados.
Carga normal = 20 usuarios (los 15 internos con margen). Carga pico = 100. Estrés = 300.

**Nota:** se inicia sesión una sola vez al empezar y todos los usuarios simulados comparten el token JWT.
Así se mide el desempeño real de Compras, Notificaciones y Reportes a través del Gateway, y no el costo de `bcrypt` del login.

## Cómo correrlas

1. Levantar el sistema con datos limpios (en `app/`):
   ```bash
   docker compose down -v
   docker compose up --build -d
   ```
2. Instalar Locust en un entorno virtual:
   - En **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     pip install -r requirements.txt
     ```
   - En **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     pip install -r requirements.txt
     ```
3. Correr las 15 pruebas en orden (unos 20 minutos):
   - En **Windows (PowerShell)**:
     ```powershell
     .\correr_todas.ps1
     ```
   - En **Linux / Git Bash**:
     ```bash
     ./correr_todas.sh
     ```
   O una sola prueba con el comando de la tabla. Cada ejecución deja sus CSV en `resultados/`.
4. Ver el resumen formateado listo para la tabla:
   ```bash
   python resumen.py
   ```

Las pruebas 13 a 15 crean órdenes de compra en borrador, por lo que aumentan el total de registros en `ordenes_compra`.
Por eso van al final. En el repositorio solo se versionan los archivos `NN_stats.csv`.

## Pruebas

La columna Resultado muestra el tiempo promedio, el percentil 95, las peticiones por segundo y la tasa de error
leídos de `resultados/NN_stats.csv` (fila `Aggregated`).

| # | Endpoint | Escenario | Usuarios | Llegada | Duración | Comando | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | GET /api/compras/proveedores | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 20 -r 5 -t 1m --csv resultados/01` | Pendiente de correr |
| 02 | GET /api/compras/proveedores | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 100 -r 20 -t 1m --csv resultados/02` | Pendiente de correr |
| 03 | GET /api/compras/proveedores | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 300 -r 50 -t 2m --csv resultados/03` | Pendiente de correr |
| 04 | GET /api/compras/ordenes-compra | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 20 -r 5 -t 1m --csv resultados/04` | Pendiente de correr |
| 05 | GET /api/compras/ordenes-compra | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 100 -r 20 -t 1m --csv resultados/05` | Pendiente de correr |
| 06 | GET /api/compras/ordenes-compra | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 300 -r 50 -t 2m --csv resultados/06` | Pendiente de correr |
| 07 | GET /api/notificaciones/alertas | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 20 -r 5 -t 1m --csv resultados/07` | Pendiente de correr |
| 08 | GET /api/notificaciones/alertas | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 100 -r 20 -t 1m --csv resultados/08` | Pendiente de correr |
| 09 | GET /api/notificaciones/alertas | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 300 -r 50 -t 2m --csv resultados/09` | Pendiente de correr |
| 10 | GET /api/reportes/indicadores | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 20 -r 5 -t 1m --csv resultados/10` | Pendiente de correr |
| 11 | GET /api/reportes/indicadores | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 100 -r 20 -t 1m --csv resultados/11` | Pendiente de correr |
| 12 | GET /api/reportes/indicadores | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 300 -r 50 -t 2m --csv resultados/12` | Pendiente de correr |
| 13 | POST /api/compras/ordenes-compra | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 20 -r 5 -t 1m --csv resultados/13` | Pendiente de correr |
| 14 | POST /api/compras/ordenes-compra | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 100 -r 20 -t 1m --csv resultados/14` | Pendiente de correr |
| 15 | POST /api/compras/ordenes-compra | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 300 -r 50 -t 2m --csv resultados/15` | Pendiente de correr |
