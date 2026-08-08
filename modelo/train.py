"""Entrena un RandomForestRegressor contra 'price actual' y guarda modelo.pkl.

Uso: .venv/Scripts/python train.py  (con data/energy_dataset.csv descargado)
"""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.model_selection import train_test_split

from preprocessing import NOMBRES_FEATURES, preprocess_data

DATA_PATH = Path(__file__).parent / "data" / "energy_dataset.csv"
MODELO_PATH = Path(__file__).parent / "modelo.pkl"


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    df = preprocess_data(df)

    X = df[NOMBRES_FEATURES]
    y = df["price actual"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)
    print(f"MAE: {mae:.2f} EUR/MWh")
    print(f"RMSE: {rmse:.2f} EUR/MWh")

    joblib.dump(model, MODELO_PATH)
    print(f"Modelo guardado en: {MODELO_PATH}")


if __name__ == "__main__":
    main()