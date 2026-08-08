// Contrato: {fecha: "YYYY-MM-DD", hora: 0-23} -> {precio_predicho: number, unidad: "EUR/MWh"}
// Mientras no haya backend listo, solo usamos mockPredict().
// Después se reemplaza por el fetch real al backend:

// export async function predict(fecha, hora) {
//   const resp = await fetch("http://localhost:8000/predict", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ fecha, hora }),
//   });
//   const data = await resp.json()
//   if (!resp.ok) throw new Error(data.error || "Error del servidor")
//   return data
// }

export function mockPredict(fecha, hora) {
  void fecha
  void hora
  return new Promise((resolve) => {
    setTimeout(() => {
      const precio = Math.round((40 + Math.random() * 40) * 100) / 100
      resolve({ precio_predicho: precio, unidad: "EUR/MWh" })
    }, 600)
  })
}