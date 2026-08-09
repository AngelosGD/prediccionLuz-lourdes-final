# AGENTS.md

Proyecto académico: Predicción de Precios de Luz (Minería de Datos). Backend Python/FastAPI + Frontend React. El README.md es la fuente de verdad del proyecto; lee la sección correspondiente antes de tocar código.

## Estructura y límites

- **3 partes independientes**, cada una casi un proyecto aparte con su propio entorno: `modelo/` (datos + entrenamiento), `backend/` (FastAPI), `frontend/` (React + Vite).
- **`modelo/` está SIN código** (solo `requirements.txt`): lo hace el integrante de Parte 1. El frontend NO toca backend ni modelo.
- **`backend/` ya está implementado**: `main.py` (FastAPI + CORS + los 3 endpoints con mocks), `preprocessing.py` (`extract_features` provisional), `tests/test_api.py` (9 tests, `pytest`). Cuando Parte 1 entregue `modelo.pkl`, se coloca en `backend/` y al arrancar se carga solo (ver `cargar_modelo()` en `main.py`); el resto no cambia.
- Las partes se integran ÚNICAMENTE vía el contrato de `POST /predict` (README sección 4) + endpoints de la sección 4b. No acoplar código entre partes.
- Fallback por diseño: frontend usa `mockPredict()`, `mockPredictions24h()` y `mockComparar()` en `frontend/src/api/predict.js` hasta que el backend esté listo. El único cambio futuro es activar los fetch reales (quedan comentados).

## Contrato de la API (no cambiar sin acuerdo de las 3 partes)

- `POST /predict`: `{"fecha": "YYYY-MM-DD", "hora": 0-23}` → `{"precio_predicho": 62.35, "unidad": "EUR/MWh"}`. `hora` es integer (`14`, no `"14"`), `fecha` siempre string ISO, nunca `Date` de JS.
- Error (400/422): `{"error": "hora debe estar entre 0 y 23"}`.
- Nombres de campo exactos: `fecha`, `hora`, `precio_predicho`, `unidad`.
- Endpoints nuevos (para backend): `POST /predict/24h` y `POST /predict/real` — ver README sección 4b. El frontend ya los consume con mocks.

## Gotchas técnicos

- El frontend mapea el contrato del error del backend: si `resp.ok` es falso, lee `data.error` y lo muestra en pantalla.
- `precio_real` en `/predict/real` puede ser `null` (no hay dato histórico): el frontend muestra "Sin dato real aún".
- El CSV del dataset pesa varios MB: **no subirlo a git**, el `.gitignore` raíz ignora `*.csv` y `modelo/data/`.
- El `modelo.pkl` (joblib) se carga UNA vez al arrancar el backend (busca `backend/modelo.pkl` y luego `modelo/modelo.pkl`); mientras no exista, usa precio simulado.

## Comandos

- `frontend/`: `npm run dev` (Vite); build: `npm run build`; lint: `npm run lint` (oxlint); tests: `npm test` (Vitest + Testing Library, `vi.mock` a `./api/predict`, no necesitan backend).
- `backend/` (desde `backend/`): servidor `.venv/bin/python -m uvicorn main:app --reload` (puerto 8000); tests `.venv/bin/python -m pytest tests`.
- `modelo/`: sin código aún; consultar README para lo que debe crear Parte 1.

## Convenciones

- Documento (README) y UI en español; respeta ese idioma.
- Integración final: prueba end-to-end llenando el form (fecha+hora) y verificando que llegue `precio_predicho`.