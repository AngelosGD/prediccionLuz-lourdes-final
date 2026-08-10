# AGENTS.md

Proyecto académico: Predicción de Precios de Luz (Minería de Datos). Backend Python/FastAPI + Frontend React. El README.md es la fuente de verdad del proyecto; lee la sección correspondiente antes de tocar código.

## Estructura y límites

- **3 partes independientes**, cada una casi un proyecto aparte con su propio entorno: `modelo/` (datos + entrenamiento), `backend/` (FastAPI), `frontend/` (React + Vite).
- **`modelo/`** contiene el entrenamiento (Parte 1): `train.py` (RandomForest, features `[hora, dia_semana, mes, es_fin_de_semana]`), `data/energy_dataset.csv` (gitignored) y `modelo.pkl` (joblib). El frontend NO toca backend ni modelo.
- **`backend/` ya está implementado**: `main.py` (FastAPI + CORS + los 3 endpoints), `preprocessing.py` (`extract_features`), `tests/test_api.py` (9 tests, `pytest`). Al arrancar, `cargar_modelo()` en `main.py` busca `backend/modelo.pkl` y luego `modelo/modelo.pkl` (ya existe, entregado por Parte 1) y lo carga solo.
- Las partes se integran ÚNICAMENTE vía el contrato de `POST /predict` (README sección 4) + endpoints de la sección 4b. No acoplar código entre partes.
- **La integración ya está hecha**: `frontend/src/api/predict.js` usa los fetch reales a `http://localhost:8000` (`predict`, `fetchPredictions24h`, `fetchComparar`). Los mocks (`mockPredict`, etc.) se conservan exportados para tests y desarrollo sin backend.

## Contrato de la API (no cambiar sin acuerdo de las 3 partes)

- `POST /predict`: `{"fecha": "YYYY-MM-DD", "hora": 0-23}` → `{"precio_predicho": 62.35, "unidad": "EUR/MWh"}`. `hora` es integer (`14`, no `"14"`), `fecha` siempre string ISO, nunca `Date` de JS.
- Error (400/422): `{"error": "hora debe estar entre 0 y 23"}`.
- Nombres de campo exactos: `fecha`, `hora`, `precio_predicho`, `unidad`.
- Endpoints nuevos: `POST /predict/24h` y `POST /predict/real` — ver README sección 4b. El frontend ya los consume con los fetch reales.

## Gotchas técnicos

- El frontend mapea el contrato del error del backend: si `resp.ok` es falso, lee `data.error` y lo muestra en pantalla.
- `precio_real` en `/predict/real` puede ser `null` (no hay dato histórico): el frontend muestra "Sin dato real aún".
- `/predict/real` lee el histórico de `modelo/data/energy_dataset.csv` exigiendo las columnas `time` (formato `"2015-01-01 00:00:00+01:00"`, hora local) y `price actual`; si el archivo no existe o cambian los nombres de columna, falla en silencio y devuelve `precio_real: null` (no rompe la API). `_cargar_historico()` extrae fecha/hora por slicing porque pandas 3.x rechaza timezones mezcladas (`+01:00`/`+02:00`) en `pd.to_datetime`.
- El CSV del dataset pesa varios MB: **no subirlo a git**, el `.gitignore` raíz ignora `*.csv` y `modelo/data/`.
- El `modelo.pkl` (joblib) se carga UNA vez al arrancar el backend (busca `backend/modelo.pkl` y luego `modelo/modelo.pkl`); mientras no exista, usa precio simulado.
- `extract_features()` en `backend/preprocessing.py` es provisional con orden `[hora, día_semana, mes, es_fin_de_semana]`. Cuando Parte 1 entregue el modelo, ese orden debe coincidir exactamente con el de entrenamiento o las predicciones fallan en silencio.

## Comandos

- `frontend/`: `npm install`; dev: `npm run dev` (Vite); build: `npm run build`; lint: `npm run lint` (oxlint); tests: `npm test` (Vitest, `vi.mock` a `./api/predict`, no necesitan backend); test único: `npx vitest run src/App.test.jsx`.
- `backend/` (desde `backend/`): servidor `.venv\Scripts\python -m uvicorn main:app --reload` (puerto 8000, Windows usa `Scripts/`, no `bin/`); tests `.venv\Scripts\python -m pytest tests` (el `conftest.py` de la raíz hace importable `main`, pytest corre desde `backend/`); test único: `.venv\Scripts\python -m pytest tests/test_api.py::test_predict_exitoso`.
- `modelo/`: entrenamiento con `train.py` (`.venv\Scripts\python train.py`, requiere `data/energy_dataset.csv`).

## Convenciones

- Documento (README) y UI en español; respeta ese idioma.
- Integración final: prueba end-to-end llenando el form (fecha+hora) y verificando que llegue `precio_predicho`.