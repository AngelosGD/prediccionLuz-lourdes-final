// Contrato base: {fecha: "YYYY-MM-DD", hora: 0-23} -> {consumo_predicho, unidad: "MW"}
// Contrato 24h: {fecha} -> {fecha, unidad: "MW", consumos: [{hora, consumo_predicho} x24]}
// Contrato real: {fecha, hora} -> {fecha, hora, consumo_predicho, consumo_real|null, unidad: "MW"}
// Contrato rango: {fecha_inicio, fecha_fin} -> {fecha_inicio, fecha_fin, unidad: "MW",
//   dias: [{fecha, consumos: [{hora, consumo_predicho} x24]}]}

const API_BASE = 'http://localhost:8000'

async function peticion(ruta, body) {
  const resp = await fetch(`${API_BASE}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || 'Error del servidor')
  return data
}

export function predict(fecha, hora) {
  return peticion('/predict', { fecha, hora })
}

export function predictions24h(fecha) {
  return peticion('/predict/24h', { fecha })
}

export function comparar(fecha, hora) {
  return peticion('/predict/real', { fecha, hora })
}

export function predictRango(fechaInicio, fechaFin) {
  return peticion('/predict/rango', { fecha_inicio: fechaInicio, fecha_fin: fechaFin })
}
