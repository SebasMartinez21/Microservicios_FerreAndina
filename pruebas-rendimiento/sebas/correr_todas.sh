#!/bin/bash
# Corre las 15 pruebas en orden. Tarda unos 20 minutos.
# Sin "set -e": Locust termina con error si hubo fallos, y la siguiente prueba debe correr igual
cd "$(dirname "$0")"
mkdir -p resultados

echo "Prueba 01 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 20 -r 5 -t 1m --csv resultados/01

echo "Prueba 02 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 100 -r 20 -t 1m --csv resultados/02

echo "Prueba 03 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 300 -r 50 -t 2m --csv resultados/03

echo "Prueba 04 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 20 -r 5 -t 1m --csv resultados/04

echo "Prueba 05 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 100 -r 20 -t 1m --csv resultados/05

echo "Prueba 06 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 300 -r 50 -t 2m --csv resultados/06

echo "Prueba 07 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 20 -r 5 -t 1m --csv resultados/07

echo "Prueba 08 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 100 -r 20 -t 1m --csv resultados/08

echo "Prueba 09 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 300 -r 50 -t 2m --csv resultados/09

echo "Prueba 10 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 20 -r 5 -t 1m --csv resultados/10

echo "Prueba 11 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 100 -r 20 -t 1m --csv resultados/11

echo "Prueba 12 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 300 -r 50 -t 2m --csv resultados/12

echo "Prueba 13 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 20 -r 5 -t 1m --csv resultados/13

echo "Prueba 14 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 100 -r 20 -t 1m --csv resultados/14

echo "Prueba 15 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 300 -r 50 -t 2m --csv resultados/15
