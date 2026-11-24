# Corre las 15 pruebas en orden desde PowerShell (Windows). Tarda unos 20 minutos.
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force -Path resultados | Out-Null

Write-Host "Prueba 01 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 20 -r 5 -t 1m --csv resultados/01

Write-Host "Prueba 02 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 100 -r 20 -t 1m --csv resultados/02

Write-Host "Prueba 03 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags proveedores -u 300 -r 50 -t 2m --csv resultados/03

Write-Host "Prueba 04 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 20 -r 5 -t 1m --csv resultados/04

Write-Host "Prueba 05 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 100 -r 20 -t 1m --csv resultados/05

Write-Host "Prueba 06 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags ordenes -u 300 -r 50 -t 2m --csv resultados/06

Write-Host "Prueba 07 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 20 -r 5 -t 1m --csv resultados/07

Write-Host "Prueba 08 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 100 -r 20 -t 1m --csv resultados/08

Write-Host "Prueba 09 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags alertas -u 300 -r 50 -t 2m --csv resultados/09

Write-Host "Prueba 10 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 20 -r 5 -t 1m --csv resultados/10

Write-Host "Prueba 11 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 100 -r 20 -t 1m --csv resultados/11

Write-Host "Prueba 12 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags indicadores -u 300 -r 50 -t 2m --csv resultados/12

Write-Host "Prueba 13 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 20 -r 5 -t 1m --csv resultados/13

Write-Host "Prueba 14 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 100 -r 20 -t 1m --csv resultados/14

Write-Host "Prueba 15 de 15"
locust -f locustfile.py --host http://localhost:8000 --headless --tags crear-orden -u 300 -r 50 -t 2m --csv resultados/15
