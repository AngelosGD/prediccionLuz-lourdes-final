"""FastAPI que expone los endpoints de predicción del contrato (README sección 4).

Endpoints:
- POST /predict       → predicción de una fecha y hora
- POST /predict/24h   → predicción de las 24 horas de un día
- POST /predict/real  → predicción + comparación con el precio real

Por ahora regresan precios simulados con forma de campana diaria. Cambio exacto:
cargar modelo.pkl una vez al arrancar y llamar modelo.predict() con las features
de preprocessing.py; para /predict/real, leer el precio real del dataset.
"""
import math
import random
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Predicción de Precios de Luz")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    fecha: str
    hora: int


class PredictRequest24h(BaseModel):
    fecha: str


def _fecha_valida(fecha: str) -> bool:
    try:
        datetime.strptime(fecha, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _precio_simulado(hora: int) -> float:
    # Mock horario con forma de campana (pico por la tarde) que se ve realista.
    base = 58 + 16 * math.sin((hora - 7) / 24.0 * 2 * math.pi)
    return round(base + random.uniform(-5, 5), 2)


@app.get("/")
def root():
    return {"mensaje": "API de predicción de precios de luz"}


@app.post("/predict")
def predict(body: PredictRequest):
    if not _fecha_valida(body.fecha):
        return JSONResponse(
            status_code=400,
            content={"error": "fecha debe tener el formato YYYY-MM-DD"},
        )

    if not 0 <= body.hora <= 23:
        return JSONResponse(
            status_code=400,
            content={"error": "hora debe estar entre 0 y 23"},
        )

    # TODO: reemplazar por modelo.predict() cuando exista modelo.pkl
    return {"precio_predicho": _precio_simulado(body.hora), "unidad": "EUR/MWh"}


@app.post("/predict/24h")
def predict_24h(body: PredictRequest24h):
    if not _fecha_valida(body.fecha):
        return JSONResponse(
            status_code=400,
            content={"error": "fecha debe tener el formato YYYY-MM-DD"},
        )

    # TODO: reemplazar por el modelo; devolver 24 predicciones (0..23)
    precios = [
        {"hora": h, "precio_predicho": _precio_simulado(h)} for h in range(24)
    ]
    return {"fecha": body.fecha, "precios": precios, "unidad": "EUR/MWh"}


@app.post("/predict/real")
def predict_real(body: PredictRequest):
    if not _fecha_valida(body.fecha):
        return JSONResponse(
            status_code=400,
            content={"error": "fecha debe tener el formato YYYY-MM-DD"},
        )

    if not 0 <= body.hora <= 23:
        return JSONResponse(
            status_code=400,
            content={"error": "hora debe estar entre 0 y 23"},
        )

    # TODO:
    #  - precio_predicho con modelo.predict() cuando exista modelo.pkl
    #  - precio_real leyéndolo del dataset histórico (no debe ser null si la
    #    fecha y hora existen en el CSV); null cuando no haya dato real.
    return {
        "fecha": body.fecha,
        "hora": body.hora,
        "precio_predicho": _precio_simulado(body.hora),
        "precio_real": None,
        "unidad": "EUR/MWh",
    }