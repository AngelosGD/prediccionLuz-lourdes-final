// Contrato base: {fecha: "YYYY-MM-DD", hora: 0-23} -> {consumo_predicho, unidad: "MW"}
// Contrato 24h: {fecha} -> {fecha, unidad: "MW", consumos: [{hora, consumo_predicho} x24]}
// Contrato real: {fecha, hora} -> {fecha, hora, consumo_predicho, consumo_real|null, unidad: "MW"}
// Contrato rango: {fecha_inicio, fecha_fin} -> {fecha_inicio, fecha_fin, unidad: "MW",
//   dias: [{fecha, consumos: [{hora, consumo_predicho} x24]}]}
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

// export async function fetchPredictRango(fechaInicio, fechaFin) {
//   const resp = await fetch("http://localhost:8000/predict/rango", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
//   })
//   const data = await resp.json()
//   if (!resp.ok) throw new Error(data.error || "Error del servidor")
//   return data
// }

// Consumo simulado con forma de campana diaria (pico por la tarde/noche),
// en el rango plausible del dataset: 18,000 a 41,000 MW.
function consumoSimulado(hora) {
  return Number(
    (28700 + 9000 * Math.sin(((hora - 7) / 24) * 2 * Math.PI) + (Math.random() * 3000 - 1500)).toFixed(2),
  )
}

export function mockPredict(fecha, hora) {
  void fecha
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ consumo_predicho: consumoSimulado(hora), unidad: 'MW' })
    }, 600)
  })
}

export function mockPredictions24h(fecha) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const consumos = Array.from({ length: 24 }, (_, h) => ({
        hora: h,
        consumo_predicho: consumoSimulado(h),
      }))
      resolve({ fecha, consumos, unidad: 'MW' })
    }, 600)
  })
}

export function mockComparar(fecha, hora) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        fecha,
        hora,
        consumo_predicho: consumoSimulado(hora),
        // consumo_real: null mientras no haya dataset histórico en backend
        consumo_real: null,
        unidad: 'MW',
      })
    }, 600)
  })
}

function sumarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + dias)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function mockPredictRango(fechaInicio, fechaFin) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const inicio = new Date(`${fechaInicio}T00:00:00`)
      const fin = new Date(`${fechaFin}T00:00:00`)
      const totalDias = Math.round((fin - inicio) / 86400000) + 1
      const dias = Array.from({ length: totalDias }, (_, i) => {
        const fecha = sumarDias(fechaInicio, i)
        return {
          fecha,
          consumos: Array.from({ length: 24 }, (_, h) => ({
            hora: h,
            consumo_predicho: consumoSimulado(h),
          })),
        }
      })
      resolve({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, unidad: 'MW', dias })
    }, 600)
  })
}
