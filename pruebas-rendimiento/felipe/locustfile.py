"""
Pruebas de rendimiento del API Gateway (Felipe Giraldo).

Cada prueba ataca un solo endpoint, elegido con --tags, en uno de tres escenarios
(carga normal, carga pico y estrés). La tabla con las 15 pruebas está en README.md.

Ejemplo:
    locust -f locustfile.py --host http://localhost:8000 --headless --tags productos -u 20 -r 5 -t 1m
"""

import random

from locust import HttpUser, between, tag, task

ADMIN = {"email": "admin@ferreandina.com", "password": "admin1234"}
BUSQUEDAS = ["tor", "mar", "tal", "pin", "bro"]


class UsuarioGateway(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Cada usuario simulado inicia sesión una vez y guarda su token
        respuesta = self.client.post("/api/auth/login", json=ADMIN, name="login inicial")
        token = respuesta.json().get("token") if respuesta.status_code == 200 else ""
        self.cabeceras = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    def _revisar(self, respuesta, esperado=200):
        if respuesta.status_code != esperado:
            respuesta.failure(f"HTTP {respuesta.status_code}")
        elif respuesta.elapsed.total_seconds() > 2:
            # RNF06: las consultas deben responder en menos de 2 segundos
            respuesta.failure("Tardó más de 2 s")
        else:
            respuesta.success()

    @tag("login")
    @task
    def iniciar_sesion(self):
        with self.client.post("/api/auth/login", json=ADMIN, name="POST /api/auth/login",
                              catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("perfil")
    @task
    def ver_perfil(self):
        with self.client.get("/api/auth/perfil", headers=self.cabeceras, name="GET /api/auth/perfil",
                             catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("usuarios")
    @task
    def listar_usuarios(self):
        with self.client.get("/api/usuarios", headers=self.cabeceras, name="GET /api/usuarios",
                             catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("productos")
    @task
    def buscar_productos(self):
        # Pasa por el gateway hasta Catálogo: mide el costo del reenvío
        with self.client.get("/api/catalogo/productos", params={"q": random.choice(BUSQUEDAS)},
                             headers=self.cabeceras, name="GET /api/catalogo/productos",
                             catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("sin-token")
    @task
    def peticion_sin_token(self):
        # El gateway debe rechazarla rápido, sin llegar al microservicio
        with self.client.get("/api/catalogo/productos", name="GET /api/catalogo/productos (sin token)",
                             catch_response=True) as respuesta:
            self._revisar(respuesta, esperado=401)
