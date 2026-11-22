# Pruebas de rendimiento: Steven López (Inventario)

Son 15 pruebas con [Locust](https://locust.io/): cinco endpoints de Inventario, cada uno en tres escenarios.
Todas pasan por el API Gateway, como cualquier cliente real (RNF09). Miden las consultas de stock y kardex
y el registro de movimientos, que además llama a Catálogo por REST y publica un evento en RabbitMQ.

**Métricas:** tiempo de respuesta (promedio y percentil 95), peticiones por segundo y tasa de error.
Una petición cuenta como error si no devuelve el código esperado o si tarda más de 2 s (RNF06).

**Escenarios:** los mismos casos de las pruebas, para poder compararlas.
Carga normal = 20 usuarios (los 15 internos con margen). Carga pico = 100. Estrés = 300.

**Nota:** aquí se inicia sesión una sola vez al empezar y todos los usuarios
simulados comparten el token. Si cada usuario iniciara sesión, en estrés fallaría el login del gateway
(ya medido) y no se sabría cuánto aguanta Inventario.

## Cómo correrlas

1. Levantar el sistema con datos limpios (en `app/`):
   ```
   docker compose down -v
   docker compose up --build -d
   ```
2. Si existe la cola `prueba.q` de RabbitMQ, borrarla: las pruebas 13 a 15 publican miles de eventos.
3. Instalar Locust en un entorno virtual. En Ubuntu 24.04, `pip install` fuera de un entorno virtual
   falla con `externally-managed-environment`:
   ```
   sudo apt install python3-venv   # solo la primera vez
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
4. Correr las pruebas en orden (unos 20 minutos):
   ```
   ./correr_todas.sh
   ```
   O una sola, con el comando de la tabla. Cada prueba deja sus CSV en `resultados/`.
5. Ver los resultados listos para pegar en la tabla: `python3 resumen.py`

Las pruebas 13 a 15 registran entradas de 1 unidad, así que suben el stock y alargan el kardex.
Por eso van de últimas. Para repetir las demás con los mismos datos, volver al paso 1.

En el repositorio solo se guardan los archivos `NN_stats.csv`. Los demás CSV que genera Locust
(`_failures`, `_exceptions` y `_stats_history`)
se ignoran.

## Pruebas

La columna Resultado muestra el tiempo promedio, el percentil 95, las peticiones por segundo y la tasa de error.
Esos valores se leen de `resultados/NN_stats.csv`, en la fila `Aggregated`.

| # | Endpoint | Escenario | Usuarios | Llegada | Duración | Comando | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | GET /api/inventario/stock/{productoId} | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags stock -u 20 -r 5 -t 1m --csv resultados/01` | 31 ms / 34 ms / 9.4 req/s / 0.0% |
| 02 | GET /api/inventario/stock/{productoId} | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags stock -u 100 -r 20 -t 1m --csv resultados/02` | 109 ms / 29 ms / 46.3 req/s / 2.5% |
| 03 | GET /api/inventario/stock/{productoId} | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags stock -u 300 -r 50 -t 2m --csv resultados/03` | 42 ms / 24 ms / 73.5 req/s / 0.4% |
| 04 | GET /api/inventario/bodegas/{bodegaId}/stock | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags stock-bodega -u 20 -r 5 -t 1m --csv resultados/04` | 26 ms / 32 ms / 9.8 req/s / 0.0% |
| 05 | GET /api/inventario/bodegas/{bodegaId}/stock | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags stock-bodega -u 100 -r 20 -t 1m --csv resultados/05` | 40 ms / 27 ms / 48.1 req/s / 0.4% |
| 06 | GET /api/inventario/bodegas/{bodegaId}/stock | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags stock-bodega -u 300 -r 50 -t 2m --csv resultados/06` | 44 ms / 26 ms / 73.3 req/s / 0.4% |
| 07 | GET /api/inventario/kardex | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags kardex -u 20 -r 5 -t 1m --csv resultados/07` | 26 ms / 31 ms / 9.7 req/s / 0.0% |
| 08 | GET /api/inventario/kardex | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags kardex -u 100 -r 20 -t 1m --csv resultados/08` | 40 ms / 29 ms / 48.3 req/s / 0.4% |
| 09 | GET /api/inventario/kardex | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags kardex -u 300 -r 50 -t 2m --csv resultados/09` | 44 ms / 25 ms / 73.1 req/s / 0.4% |
| 10 | GET /api/inventario/movimientos | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags movimientos -u 20 -r 5 -t 1m --csv resultados/10` | 26 ms / 32 ms / 10.0 req/s / 0.0% |
| 11 | GET /api/inventario/movimientos | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags movimientos -u 100 -r 20 -t 1m --csv resultados/11` | 39 ms / 28 ms / 48.2 req/s / 0.4% |
| 12 | GET /api/inventario/movimientos | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags movimientos -u 300 -r 50 -t 2m --csv resultados/12` | 43 ms / 25 ms / 72.9 req/s / 0.4% |
| 13 | POST /api/inventario/movimientos | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags registrar -u 20 -r 5 -t 1m --csv resultados/13` | 43 ms / 52 ms / 9.7 req/s / 0.2% |
| 14 | POST /api/inventario/movimientos | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags registrar -u 100 -r 20 -t 1m --csv resultados/14` | 53 ms / 53 ms / 47.4 req/s / 1.8% |
| 15 | POST /api/inventario/movimientos | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags registrar -u 300 -r 50 -t 2m --csv resultados/15` | 1194 ms / 57 ms / 74.0 req/s / 4.8% |


### Resumen

- **Las consultas de Inventario cumplen RNF06 en los tres escenarios.** En stock, stock por bodega, kardex y
  movimientos, la mediana se mantiene entre 21 y 25 ms y el percentil 95 no pasa de 34 ms, aun con 300 usuarios.
  Con carga normal (pruebas 01, 04, 07 y 10) no hubo ningún error.
- **El registro de movimientos (POST) es el único endpoint que falla por Inventario.** Con carga normal
  responde en 43 ms en promedio, pero con 100 y 300 usuarios devuelve errores HTTP 500 por bloqueos mutuos
  en MySQL. En estrés la tasa de error llega a 4.8%.
- **En estrés el límite lo pone el gateway, no Inventario.** Las pruebas con 300 usuarios no pasan de unas
  74 peticiones por segundo, lo mismo que 150 usuarios.

### Picos al inicio de las pruebas de carga pico y estrés

Todos los errores de las consultas (pruebas 02, 03, 05, 06, 08, 09, 11 y 12) son respuestas de más de 2 s,
y todos ocurren en los primeros 15 segundos, mientras Locust sube los usuarios. Después no hay ni un error más.
Los números son casi idénticos en los cuatro endpoints: 12 errores en las pruebas de 100 usuarios
(68 en la 02, por ser la primera) y 39 en las de 300. Por eso el problema no es de ningún endpoint en particular.

La causa más probable es el gateway. Apache (`mpm_prefork`) empieza con pocos procesos y crea los demás
de a poco. Mientras llegan los usuarios nuevos, algunas peticiones esperan de 3 a 5 s un proceso libre.
Esto también explica que en las pruebas 02, 03 y 15 el promedio sea mayor que el percentil 95: unas pocas
peticiones muy lentas suben el promedio, pero el 95% de las peticiones responde en menos de 35 ms.

### Límite de 150 usuarios en estrés

Cada usuario simulado espera entre 1 y 3 s entre peticiones, así que hace unas 0.5 peticiones por segundo.
Con 20 y 100 usuarios se obtienen unas 10 y 48 req/s, lo esperado. Con 300 usuarios deberían ser unas 150 req/s,
pero ninguna prueba de estrés pasa de 74 req/s.

En pruebas anteriores se encontró el mismo límite: Apache atiende máximo 150 conexiones a la vez (`MaxRequestWorkers`).
El log del gateway lo confirma (`server reached MaxRequestWorkers setting`). Los usuarios que no consiguen
conexión esperan en cola. Así que las pruebas de estrés miden en realidad unos 150 usuarios simultáneos
contra Inventario, y no 300.

### Errores del registro de movimientos (pruebas 13 a 15)

| Prueba | Usuarios | HTTP 500 | Más de 2 s | Tasa de error |
| --- | --- | --- | --- | --- |
| 13 | 20 | 1 | 0 | 0.2% |
| 14 | 100 | 39 | 10 | 1.8% |
| 15 | 300 | 205 | 222 | 4.8% |

**Los HTTP 500 son bloqueos mutuos (deadlocks) de MySQL.** El log de Inventario muestra
`Deadlock found when trying to get lock; try restarting transaction` (error 1213) en el `UPDATE` de
`Stock.aplicarCambio` ([stock.js](../../app/inventario/src/modelos/stock.js)). La prueba solo usa 4 productos
y 3 bodegas, así que hay apenas 12 filas de stock y muchas transacciones chocan en la misma fila.
Dentro de la transacción, el `INSERT IGNORE` deja un bloqueo compartido sobre la fila. Cuando dos
transacciones lo tienen y ambas intentan el `UPDATE`, MySQL cancela una de ellas.

`guardar()` ([movimientos.js](../../app/inventario/src/servicios/movimientos.js)) solo reintenta cuando el
bloqueo optimista detecta otra versión (`conflictoVersion`). El deadlock no se reintenta y llega al cliente
como HTTP 500. En el log no aparece ningún conflicto de versión, así que en la práctica el reintento nunca se usa.

**Los tiempos de más de 2 s solo crecen en estrés.** En la prueba 15 el percentil 95 sigue en 57 ms y la
mediana en 35 ms, pero el 1% más lento tarda entre 59 y 97 s. El tiempo máximo crece casi un segundo por
cada segundo de prueba, así que algunas peticiones quedaron en cola desde el inicio hasta casi el final.
Esto coincide con el límite de 150 conexiones del gateway. Con este endpoint la cola pesa más porque cada
petición ocupa la conexión más tiempo: llama a Catálogo, hace la transacción y publica en RabbitMQ.
El pool de MySQL de Inventario usa el valor por defecto de `mysql2` (10 conexiones), que también puede
sumar espera. Con estos datos no se puede separar cuánto aporta cada uno.
