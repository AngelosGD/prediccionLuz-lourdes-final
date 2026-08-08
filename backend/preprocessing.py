"""Replica de la extracción de features de Parte 1 (modelo/preprocessing.py).

Mantener el MISMO orden de columnas que el modelo entrenado espera:
[hora, dia_semana, mes, es_fin_de_semana].
"""
import pandas as pd


def extract_features(fecha: str, hora: int) -> list:
    """Convierte fecha (YYYY-MM-DD) y hora (0-23) en las features del modelo."""
    dt = pd.to_datetime(fecha)
    return [int(hora), int(dt.dayofweek), int(dt.month), int(dt.dayofweek >= 5)]