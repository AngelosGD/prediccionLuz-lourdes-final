# AGENTS.md

Proyecto académico: Predicción de Consumo Eléctrico (Minería de Datos). Backend Python/FastAPI + Frontend React. El README.md es la fuente de verdad del proyecto; lee la sección correspondiente antes de tocar código.

## Estructura y límites

- **3 partes independientes**, cada una casi un proyecto aparte con su propio entorno: `modelo/` (datos + entrenamiento), `backend/` (FastAPI), `frontend/` (React + Vite).
- **`modelo/`** contiene el entrenamiento (Parte 1): `train.py` (RandomForest, features `[hora, dia_semana, mes, es_fin_de_semana]`), `data/energy_dataset.csv` (gitignored) y `modelo.pkl` (joblib). El frontend NO toca backend ni modelo.
- **`backend/` ya está implementado**: `main.py` (FastAPI + CORS + los 3 endpoints), `preprocessing.py` (`extract_features`), `tests/test_api.py` (9 tests, `pytest`). Al arrancar, `cargar_modelo()` en `main.py` busca `backend/modelo.pkl` y luego `modelo/modelo.pkl` (ya existe, entregado por Parte 1) y lo carga solo.
- Las partes se integran ÚNICAMENTE vía el contrato de `POST /predict` (README sección 4) + endpoints de la sección 4b. No acoplar código entre partes.
- El frontend consume el backend real desde `frontend/src/api/predict.js` con `predict()`, `predictions24h()`, `comparar()` y `predictRango()` (fetch a `http://localhost:8000`). No hay mocks: el backend debe estar corriendo para que la UI muestre datos.

## Contrato de la API (no cambiar sin acuerdo de las 3 partes)

- `POST /predict`: `{"fecha": "YYYY-MM-DD", "hora": 0-23}` → `{"consumo_predicho": 25385.12, "unidad": "MW"}`. `hora` es integer (`14`, no `"14"`), `fecha` siempre string ISO, nunca `Date` de JS.
- Error (400/422): `{"error": "hora debe estar entre 0 y 23"}`.
- Nombres de campo exactos: `fecha`, `hora`, `consumo_predicho`, `unidad` (`"MW"`). En `/predict/real` también `consumo_real`. En `/predict/24h` el array es `consumos` con `{hora, consumo_predicho}`.
- `POST /predict/rango`: `{"fecha_inicio", "fecha_fin"}` → `{"fecha_inicio", "fecha_fin", "unidad": "MW", "dias": [{fecha, consumos: [{hora, consumo_predicho} x24]}]}`. 422 si `fecha_fin < fecha_inicio` o rango > 366 días. El frontend lo consume con `predictRango`.
- Endpoints nuevos (para backend): `POST /predict/24h` y `POST /predict/real` — ver README sección 4b. El frontend ya los consume con los fetch reales.

## Gotchas técnicos

- El frontend mapea el contrato del error del backend: si `resp.ok` es falso, lee `data.error` y lo muestra en pantalla.
- `consumo_real` en `/predict/real` puede ser `null` (no hay dato histórico): el frontend muestra "Sin dato real aún".
- `/predict/real` lee el histórico de `modelo/data/energy_dataset.csv` exigiendo las columnas `time` (formato `"2015-01-01 00:00:00+01:00"`, hora local) y `total load actual`; si el archivo no existe o cambian los nombres de columna, falla en silencio y devuelve `consumo_real: null` (no rompe la API). `_cargar_historico()` extrae fecha/hora por slicing porque pandas 3.x rechaza timezones mezcladas (`+01:00`/`+02:00`) en `pd.to_datetime`.
- El CSV del dataset pesa varios MB: **no subirlo a git**, el `.gitignore` raíz ignora `*.csv` y `modelo/data/`.
- Hay una copia huérfana y accidental del dataset en la raíz (`energy_dataset.csv/`); está gitignored, es ruido no versionado y el backend/train.py sólo leen `modelo/data/energy_dataset.csv`. No la confundas con la fuente real.
- El `modelo.pkl` (joblib) se carga UNA vez al arrancar el backend (busca `backend/modelo.pkl` y luego `modelo/modelo.pkl`); mientras no exista, usa consumo simulado.
- `extract_features()` está DUPLICADA a propósito: en `backend/preprocessing.py` y en `modelo/train.py` (ambas con orden `[hora, día_semana, mes, es_fin_de_semana]`). Si cambias una, cambia la otra en paralelo o las predicciones fallan en silencio.

## Comandos

- `frontend/` (npm ya instalado, `node_modules` presente): dev: `npm run dev` (Vite); build: `npm run build`; lint: `npm run lint` (oxlint); tests: `npm test` (Vitest, `vi.mock` a `./api/predict`, no necesitan backend); test único: `npx vitest run src/App.test.jsx`.
- `backend/` (desde `backend/`; `.venv` ya creado): setup inicial `python -m venv .venv` + `.venv\Scripts\pip install -r requirements.txt`; servidor `.venv\Scripts\python -m uvicorn main:app --reload` (puerto 8000, Windows usa `Scripts/`, no `bin/`); tests `.venv\Scripts\python -m pytest tests` (el `conftest.py` de `backend/` hace importable `main`, pytest corre desde `backend/`); test único: `.venv\Scripts\python -m pytest tests/test_api.py::test_predict_exitoso`.
- `modelo/` (desde `modelo/`; `.venv` ya creado, requiere `data/energy_dataset.csv`): reentrenar y regenerar `modelo.pkl` con `.venv\Scripts\python train.py` (RandomForest, al final reentrena con todo el dataset y guarda el `.pkl`).

## Convenciones

- Documento (README) y UI en español; respeta ese idioma.
- Integración final: prueba end-to-end llenando el form (fecha+hora) y verificando que llegue `consumo_predicho`.