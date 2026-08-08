import { useState } from 'react'
import { mockComparar } from '../api/predict'

const HORAS = Array.from({ length: 24 }, (_, i) => i)

export default function ComparacionReal() {
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [cargando, setCargando] = useState(false)
  const [comparacion, setComparacion] = useState(null)
  const [error, setError] = useState(null)

  const valido = fecha !== '' && hora !== '' && !cargando

  const handleComparar = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    setComparacion(null)
    try {
      const r = await mockComparar(fecha, Number(hora))
      setComparacion(r)
    } catch (err) {
      setError(err.message || 'Error al comparar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Comparación con el precio real</h2>
      <p className="descripcion">
        Para fechas pasadas, mira qué tan acertada fue la predicción del modelo.
      </p>

      <form className="fila" onSubmit={handleComparar}>
        <input
          type="date"
          value={fecha}
          aria-label="Fecha de comparación"
          onChange={(e) => setFecha(e.target.value)}
        />
        <select
          value={hora}
          aria-label="Hora de comparación"
          onChange={(e) => setHora(e.target.value)}
        >
          <option value="">Hora...</option>
          {HORAS.map((h) => (
            <option key={h} value={h}>
              {h}:00
            </option>
          ))}
        </select>
        <button type="submit" disabled={!valido}>
          {cargando ? 'Comparando...' : 'Comparar'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {comparacion && (
        <div className="comparacion">
          <div className="item">
            <span>Predicho</span>
            <strong className="valor">
              {comparacion.precio_predicho} <span>{comparacion.unidad}</span>
            </strong>
          </div>
          <div className="item">
            <span>Real</span>
            {comparacion.precio_real != null ? (
              <strong className="valor">
                {comparacion.precio_real} <span>{comparacion.unidad}</span>
              </strong>
            ) : (
              <strong className="sin-dato">Sin dato real aún</strong>
            )}
          </div>
        </div>
      )}
    </section>
  )
}