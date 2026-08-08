"""FastAPI que expone POST /predict siguiendo el contrato del README (sección 4).

Por ahora regresa un precio simulado: cambio exacto es cargar modelo.pkl una
vez al arrancar y llamar modelo.predict() con las features de preprocessing.py.
"""
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


@app.get("/")
def root():
    return {"mensaje": "API de predicción de precios de luz"}


@app.post("/predict")
def predict(body: PredictRequest):
    try:
        datetime.strptime(body.fecha, "%Y-%m-%d")
    except ValueError:
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
    precio = round(random.uniform(40, 80), 2)
    return {"precio_predicho": precio, "unidad": "EUR/MWh"}