"""
Pruebas de rendimiento del microservicio de Inventario (Steven López).

Cada prueba ataca un solo endpoint, elegido con --tags, en uno de tres escenarios
(carga normal, carga pico y estrés). La tabla con las 15 pruebas está en README.md.

Ejemplo:
    locust -f locustfile.py --host http://localhost:8000 --headless --tags stock -u 20 -r 5 -t 1m
"""

import random

import requests
from locust import HttpUser, between, events, tag, task

ADMIN = {"email": "admin@ferreandina.com", "password": "admin1234"}

# Datos de prueba del init.sql de Inventario: productos 1 a 4 y bodegas 1 a 3
PRODUCTOS = [1, 2, 3, 4]
BODEGAS = [1, 2, 3]


@events.test_start.add_listener
def iniciar_sesion(environment, **kwargs):
    # Se inicia sesión UNA sola vez y todos los usuarios simulados comparten el token.
    # Así se mide Inventario y no el login
    respuesta = requests.post(f"{environment.host}/api/auth/login", json=ADMIN, timeout=10)
    respuesta.raise_for_status()
    UsuarioInventario.cabeceras = {
        "Authorization": f"Bearer {respuesta.json()['token']}",
        "Accept": "application/json",
    }


class UsuarioInventario(HttpUser):
    wait_time = between(1, 3)
    cabeceras = {}

    def _revisar(self, respuesta, esperado=200):
        if respuesta.status_code != esperado:
            respuesta.failure(f"HTTP {respuesta.status_code}")
        elif respuesta.elapsed.total_seconds() > 2:
            # RNF06: las consultas deben responder en menos de 2 segundos
            respuesta.failure("Tardó más de 2 s")
        else:
            respuesta.success()

    @tag("stock")
    @task
    def stock_de_producto(self):
        # La consulta más frecuente del sistema (RF05, RF15)
        producto = random.choice(PRODUCTOS)
        with self.client.get(f"/api/inventario/stock/{producto}", headers=self.cabeceras,
                             name="GET /api/inventario/stock/{productoId}", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("stock-bodega")
    @task
    def stock_de_bodega(self):
        # Listado paginado; la mitad de las veces filtra los productos bajo el mínimo
        bodega = random.choice(BODEGAS)
        parametros = {"bajoMinimo": "true"} if random.random() < 0.5 else {}
        with self.client.get(f"/api/inventario/bodegas/{bodega}/stock", params=parametros, headers=self.cabeceras,
                             name="GET /api/inventario/bodegas/{bodegaId}/stock", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("kardex")
    @task
    def kardex(self):
        # La consulta SQL más pesada: arma las líneas del kardex con UNION ALL (RF10)
        parametros = {"productoId": random.choice(PRODUCTOS), "bodegaId": random.choice(BODEGAS)}
        with self.client.get("/api/inventario/kardex", params=parametros, headers=self.cabeceras,
                             name="GET /api/inventario/kardex", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("movimientos")
    @task
    def listar_movimientos(self):
        # Listado con filtros de producto y tipo
        parametros = {"productoId": random.choice(PRODUCTOS), "tipo": random.choice(["ENTRADA", "SALIDA", "AJUSTE"])}
        with self.client.get("/api/inventario/movimientos", params=parametros, headers=self.cabeceras,
                             name="GET /api/inventario/movimientos", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("registrar")
    @task
    def registrar_entrada(self):
        # La operación más costosa: valida el producto en Catálogo (REST), actualiza el saldo
        # con bloqueo optimista dentro de una transacción y publica el evento en RabbitMQ.
        # Es una ENTRADA de 1 unidad para que nunca falle por stock insuficiente.
        movimiento = {
            "tipo": "ENTRADA",
            "productoId": random.choice(PRODUCTOS),
            "cantidad": 1,
            "bodegaDestinoId": random.choice(BODEGAS),
            "motivo": "Prueba de rendimiento",
        }
        with self.client.post("/api/inventario/movimientos", json=movimiento, headers=self.cabeceras,
                              name="POST /api/inventario/movimientos", catch_response=True) as respuesta:
            self._revisar(respuesta, esperado=201)
