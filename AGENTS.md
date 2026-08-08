# AGENTS.md

Proyecto académico: Predicción de Precios de Luz (Minería de Datos). Backend Python/FastAPI + Frontend React. El README.md es la fuente de verdad del proyecto; lee la sección correspondiente antes de tocar código.

## Estructura y límites

- **3 partes independientes**, cada una casi un proyecto aparte con su propio entorno: `modelo/` (datos + entrenamiento), `backend/` (FastAPI), `frontend/` (React + Vite).
- Las partes se integran ÚNICAMENTE vía el contrato de `POST /predict` (README sección 4). No acoplar código entre partes.
- Fallback por diseño: backend responde precio simulado hasta recibir `modelo.pkl`; frontend usa `mockPredict()` hasta que el backend esté listo. Ambos cambios son el único punto de integración.

## Contrato `POST /predict` (no cambiar sin acuerdo de las 3 partes)

- Request: `{"fecha": "YYYY-MM-DD", "hora": 0-23}`. `hora` es integer (`14`, no `"14"`), `fecha` siempre string ISO, nunca `Date` de JS.
- Response 200: `{"precio_predicho": 62.35, "unidad": "EUR/MWh"}` — `precio_predicho` redondeado a 2 decimales, `unidad` fija `"EUR/MWh"`.
- Error (400/422): `{"error": "hora debe estar entre 0 y 23"}`.
- Nombres de campo exactos: `fecha`, `hora`, `precio_predicho`, `unidad`.

## Gotchas técnicos

- **CORS habilitado desde el día 1** en FastAPI (`CORSMiddleware`): React y FastAPI corren en puertos distintos en local (`http://localhost:8000/predict`).
- `extract_features(fecha, hora)` de Parte 1 (modelo/): el orden exacto de columnas que el modelo espera está documentado tal cual porque `backend/preprocessing.py` lo replica/importa. Cambiarlo rompe el modelo.
- `modelo.pkl` se guarda con `joblib.dump()`; se carga UNA vez al arrancar el servidor.
- El CSV del dataset pesa varios MB: **no subirlo a git**, `.gitignore` de `data/` y el `.csv` en cada parte que lo use.

## Comandos

- `modelo/`: `.venv/Scripts/python train.py` (requiere `data/energy_dataset.csv` descargado de Kaggle). Python 3.14, pandas 3.x, scikit-learn 1.9.
- `backend/`: `.venv/Scripts/python -m uvicorn main:app --reload` (puerto 8000).
- `frontend/`: `npm run dev` (Vite); build de verificación con `npm run build`; tests de UI con `npm test` (Vitest + Testing Library, mockean a `mockPredict`, no necesitan backend).
- `extract_features` se puede probar con: `.venv/Scripts/python -c "from preprocessing import extract_features; print(extract_features('2026-08-11', 14))"`.

## Convenciones

- Documento (README) y UI en español; respeta ese idioma.
- Integración final: prueba end-to-end llenando el form (fecha+hora) y verificando que llegue `precio_predicho`.