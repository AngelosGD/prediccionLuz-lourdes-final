# Proyecto: Predicción de Precios de Luz

**Materia:** Minería de Datos (Prof. Lourdes Merino)
**Entrega:** Martes
**Stack:** Backend en Python (FastAPI) + Frontend en React
**Dataset:** [Hourly energy demand, generation and weather (España)](https://www.kaggle.com/datasets/nicholasjhana/energy-consumption-generation-prices-and-weather) — Kaggle, por nicholasjhana

---

## 1. Objetivo del proyecto

Construir una página web que prediga el precio de la luz (EUR/MWh) a partir de una fecha y hora que el usuario ingresa en un formulario. El modelo se entrena una sola vez con datos históricos del dataset y luego se consume desde una API.

---

## 2. Estructura de carpetas

Como cada parte es independiente, cada quien puede trabajar en su propia carpeta sin pisar el trabajo de los demás. Estructura sugerida para el repo compartido:

```
prediccion-precios-luz/
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
    │       └── predict.js       # aquí vive mockPredict() y luego el fetch real
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
- Exploración de datos (EDA): revisar columnas, nulos, distribución del precio
- Limpieza del dataset
- `preprocess_data(df)`: limpia y prepara el dataset completo para entrenamiento
- `extract_features(fecha, hora)`: convierte una fecha y hora en las features numéricas que el modelo espera (hora, día de la semana, mes, es_fin_de_semana). **Esta función se documenta tal cual para que Parte 2 la pueda replicar/importar.**
- Entrenar un modelo (sugerido: `RandomForestRegressor` de scikit-learn) usando esas features contra la columna `price actual`
- Medir el error del modelo (MAE o RMSE) para reportar qué tan bueno es
- Guardar el modelo entrenado con `joblib.dump()` como `modelo.pkl`

**Entregable final:** el archivo `modelo.pkl` + la función `extract_features()` documentada (orden exacto de las columnas que espera el modelo) + un resumen del error obtenido.

### Parte 2 — Backend / API (FastAPI)

**No depende de que el modelo real ya exista.** Mientras Parte 1 no entregue el `.pkl`, el endpoint regresa un precio simulado (ej. `random.uniform(40, 80)`) que cumple exactamente el contrato de la sección 3.

Responsabilidades:
- Armar el proyecto FastAPI con `CORSMiddleware` habilitado desde el día 1 (necesario para que React pueda conectarse en local)
- Endpoint `POST /predict` siguiendo el contrato exacto
- Validación de los datos de entrada (que `hora` esté entre 0 y 23, que `fecha` sea un formato válido) y manejo de errores como en el contrato
- Cuando Parte 1 entregue el `modelo.pkl`, se carga una sola vez al arrancar el servidor y se reemplaza la función que generaba el precio random por una que llama `modelo.predict()` usando `extract_features()` de Parte 1. Es el único cambio necesario.

**Entregable final:** API corriendo en local (ej. `http://localhost:8000`) con `/predict` funcionando contra el modelo real.

### Parte 3 — Frontend (React)

**No depende de que el backend esté corriendo.** Se desarrolla usando una función `mockPredict()` que regresa un JSON fake siguiendo exactamente el contrato de la sección 3, en vez de hacer un fetch real.

Responsabilidades:
- Formulario con selector de fecha y hora
- Validación básica en el cliente (que se haya seleccionado fecha y hora antes de poder enviar)
- Mostrar el resultado de la predicción (`precio_predicho` + `unidad`)
- Manejo del estado de error (si el backend regresa el JSON de error del contrato, mostrarlo de forma legible)
- Al final, cuando el backend de Parte 2 esté listo, se reemplaza `mockPredict()` por un `fetch('http://localhost:8000/predict', {...})` real. Es el único cambio necesario.

**Entregable final:** interfaz funcional que consume la API real y muestra la predicción.

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
  "precio_predicho": 62.35,
  "unidad": "EUR/MWh"
}
```

| Campo             | Tipo   | Notas                                  |
|-------------------|--------|------------------------------------------|
| `precio_predicho` | float  | Redondeado a 2 decimales                |
| `unidad`          | string | Fija, siempre `"EUR/MWh"`               |

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

## 5. Orden de trabajo sugerido

1. Acordar el contrato de la sección 3 con el equipo (ya está definido arriba, solo confirmarlo)
2. Cada quien arranca su parte en paralelo:
   - Parte 1 hace EDA → preprocesamiento → entrenamiento → guarda `modelo.pkl`
   - Parte 2 arma FastAPI con `/predict` mockeado
   - Parte 3 arma el form de React con `mockPredict()`
3. Integración final: Parte 2 conecta el `modelo.pkl` real, Parte 3 conecta el fetch real
4. Prueba end-to-end: llenar el form, ver que el precio predicho llegue correctamente

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
de precios de luz. Necesito: un entorno virtual, requirements.txt con pandas,
scikit-learn y joblib, y la estructura de carpetas data/ (para el dataset) y
model/ (para guardar el modelo entrenado). El dataset es
"energy-consumption-generation-prices-and-weather" de Kaggle.
```

**Para Parte 2 (Backend/API):**
```
Ayúdame a iniciar un proyecto de FastAPI. Necesito: un entorno virtual,
requirements.txt con fastapi, uvicorn, pandas, scikit-learn y joblib,
CORSMiddleware configurado desde el inicio, y un endpoint POST /predict
que por ahora regrese un precio simulado en este formato:
{"precio_predicho": 62.35, "unidad": "EUR/MWh"}
recibiendo como input {"fecha": "YYYY-MM-DD", "hora": 0-23}.
```

**Para Parte 3 (Frontend):**
```
Ayúdame a iniciar un proyecto de React con Vite. Necesito un formulario con
selector de fecha y hora, un botón de enviar, y una función mockPredict()
que regrese un JSON fake tipo
{"precio_predicho": 62.35, "unidad": "EUR/MWh"} para poder desarrollar
la interfaz sin depender del backend todavía.
```

Cada quien puede pegarle a opencode este documento completo (o la sección que le corresponde) como contexto para que entienda el contrato y no se desvíe del formato acordado.

---

## 7. Dataset — link para todo el equipo

**Dataset:** Hourly energy demand, generation and weather (España)
**Link:** https://www.kaggle.com/datasets/nicholasjhana/energy-consumption-generation-prices-and-weather

Todos los integrantes deben descargar este mismo dataset (requiere cuenta de Kaggle, es gratis) para asegurar que todos trabajan con exactamente los mismos datos y columnas. Si le pasan este documento a opencode, ya tiene el link y el nombre exacto del dataset como contexto.

> Nota: el archivo CSV puede pesar varios MB — no debe subirse a git tal cual. Se recomienda agregar la carpeta `data/` (o el archivo `.csv`) al `.gitignore` de cada parte que lo use, para no inflar el repositorio.

---

## 8. Checklist rápido antes de empezar

- [ ] Los 3 integrantes confirmaron el contrato de la sección 3
- [ ] Los 3 descargaron el mismo dataset (sección 6)
- [ ] Cada quien tiene su carpeta de trabajo separada (`backend/`, `frontend/`, o una carpeta aparte para el entrenamiento si Parte 1 la separa del backend)
- [ ] Se acordó dónde se juntará el código al final (un repo compartido en GitHub, por ejemplo) y quién hace la integración final