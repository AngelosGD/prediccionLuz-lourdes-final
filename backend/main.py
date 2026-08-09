"""API de predicción de precios de luz (Parte 2 - FastAPI).

Contrato (no cambiar sin acuerdo de las 3 partes, ver README sección 4/4b):
- POST /predict      {"fecha": "YYYY-MM-DD", "hora": 0-23}
                     -> {"precio_predicho": 62.35, "unidad": "EUR/MWh"}
- POST /predict/24h  {"fecha": "YYYY-MM-DD"}
                     -> {"fecha", "unidad", "precios": [{hora, precio_predicho} x24]}
- POST /predict/real {"fecha": "YYYY-MM-DD", "hora": 0-23}
                     -> {"fecha", "hora", "precio_predicho", "precio_real|null", "unidad"}
- Error (422):       {"error": "..."}
"""

import math
import random
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, StrictInt, field_validator

from preprocessing import extract_features

BASE_DIR = Path(__file__).resolve().parent
MODELO_PKL = BASE_DIR / "modelo.pkl"
MODELO_PKL_PARTE1 = BASE_DIR.parent / "modelo" / "modelo.pkl"
DATASET_CSV = BASE_DIR.parent / "modelo" / "data" / "energy_dataset.csv"

modelo = None
_historico = None


# ---------------------------------------------------------------- modelos Pydantic

class PredictRequest(BaseModel):
    """Body de /predict y /predict/real. `hora` es integer, nunca string."""

    fecha: str
    hora: StrictInt

    @field_validator("fecha")
    @classmethod
    def validar_fecha(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("fecha debe ser una fecha válida (YYYY-MM-DD)")
        return v

    @field_validator("hora")
    @classmethod
    def validar_hora(cls, v: int) -> int:
        if v < 0 or v > 23:
            raise ValueError("hora debe estar entre 0 y 23")
        return v


class FechaRequest(BaseModel):
    """Body de /predict/24h: solo fecha."""

    fecha: str

    @field_validator("fecha")
    @classmethod
    def validar_fecha(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("fecha debe ser una fecha válida (YYYY-MM-DD)")
        return v


# ------------------------------------------------------------------ simulación

def _precio_simulado(hora: int) -> float:
    """Precio fake con forma de campana diaria (pico por la tarde).

    Temporal: se usa solo mientras no exista modelo.pkl.
    """
    base = 55 + 16 * math.sin(((hora - 7) / 24) * 2 * math.pi)
    return round(base + random.uniform(-4, 4), 2)


# ------------------------------------------------------------- modelo (Parte 1)

def cargar_modelo() -> None:
    """Carga modelo.pkl UNA vez al arrancar (primero el del backend, luego el de Parte 1)."""
    global modelo
    for ruta in (MODELO_PKL, MODELO_PKL_PARTE1):
        if ruta.exists():
            modelo = joblib.load(ruta)
            break


def predecir_precio(fecha: str, hora: int) -> float:
    """Usa el modelo real si está cargado; si no, precio simulado."""
    if modelo is not None:
        features = extract_features(fecha, hora)
        return round(float(modelo.predict([features])[0]), 2)
    return _precio_simulado(hora)


# ------------------------------------------------- precio real histórico (4b)

def _cargar_historico():
    """Lee el dataset de Parte 1 como {("YYYY-MM-DD", hora): precio_real}.

    Devuelve None si el dataset aún no existe (precio_real = null).
    """
    if not DATASET_CSV.exists():
        return None
    try:
        df = pd.read_csv(DATASET_CSV, usecols=["time", "price actual"])
        df["time"] = pd.to_datetime(df["time"], errors="coerce")
        df = df.dropna(subset=["time", "price actual"])
        return {
            (t.date().isoformat(), t.hour): round(float(p), 2)
            for t, p in zip(df["time"], df["price actual"])
        }
    except Exception:
        return None


def buscar_precio_real(fecha: str, hora: int):
    """Precio real histórico; None si la fecha no está en el dataset o no hay dataset."""
    global _historico
    if _historico is None:
        _historico = _cargar_historico()
    if _historico is None:
        return None
    return _historico.get((fecha, hora))


# -------------------------------------------------------------------------- app

@asynccontextmanager
async def lifespan(_: FastAPI):
    cargar_modelo()
    yield


app = FastAPI(title="Predicción de precios de luz", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # desarrollo local (React en otro puerto); endurecer en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _mensaje_error(errors: list) -> str:
    """Convierte los errores de validación de Pydantic al formato del contrato."""
    for err in errors:
        loc = err.get("loc", [])
        campo = loc[-1] if loc else None
        msg = err.get("msg", "")
        if msg.startswith("Value error, "):
            return msg[len("Value error, "):]
        if campo == "hora":
            return "hora debe estar entre 0 y 23"
        if campo == "fecha":
            return "fecha debe ser una fecha válida (YYYY-MM-DD)"
    return "Solicitud inválida"


@app.exception_handler(RequestValidationError)
async def _manejar_validacion(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": _mensaje_error(exc.errors())})


@app.post("/predict")
def predict(req: PredictRequest):
    return {"precio_predicho": predecir_precio(req.fecha, req.hora), "unidad": "EUR/MWh"}


@app.post("/predict/24h")
def predict_24h(req: FechaRequest):
    precios = [{"hora": h, "precio_predicho": predecir_precio(req.fecha, h)} for h in range(24)]
    return {"fecha": req.fecha, "unidad": "EUR/MWh", "precios": precios}


@app.post("/predict/real")
def predict_real(req: PredictRequest):
    return {
        "fecha": req.fecha,
        "hora": req.hora,
        "precio_predicho": predecir_precio(req.fecha, req.hora),
        "precio_real": buscar_precio_real(req.fecha, req.hora),
        "unidad": "EUR/MWh",
    }
