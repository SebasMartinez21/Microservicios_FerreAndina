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

| # | Endpoint | Escenario | Usuarios | Llegada | Duración | Comando | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | POST /api/auth/login | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags login -u 20 -r 5 -t 1m --csv resultados/01` | |
| 02 | POST /api/auth/login | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags login -u 100 -r 20 -t 1m --csv resultados/02` | |
| 03 | POST /api/auth/login | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags login -u 300 -r 50 -t 2m --csv resultados/03` | |
| 04 | GET /api/auth/perfil | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags perfil -u 20 -r 5 -t 1m --csv resultados/04` | |
| 05 | GET /api/auth/perfil | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags perfil -u 100 -r 20 -t 1m --csv resultados/05` | |
| 06 | GET /api/auth/perfil | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags perfil -u 300 -r 50 -t 2m --csv resultados/06` | |
| 07 | GET /api/usuarios | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags usuarios -u 20 -r 5 -t 1m --csv resultados/07` | |
| 08 | GET /api/usuarios | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags usuarios -u 100 -r 20 -t 1m --csv resultados/08` | |
| 09 | GET /api/usuarios | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags usuarios -u 300 -r 50 -t 2m --csv resultados/09` | |
| 10 | GET /api/catalogo/productos | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 20 -r 5 -t 1m --csv resultados/10` | |
| 11 | GET /api/catalogo/productos | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 100 -r 20 -t 1m --csv resultados/11` | |
| 12 | GET /api/catalogo/productos | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 300 -r 50 -t 2m --csv resultados/12` | |
| 13 | GET /api/catalogo/productos sin token | Carga normal | 20 | 5/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags sin-token -u 20 -r 5 -t 1m --csv resultados/13` | |
| 14 | GET /api/catalogo/productos sin token | Carga pico | 100 | 20/s | 1m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags sin-token -u 100 -r 20 -t 1m --csv resultados/14` | |
| 15 | GET /api/catalogo/productos sin token | Estrés | 300 | 50/s | 2m | `locust -f locustfile.py --host http://localhost:8000 --headless --tags sin-token -u 300 -r 50 -t 2m --csv resultados/15` | |
