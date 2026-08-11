"""Preprocesamiento para el modelo de predicción de consumo eléctrico.

La versión oficial de extract_features() la entrega Parte 1 (Minería de Datos)
junto con el modelo.pkl. Esta implementación provisional se reemplaza por la
definitiva cuando Parte 1 entregue el orden exacto de features.
"""

from datetime import date


def extract_features(fecha: str, hora: int) -> list[float]:
    """Convierte (fecha, hora) en las features numéricas que espera el modelo.

    Orden provisional: [hora, día de la semana (0=lun..6=dom), mes,
    es_fin_de_semana (0/1)]. Debe coincidir con el orden con que se entrenó
    el modelo de Parte 1.
    """
    d = date.fromisoformat(fecha)
    es_fin_de_semana = 1 if d.weekday() >= 5 else 0
    return [float(hora), float(d.weekday()), float(d.month), float(es_fin_de_semana)]
