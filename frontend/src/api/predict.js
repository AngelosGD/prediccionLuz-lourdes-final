// Contrato base: {fecha: "YYYY-MM-DD", hora: 0-23} -> {precio_predicho, unidad}
// Contrato 24h: {fecha} -> {fecha, precios: [{hora, precio_predicho} x24], unidad}
// Contrato real: {fecha, hora} -> {fecha, hora, precio_predicho, precio_real|null, unidad}
//
// Conexión con el backend activada: estos tres fetch llaman a la API local.
// Los mocks (mockPredict, mockPredictions24h, mockComparar) se conservan por
// si se quiere desarrollar sin backend o para los tests (que los mockean).

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

// ---------------------------------------------------------------- mocks

// Precio simulado con forma de campana diaria (pico por la tarde).
function precioSimulado(hora) {
  return Number(
    (55 + 16 * Math.sin(((hora - 7) / 24) * 2 * Math.PI) + (Math.random() * 8 - 4)).toFixed(2),
  )
}

export function mockPredict(fecha, hora) {
  void fecha
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ precio_predicho: precioSimulado(hora), unidad: 'EUR/MWh' })
    }, 600)
  })
}

export function mockPredictions24h(fecha) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const precios = Array.from({ length: 24 }, (_, h) => ({
        hora: h,
        precio_predicho: precioSimulado(h),
      }))
      resolve({ fecha, precios, unidad: 'EUR/MWh' })
    }, 600)
  })
}

export function mockComparar(fecha, hora) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        fecha,
        hora,
        precio_predicho: precioSimulado(hora),
        precio_real: null,
        unidad: 'EUR/MWh',
      })
    }, 600)
  })
}