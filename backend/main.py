"""API de predicción de consumo eléctrico (Parte 2 - FastAPI).

Contrato (no cambiar sin acuerdo de las 3 partes, ver README sección 4/4b):
- POST /predict      {"fecha": "YYYY-MM-DD", "hora": 0-23}
                     -> {"consumo_predicho": 25385.12, "unidad": "MW"}
- POST /predict/24h  {"fecha": "YYYY-MM-DD"}
                     -> {"fecha", "unidad", "consumos": [{hora, consumo_predicho} x24]}
- POST /predict/real {"fecha": "YYYY-MM-DD", "hora": 0-23}
                     -> {"fecha", "hora", "consumo_predicho", "consumo_real|null", "unidad"}
- POST /predict/rango {"fecha_inicio": "YYYY-MM-DD", "fecha_fin": "YYYY-MM-DD"}
                     -> {"fecha_inicio", "fecha_fin", "unidad",
                        "dias": [{fecha, consumos: [{hora, consumo_predicho} x24]}]}
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


class RangoRequest(BaseModel):
    """Body de /predict/rango: fecha_inicio y fecha_fin (ISO, inicio <= fin)."""

    fecha_inicio: str
    fecha_fin: str

    @field_validator("fecha_inicio", "fecha_fin")
    @classmethod
    def validar_fecha(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("fecha debe ser una fecha válida (YYYY-MM-DD)")
        return v

    @field_validator("fecha_fin")
    @classmethod
    def validar_rango(cls, v: str, info) -> str:
        inicio = info.data.get("fecha_inicio")
        if inicio:
            fecha_i = datetime.strptime(inicio, "%Y-%m-%d")
            fecha_f = datetime.strptime(v, "%Y-%m-%d")
            if fecha_f < fecha_i:
                raise ValueError("fecha_fin no puede ser anterior a fecha_inicio")
            if (fecha_f - fecha_i).days > 366:
                raise ValueError("el rango no puede superar 366 días")
        return v


# ------------------------------------------------------------------ simulación

def _consumo_simulado(hora: int) -> float:
    """Consumo fake con forma de campana diaria (pico por la tarde/noche).

    Temporal: se usa solo mientras no exista modelo.pkl. Rango plausible del
    dataset real: 18,000 a 41,000 MW.
    """
    base = 28700 + 9000 * math.sin(((hora - 7) / 24) * 2 * math.pi)
    return round(base + random.uniform(-3000, 3000), 2)


# ------------------------------------------------------------- modelo (Parte 1)

def cargar_modelo() -> None:
    """Carga modelo.pkl UNA vez al arrancar (primero el del backend, luego el de Parte 1)."""
    global modelo
    for ruta in (MODELO_PKL, MODELO_PKL_PARTE1):
        if ruta.exists():
            modelo = joblib.load(ruta)
            break


def predecir_consumo(fecha: str, hora: int) -> float:
    """Usa el modelo real si está cargado; si no, consumo simulado."""
    if modelo is not None:
        features = extract_features(fecha, hora)
        return round(float(modelo.predict([features])[0]), 2)
    return _consumo_simulado(hora)


def predecir_consumos(pares: list) -> list:
    """Predice muchas (fecha, hora) de una sola vez (vectorizado, más rápido)."""
    if modelo is not None:
        X = [extract_features(fecha, hora) for fecha, hora in pares]
        return [round(float(v), 2) for v in modelo.predict(X)]
    return [_consumo_simulado(hora) for _, hora in pares]


# ------------------------------------------------- consumo real histórico (4b)

def _cargar_historico():
    """Lee el dataset de Parte 1 como {("YYYY-MM-DD", hora): consumo_real}.

    El campo `time` es hora local tipo "2015-01-01 00:00:00+01:00": fecha y hora
    se extraen por slicing para no romper con timezones mezcladas (+01:00 en
    invierno, +02:00 en verano), que pandas 3.x rechaza en pd.to_datetime.
    Devuelve None si el dataset aún no existe (consumo_real = null).
    """
    if not DATASET_CSV.exists():
        return None
    try:
        df = pd.read_csv(DATASET_CSV, usecols=["time", "total load actual"])
        fecha = pd.to_datetime(df["time"].str.slice(0, 10), errors="coerce")
        hora = pd.to_numeric(df["time"].str.slice(11, 13), errors="coerce")
        df = pd.DataFrame(
            {"fecha": fecha, "hora": hora, "consumo": df["total load actual"]}
        ).dropna()
        return {
            (t.date().isoformat(), int(h)): round(float(c), 2)
            for t, h, c in zip(df["fecha"], df["hora"], df["consumo"])
        }
    except Exception:
        return None


def buscar_consumo_real(fecha: str, hora: int):
    """Consumo real histórico; None si la fecha no está en el dataset o no hay dataset."""
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
    return {"consumo_predicho": predecir_consumo(req.fecha, req.hora), "unidad": "MW"}


@app.post("/predict/24h")
def predict_24h(req: FechaRequest):
    consumos = [{"hora": h, "consumo_predicho": predecir_consumo(req.fecha, h)} for h in range(24)]
    return {"fecha": req.fecha, "unidad": "MW", "consumos": consumos}


@app.post("/predict/real")
def predict_real(req: PredictRequest):
    return {
        "fecha": req.fecha,
        "hora": req.hora,
        "consumo_predicho": predecir_consumo(req.fecha, req.hora),
        "consumo_real": buscar_consumo_real(req.fecha, req.hora),
        "unidad": "MW",
    }


@app.post("/predict/rango")
def predict_rango(req: RangoRequest):
    inicio = datetime.strptime(req.fecha_inicio, "%Y-%m-%d").date()
    fin = datetime.strptime(req.fecha_fin, "%Y-%m-%d").date()
    fechas = []
    pares = []
    dia = inicio
    while dia <= fin:
        fecha_iso = dia.isoformat()
        fechas.append(fecha_iso)
        pares.extend((fecha_iso, h) for h in range(24))
        dia = dia.fromordinal(dia.toordinal() + 1)

    predichos = predecir_consumos(pares)
    dias = []
    for i, fecha_iso in enumerate(fechas):
        consumos = [
            {"hora": h, "consumo_predicho": predichos[i * 24 + h]}
            for h in range(24)
        ]
        dias.append({"fecha": fecha_iso, "consumos": consumos})
    return {
        "fecha_inicio": req.fecha_inicio,
        "fecha_fin": req.fecha_fin,
        "unidad": "MW",
        "dias": dias,
    }
