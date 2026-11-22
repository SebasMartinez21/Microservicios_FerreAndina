"""
Lee resultados/NN_stats.csv y muestra la columna Resultado de la tabla del README:
tiempo promedio / percentil 95 / peticiones por segundo / tasa de error.

Uso: python resumen.py
"""

import csv
from pathlib import Path

for archivo in sorted(Path("resultados").glob("*_stats.csv")):
    with open(archivo, newline="") as f:
        total = next(fila for fila in csv.DictReader(f) if fila["Name"] == "Aggregated")

    peticiones = int(total["Request Count"])
    errores = int(total["Failure Count"])
    tasa_error = 100 * errores / peticiones if peticiones else 0

    print(f"{archivo.name[:2]}: {float(total['Average Response Time']):.0f} ms / {total['95%']} ms / "
          f"{float(total['Requests/s']):.1f} req/s / {tasa_error:.1f}%")
