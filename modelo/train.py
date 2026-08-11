"""Entrenamiento del modelo de predicción de consumo eléctrico (Parte 1).

Uso (desde modelo/):
    .venv/Scripts/python train.py

Genera modelo.pkl con joblib (predice total load actual, en MW). El orden de
features DEBE coincidir con el que usa el backend en extract_features():
[hora, día_semana, mes, es_fin_de_semana].
"""

from datetime import date
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATASET_CSV = BASE_DIR / "data" / "energy_dataset.csv"
MODELO_PKL = BASE_DIR / "modelo.pkl"
RANDOM_STATE = 42

# Orden fijo: igual que backend/preprocessing.py (no cambiar entre partes)
FEATURES = ["hora", "dia_semana", "mes", "es_fin_de_semana"]


def extract_features(fecha: str, hora: int) -> list[float]:
    """Misma firma y orden que backend/preprocessing.py (provisional de Parte 2)."""
    d = date.fromisoformat(fecha)
    es_fin_de_semana = 1 if d.weekday() >= 5 else 0
    return [float(hora), float(d.weekday()), float(d.month), float(es_fin_de_semana)]


def cargar_y_limpiar():
    df = pd.read_csv(DATASET_CSV)
    df = df[["time", "total load actual"]].dropna(subset=["total load actual"])

    fecha = pd.to_datetime(df["time"].str.slice(0, 10), errors="coerce")
    hora = pd.to_numeric(df["time"].str.slice(11, 13), errors="coerce")
    df = pd.DataFrame(
        {
            "hora": hora,
            "dia_semana": fecha.dt.weekday,
            "mes": fecha.dt.month,
            "es_fin_de_semana": (fecha.dt.weekday >= 5).astype(int),
            "total load actual": df["total load actual"],
        }
    ).dropna()

    y = df["total load actual"]
    X = df[FEATURES]
    return X, y


def main():
    X, y = cargar_y_limpiar()
    print(f"Filas: {len(X):,}  (rango de datos con los que se entrena)")

    X_train, X_test, y_train, y_test = train_test_split(
        X.to_numpy(), y.to_numpy(), test_size=0.2,
        random_state=RANDOM_STATE, shuffle=True,
    )

    modelo = RandomForestRegressor(
        n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1
    )
    modelo.fit(X_train, y_train)

    pred = modelo.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    rmse = mean_squared_error(y_test, pred) ** 0.5
    r2 = modelo.score(X_test, y_test)
    print(f"MAE : {mae:.3f} MW")
    print(f"RMSE: {rmse:.3f} MW")
    print(f"R2  : {r2:.4f}")

    # Reentrenar con todo el dataset para el .pkl (orden de FEATURES)
    modelo.fit(X.to_numpy(), y.to_numpy())
    joblib.dump(modelo, MODELO_PKL)
    print(f"\nModelo guardado en: {MODELO_PKL}")
    print(f"Orden de features: {FEATURES}")


if __name__ == "__main__":
    main()