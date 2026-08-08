// Contrato base: {fecha: "YYYY-MM-DD", hora: 0-23} -> {precio_predicho, unidad}
// Contrato 24h: {fecha} -> {fecha, precios: [{hora, precio_predicho} x24], unidad}
// Contrato real: {fecha, hora} -> {fecha, hora, precio_predicho, precio_real|null, unidad}
//
// Mientras no haya backend listo, solo usamos los mocks.
// Cuando el backend exista, se reemplazan por los fetch reales (eso lo deja
// claro para la parte de backend; el frontend solo cambia estas funciones).

// export async function predict(fecha, hora) {
//   const resp = await fetch("http://localhost:8000/predict", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ fecha, hora }),
//   })
//   const data = await resp.json()
//   if (!resp.ok) throw new Error(data.error || "Error del servidor")
//   return data
// }

// export async function fetchPredictions24h(fecha) {
//   const resp = await fetch("http://localhost:8000/predict/24h", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ fecha }),
//   })
//   const data = await resp.json()
//   if (!resp.ok) throw new Error(data.error || "Error del servidor")
//   return data
// }

// export async function fetchComparar(fecha, hora) {
//   const resp = await fetch("http://localhost:8000/predict/real", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ fecha, hora }),
//   })
//   const data = await resp.json()
//   if (!resp.ok) throw new Error(data.error || "Error del servidor")
//   return data
// }

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
        // precio_real: null mientras no haya dataset histórico en backend
        precio_real: null,
        unidad: 'EUR/MWh',
      })
    }, 600)
  })
}