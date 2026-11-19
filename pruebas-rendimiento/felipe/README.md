# Pruebas de rendimiento: Felipe Giraldo (API Gateway)

Son 15 pruebas con [Locust](https://locust.io/): cinco endpoints del gateway, cada uno en tres escenarios.
Con ellas se mide cuánto aguanta la autenticación, el listado de usuarios y el reenvío a Catálogo.

**Métricas:** tiempo de respuesta (promedio y percentil 95), peticiones por segundo y tasa de error.
Una petición cuenta como error si no devuelve el código esperado o si tarda más de 2 s (RNF06).

## Cómo correrlas

Con el sistema levantado (`docker compose up` en `app/`):

```
pip install -r requirements.txt
mkdir resultados
```

Después se corre el comando de cada prueba. Cada una deja sus CSV en `resultados/`.

## Pruebas

La columna Resultado muestra el tiempo promedio, el percentil 95, las peticiones por segundo y la tasa de error.

En las pruebas de estrés se lanzaron 300 usuarios, pero solo 150 alcanzaron a iniciar sesión. Apache atiende máximo 150 conexiones a la vez (`MaxRequestWorkers`).

| # | Endpoint | Escenario | Usuarios | Llegada | Duración | Comando | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | POST /api/auth/login | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags login -u 20 -r 5 -t 1m --csv resultados/01` | 238 ms / 300 ms / 8.6 req/s / 0.0% |
| 02 | POST /api/auth/login | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags login -u 100 -r 20 -t 1m --csv resultados/02` | 2350 ms / 3600 ms / 20.2 req/s / 71.8% |
| 03 | POST /api/auth/login | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags login -u 300 -r 50 -t 2m --csv resultados/03` | 6241 ms / 11000 ms / 16.6 req/s / 99.5% |
| 04 | GET /api/auth/perfil | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags perfil -u 20 -r 5 -t 1m --csv resultados/04` | 18 ms / 31 ms / 9.8 req/s / 0.0% |
| 05 | GET /api/auth/perfil | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags perfil -u 100 -r 20 -t 1m --csv resultados/05` | 18 ms / 33 ms / 47.4 req/s / 0.0% |
| 06 | GET /api/auth/perfil | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags perfil -u 300 -r 50 -t 2m --csv resultados/06` | 24 ms / 54 ms / 71.0 req/s / 0.0% |
| 07 | GET /api/usuarios | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags usuarios -u 20 -r 5 -t 1m --csv resultados/07` | 31 ms / 59 ms / 9.6 req/s / 0.0% |
| 08 | GET /api/usuarios | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags usuarios -u 100 -r 20 -t 1m --csv resultados/08` | 26 ms / 52 ms / 46.9 req/s / 0.0% |
| 09 | GET /api/usuarios | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags usuarios -u 300 -r 50 -t 2m --csv resultados/09` | 39 ms / 96 ms / 70.3 req/s / 0.0% |
| 10 | GET /api/catalogo/productos | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 20 -r 5 -t 1m --csv resultados/10` | 26 ms / 44 ms / 9.7 req/s / 0.0% |
| 11 | GET /api/catalogo/productos | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 100 -r 20 -t 1m --csv resultados/11` | 29 ms / 68 ms / 46.6 req/s / 0.0% |
| 12 | GET /api/catalogo/productos | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 300 -r 50 -t 2m --csv resultados/12` | 49 ms / 150 ms / 70.3 req/s / 0.0% |
| 13 | GET /api/catalogo/productos sin token | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags sin-token -u 20 -r 5 -t 1m --csv resultados/13` | 10 ms / 17 ms / 10.0 req/s / 0.0% |
| 14 | GET /api/catalogo/productos sin token | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags sin-token -u 100 -r 20 -t 1m --csv resultados/14` | 13 ms / 25 ms / 47.5 req/s / 0.0% |
| 15 | GET /api/catalogo/productos sin token | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags sin-token -u 300 -r 50 -t 2m --csv resultados/15` | 12 ms / 22 ms / 71.6 req/s / 0.0% |