# Proyecto: Predicción de Consumo Eléctrico

**Materia:** Minería de Datos (Prof. Lourdes Merino)
**Entrega:** Martes
**Stack:** Backend en Python (FastAPI) + Frontend en React
**Dataset:** [Hourly energy demand, generation and weather (España)](https://www.kaggle.com/datasets/nicholasjhana/energy-consumption-generation-prices-and-weather) — Kaggle, por nicholasjhana

---

## 1. Objetivo del proyecto

Construir una página web que prediga el **consumo eléctrico (MW)** a partir de una fecha y hora que el usuario ingresa en un formulario, y que muestre una gráfica del consumo de las 24 horas del día seleccionado. El modelo se entrena una sola vez con datos históricos del dataset (`total load actual`) y luego se consume desde una API.

---

## 2. Estructura de carpetas

Como cada parte es independiente, cada quien puede trabajar en su propia carpeta sin pisar el trabajo de los demás. Estructura sugerida para el repo compartido:

```
prediccion-consumo-luz/
├── modelo/                      # Parte 1 — Datos y Modelo
│   ├── data/
│   │   └── energy_dataset.csv   # dataset de Kaggle (NO subir a git, ver sección 6)
│   ├── notebooks/
│   │   └── eda_entrenamiento.ipynb
│   ├── modelo.pkl               # se genera al entrenar, esto SÍ se entrega/comparte
│   └── requirements.txt
│
├── backend/                     # Parte 2 — API
│   ├── main.py                  # FastAPI app + endpoint /predict
│   ├── preprocessing.py         # extract_features(), importa lógica de Parte 1
│   ├── modelo.pkl               # copia del modelo entrenado por Parte 1
│   └── requirements.txt
│
└── frontend/                    # Parte 3 — React
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   └── FormPrediccion.jsx
    │   └── api/
    │       └── predict.js       # predict(), predictions24h(), comparar(), predictRango() (fetch reales)
    ├── package.json
    └── vite.config.js
```

Cada carpeta (`modelo/`, `backend/`, `frontend/`) es prácticamente un proyecto aparte con su propio entorno — así cada integrante instala sus dependencias sin afectar a los demás.

---

## 3. Cómo está dividido el proyecto

El proyecto se divide en **3 partes independientes entre sí**. Ninguna depende de que otra esté terminada para poder empezar, gracias a que todas trabajan contra un **contrato fijo** definido desde el inicio (ver sección 3). Cada quien puede desarrollar y probar su parte por separado, y al final se integran en minutos.

### Parte 1 — Datos y Modelo (Minería de Datos)

**No depende de nada más.** Trabaja directo con el dataset descargado.

Responsabilidades:
- Exploración de datos (EDA): revisar columnas, nulos, distribución del consumo
- Limpieza del dataset
- `preprocess_data(df)`: limpia y prepara el dataset completo para entrenamiento
- `extract_features(fecha, hora)`: convierte una fecha y hora en las features numéricas que el modelo espera (hora, día de la semana, mes, es_fin_de_semana). **Esta función se documenta tal cual para que Parte 2 la pueda replicar/importar.**
- Entrenar un modelo (sugerido: `RandomForestRegressor` de scikit-learn) usando esas features contra la columna `total load actual`
- Medir el error del modelo (MAE o RMSE) para reportar qué tan bueno es
- Guardar el modelo entrenado con `joblib.dump()` como `modelo.pkl`

**Entregable final:** el archivo `modelo.pkl` + la función `extract_features()` documentada (orden exacto de las columnas que espera el modelo) + un resumen del error obtenido.

### Parte 2 — Backend / API (FastAPI)

**No depende de que el modelo real ya exista.** El endpoint regresa un consumo simulado (rango plausible 18,000–41,000 MW) que cumple exactamente el contrato de la sección 3, pero al arrancar carga `modelo.pkl` (si existe) y predice contra el modelo real.

Responsabilidades:
- Armar el proyecto FastAPI con `CORSMiddleware` habilitado desde el día 1 (necesario para que React pueda conectarse en local)
- Endpoint `POST /predict` siguiendo el contrato exacto
- Validación de los datos de entrada (que `hora` esté entre 0 y 23, que `fecha` sea un formato válido) y manejo de errores como en el contrato
- `cargar_modelo()` carga el `modelo.pkl` una sola vez al arrancar (busca `backend/modelo.pkl` y luego `modelo/modelo.pkl`) y `predecir_consumo()` llama `modelo.predict()` usando `extract_features()` de Parte 1; mientras no exista el `.pkl`, usa consumo simulado.

**Entregable final:** API corriendo en local (ej. `http://localhost:8000`) con `/predict` funcionando contra el modelo real.

### Parte 3 — Frontend (React)

**Necesita que el backend esté corriendo en `http://localhost:8000`.** El frontend consume la API real desde `frontend/src/api/predict.js` (`predict()`, `predictions24h()`, `comparar()`, `predictRango()`).

Responsabilidades:
- Formulario con selector de fecha y hora
- Validación básica en el cliente (que se haya seleccionado fecha y hora antes de poder enviar)
- Mostrar el resultado de la predicción (`consumo_predicho` + `unidad`)
- Manejo del estado de error (si el backend regresa el JSON de error del contrato, mostrarlo de forma legible)
- Gráfica de las próximas 24 horas y comparación con el consumo real (`/predict/24h` y `/predict/real`)

**Entregable final:** interfaz funcional que consume la API real y muestra la predicción de consumo + la gráfica de 24 horas.

---

## 4. El contrato — `POST /predict`

Este formato es fijo y **no debe cambiar** sin que las 3 partes se pongan de acuerdo primero, porque es lo único que las conecta.

### Request

```json
{
  "fecha": "2026-08-11",
  "hora": 14
}
```

| Campo   | Tipo    | Formato / Rango       | Notas                                                        |
|---------|---------|------------------------|---------------------------------------------------------------|
| `fecha` | string  | ISO 8601 `"YYYY-MM-DD"` | El frontend siempre manda string, no un objeto `Date` de JS  |
| `hora`  | integer | 0 a 23                 | Solo hora completa, sin minutos (el dataset es horario)      |

### Response exitosa (200)

```json
{
  "consumo_predicho": 25385.12,
  "unidad": "MW"
}
```

| Campo             | Tipo   | Notas                                  |
|-------------------|--------|------------------------------------------|
| `consumo_predicho` | float  | Redondeado a 2 decimales, en megawatts  |
| `unidad`          | string | Fija, siempre `"MW"`                    |

### Response de error (400 / 422)

```json
{
  "error": "hora debe estar entre 0 y 23"
}
```

### Reglas obligatorias para las 3 partes

1. **Nombres de campo exactos**: `fecha` y `hora` (no `date`, no `fecha_seleccionada`, etc.)
2. **`hora` es integer, no string**: `14`, no `"14"`
3. **`Content-Type: application/json`** en ambos lados
4. **CORS habilitado** en el backend desde el inicio, porque React y FastAPI corren en puertos distintos en local

---

## 4b. Endpoints adicionales (mismo contrato base)

`fecha` y `hora` respetan las reglas de la sección 4 (ISO string, hora integer 0-23, misma forma de error).

**¿Quién lo implementa?** Estos endpoints los agrega **Parte 2 (backend)**. El frontend de Parte 3 ya los consume con mocks (no toca nada del servidor). `consumo_real` se lee del dataset histórico de Parte 1; si la fecha no está en el dataset, `consumo_real: null`.

### `POST /predict/24h` — predicción de las 24 horas de un día

Sirve para pintar la gráfica de las próximas 24 horas del frontend.

**Request:**
```json
{
  "fecha": "2026-08-11"
}
```

**Response 200:**
```json
{
  "fecha": "2026-08-11",
  "unidad": "MW",
  "consumos": [
    { "hora": 0, "consumo_predicho": 25385.12 },
    { "hora": 1, "consumo_predicho": 24382.0 },
    "...hasta el 23..."
  ]
}
```
`consumos` siempre tiene 24 elementos, de `hora: 0` a `hora: 23`. El frontend calcula la hora de mayor y menor consumo (no hace falta que lo haga el backend).

### `POST /predict/real` — comparación predicho vs real

Muestra cuánto acertó el modelo para una fecha pasada (demo de Minería de Datos). Para el backend: `consumo_real` se lee del dataset histórico; si la fecha no está en el dataset, manda `consumo_real: null`.

Request:
```json
{
  "fecha": "2026-08-11",
  "hora": 14
}
```

**Response 200:**
```json
{
  "fecha": "2026-08-11",
  "hora": 14,
  "consumo_predicho": 31200.5,
  "consumo_real": 30850.3,
  "unidad": "MW"
}
```

### `POST /predict/rango` — predicción de un rango de fechas

Sirve para la gráfica de tendencia del frontend: predice las 24 horas de **cada día** del rango.

**Request:**
```json
{
  "fecha_inicio": "2026-07-01",
  "fecha_fin": "2026-07-07"
}
```

**Response 200:**
```json
{
  "fecha_inicio": "2026-07-01",
  "fecha_fin": "2026-07-07",
  "unidad": "MW",
  "dias": [
    {
      "fecha": "2026-07-01",
      "consumos": [
        { "hora": 0, "consumo_predicho": 25385.12 },
        { "hora": 1, "consumo_predicho": 24382.0 },
        "...hasta el 23..."
      ]
    },
    "...uno por cada día del rango..."
  ]
}
```
`dias` tiene un elemento por día del rango (inclusive), cada uno con sus 24 `consumos`. El frontend calcula el día de mayor y menor consumo.

**Errores (422):** fecha con formato inválido, `fecha_fin` anterior a `fecha_inicio`, o rango mayor a 366 días.

---

## 5. Orden de trabajo sugerido

1. Acordar el contrato de la sección 3 con el equipo (ya está definido arriba, solo confirmarlo)
2. Cada quien arranca su parte en paralelo:
   - Parte 1 hace EDA → preprocesamiento → entrenamiento → guarda `modelo.pkl`
   - Parte 2 arma FastAPI con `/predict` (simulado hasta que llegue el `.pkl`)
   - Parte 3 arma el form de React consumiendo la API
3. Integración final: Parte 2 conecta el `modelo.pkl` real, Parte 3 ya está conectado al fetch real
4. Prueba end-to-end: llenar el form, ver que el consumo predicho llegue correctamente

---

## 6. Sobre las herramientas de desarrollo (opencode)

Este proyecto se programará usando **[opencode](https://opencode.ai)**, la misma herramienta que usarán los demás integrantes del equipo. Algunas razones:

- **Consistencia de equipo**: si todos usan la misma herramienta, es más fácil ayudarse entre compañeros, compartir prompts/configuraciones y que el código generado siga un estilo parecido.
- **Es un agente de terminal**: no depende de un IDE específico, así que cada quien lo puede correr en el editor que prefiera (VSCode, terminal sola, etc.) mientras trabaja su parte.
- **Permite iterar rápido sobre scaffolding**: para un proyecto con deadline al martes, sirve especialmente bien para generar la estructura inicial de carpetas/archivos y no perder tiempo en configuración manual.
- **Comprensión funcional del código generado**: como buena práctica, cada integrante debe leer y entender lo que opencode genera antes de darlo por bueno — no es copiar y pegar sin revisar.

### Cómo usar opencode para iniciar cada parte

Cada integrante corre opencode dentro de la carpeta de su parte y le da un prompt basado en su sección de este documento. Ejemplos de prompt inicial por parte:

**Para Parte 1 (Datos y Modelo):**
```
Ayúdame a iniciar un proyecto de Python para entrenar un modelo de predicción
de consumo eléctrico. Necesito: un entorno virtual, requirements.txt con pandas,
scikit-learn y joblib, y la estructura de carpetas data/ (para el dataset) y
model/ (para guardar el modelo entrenado). El dataset es
"energy-consumption-generation-prices-and-weather" de Kaggle.
```

**Para Parte 2 (Backend/API):**
```
Ayúdame a iniciar un proyecto de FastAPI. Necesito: un entorno virtual,
requirements.txt con fastapi, uvicorn, pandas, scikit-learn y joblib,
CORSMiddleware configurado desde el inicio, y un endpoint POST /predict
que por ahora regrese un consumo simulado en este formato:
{"consumo_predicho": 25385.12, "unidad": "MW"}
recibiendo como input {"fecha": "YYYY-MM-DD", "hora": 0-23}.
```

**Para Parte 3 (Frontend):**
```
Ayúdame a iniciar un proyecto de React con Vite. Necesito un formulario con
selector de fecha y hora y un botón de enviar, con una función predict()
que haga fetch a http://localhost:8000/predict para mostrar el consumo
{"consumo_predicho": 25385.12, "unidad": "MW"} siguiendo el contrato de la sección 4.
```

Cada quien puede pegarle a opencode este documento completo (o la sección que le corresponde) como contexto para que entienda el contrato y no se desvíe del formato acordado.

---

## 7. Dataset — link para todo el equipo

**Dataset:** Hourly energy demand, generation and weather (España)
**Link:** https://www.kaggle.com/datasets/nicholasjhana/energy-consumption-generation-prices-and-weather

Todos los integrantes deben descargar este mismo dataset (requiere cuenta de Kaggle, es gratis) para asegurar que todos trabajan con exactamente los mismos datos y columnas. Si le pasan este documento a opencode, ya tiene el link y el nombre exacto del dataset como contexto.

> Nota: el archivo CSV puede pesar varios MB — no debe subirse a git tal cual. Se recomienda agregar la carpeta `data/` (o el archivo `.csv`) al `.gitignore` de cada parte que lo use, para no inflar el repositorio.

---

## 8. Cómo correr el proyecto

Cada parte se corre por separado, en su propia carpeta y entorno.

**Parte 1 — Modelo** (en `modelo/`):
1. Descargar el dataset (sección 7) y dejar el CSV en `modelo/data/energy_dataset.csv`
2. `python -m venv .venv` (opcional, ya viene creado en el repo) e instalar `requirements.txt`
3. `.venv/Scripts/python train.py` → entrena y genera `modelo.pkl`

**Parte 2 — Backend** (en `backend/`):
1. Activa el entorno e instala `requirements.txt`
2. `.venv/Scripts/python -m uvicorn main:app --reload` → API en `http://localhost:8000`
3. Probar: `POST http://localhost:8000/predict` con `{"fecha": "2026-08-11", "hora": 14}`
4. Tests: `.venv/Scripts/python -m pytest`

**Parte 3 — Frontend** (en `frontend/`):
1. `npm install`
2. `npm run dev` → abre la URL que muestra Vite (consume el backend en `http://localhost:8000`; levántalo primero)

---

## 9. Checklist rápido antes de empezar

- [ ] Los 3 integrantes confirmaron el contrato de la sección 3
- [ ] Los 3 descargaron el mismo dataset (sección 6)
- [ ] Cada quien tiene su carpeta de trabajo separada (`backend/`, `frontend/`, o una carpeta aparte para el entrenamiento si Parte 1 la separa del backend)
- [ ] Se acordó dónde se juntará el código al final (un repo compartido en GitHub, por ejemplo) y quién hace la integración final