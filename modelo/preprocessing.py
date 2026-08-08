"""Parte 1 — Preprocesamiento y extracción de features.

El ORDEN de las features es parte del contrato: `backend/preprocessing.py`
las replica o importa. No cambiar el orden sin actualizar ambas partes.
"""
import pandas as pd

COLUMNA_PRECIO = "price actual"
COLUMNA_TIEMPO = "time"

# Orden exacto de features que el modelo espera:
NOMBRES_FEATURES = ["hora", "dia_semana", "mes", "es_fin_de_semana"]


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """Limpia el dataset completo: parsea tiempo, deriva features y quita nulos de precio."""
    df = df.copy()
    df[COLUMNA_TIEMPO] = pd.to_datetime(df[COLUMNA_TIEMPO], utc=True)
    df["hora"] = df[COLUMNA_TIEMPO].dt.hour.astype(int)
    df["dia_semana"] = df[COLUMNA_TIEMPO].dt.dayofweek.astype(int)
    df["mes"] = df[COLUMNA_TIEMPO].dt.month.astype(int)
    df["es_fin_de_semana"] = (df[COLUMNA_TIEMPO].dt.dayofweek >= 5).astype(int)
    df = df.dropna(subset=[COLUMNA_PRECIO]).reset_index(drop=True)
    return df


def extract_features(fecha: str, hora: int) -> list:
    """Convierte fecha (YYYY-MM-DD) y hora (0-23) en las features que el modelo espera.

    Devuelve [hora, dia_semana, mes, es_fin_de_semana] en ese orden exacto.
    """
    dt = pd.to_datetime(fecha)
    return [int(hora), int(dt.dayofweek), int(dt.month), int(dt.dayofweek >= 5)]