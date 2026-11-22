"""
Pruebas de rendimiento de Compras, Notificaciones y Reportes (Jhoan Sebastián Martínez).

Cada prueba ataca un solo endpoint, elegido con --tags, en uno de tres escenarios
(carga normal, carga pico y estrés). La tabla con las 15 pruebas está en README.md.

Ejemplo:
    locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 20 -r 5 -t 1m
"""

import random

import requests
from locust import HttpUser, between, events, tag, task

ADMIN = {"email": "admin@ferreandina.com", "password": "admin1234"}

# Datos de prueba: proveedores 1 a 3, productos 1 a 4 y bodegas 1 a 3
PROVEEDORES = [1, 2, 3]
PRODUCTOS = [1, 2, 3, 4]
BODEGAS = [1, 2, 3]
BUSQUEDAS_PROVEEDOR = ["Andina", "Eje", "Caldas", "900"]


@events.test_start.add_listener
def iniciar_sesion(environment, **kwargs):
    # Se inicia sesión UNA sola vez y todos los usuarios simulados comparten el token.
    # Así se miden los microservicios de negocio y no el login del gateway.
    respuesta = requests.post(f"{environment.host}/api/auth/login", json=ADMIN, timeout=10)
    respuesta.raise_for_status()
    UsuarioFerreAndina.cabeceras = {
        "Authorization": f"Bearer {respuesta.json()['token']}",
        "Accept": "application/json",
    }


class UsuarioFerreAndina(HttpUser):
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

    @tag("proveedores")
    @task
    def listar_proveedores(self):
        # Búsqueda y listado paginado de proveedores en Compras (MySQL - RF03)
        parametros = {"q": random.choice(BUSQUEDAS_PROVEEDOR)} if random.random() < 0.5 else {}
        with self.client.get("/api/compras/proveedores", params=parametros, headers=self.cabeceras,
                             name="GET /api/compras/proveedores", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("ordenes")
    @task
    def listar_ordenes(self):
        # Listado paginado de órdenes de compra con filtros de estado y bodega (MySQL - RF06)
        parametros = {
            "estado": random.choice(["BORRADOR", "ENVIADA", "RECIBIDA"]),
            "bodegaId": random.choice(BODEGAS),
        }
        with self.client.get("/api/compras/ordenes-compra", params=parametros, headers=self.cabeceras,
                             name="GET /api/compras/ordenes-compra", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("alertas")
    @task
    def listar_alertas(self):
        # Listado paginado de alertas de stock y sugerencias en Notificaciones (MongoDB - RF09, RF16)
        parametros = {"bodegaId": random.choice(BODEGAS)} if random.random() < 0.5 else {}
        with self.client.get("/api/notificaciones/alertas", params=parametros, headers=self.cabeceras,
                             name="GET /api/notificaciones/alertas", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("indicadores")
    @task
    def ver_indicadores(self):
        # Panel de indicadores ejecutivos calculado por agregación en Reportes (MongoDB - RF14)
        parametros = {"bodegaId": random.choice(BODEGAS)} if random.random() < 0.5 else {}
        with self.client.get("/api/reportes/indicadores", params=parametros, headers=self.cabeceras,
                             name="GET /api/reportes/indicadores", catch_response=True) as respuesta:
            self._revisar(respuesta)

    @tag("crear-orden")
    @task
    def crear_orden_compra(self):
        # Operación de escritura inter-servicio: Compras valida el producto en Catálogo por REST
        # y guarda la orden con sus líneas dentro de una transacción en MySQL (RF06).
        orden = {
            "proveedorId": random.choice(PROVEEDORES),
            "bodegaId": random.choice(BODEGAS),
            "lineas": [
                {
                    "productoId": random.choice(PRODUCTOS),
                    "cantidad": random.randint(5, 50),
                }
            ],
        }
        with self.client.post("/api/compras/ordenes-compra", json=orden, headers=self.cabeceras,
                              name="POST /api/compras/ordenes-compra", catch_response=True) as respuesta:
            self._revisar(respuesta, esperado=201)
