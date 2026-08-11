// Contrato base: {fecha: "YYYY-MM-DD", hora: 0-23} -> {precio_predicho, unidad}
// Contrato 24h: {fecha} -> {fecha, precios: [{hora, precio_predicho} x24], unidad}
// Contrato real: {fecha, hora} -> {fecha, hora, precio_predicho, precio_real|null, unidad}
//
// Conexión con el backend activada: estos tres fetch llaman a la API local.

async function pedir(url, body) {
  const resp = await fetch(`http://localhost:8000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || 'Error del servidor')
  return data
}

export async function predict(fecha, hora) {
  return pedir('/predict', { fecha, hora })
}

export async function fetchPredictions24h(fecha) {
  return pedir('/predict/24h', { fecha })
}

export async function fetchComparar(fecha, hora) {
  return pedir('/predict/real', { fecha, hora })
}
