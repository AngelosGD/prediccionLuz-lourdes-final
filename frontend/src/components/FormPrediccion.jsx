import { useState } from 'react'

const HORAS = Array.from({ length: 24 }, (_, i) => i)
// Rango para evitar fechas absurdas en el input de fecha.
const FECHA_MIN = '2015-01-01'
const FECHA_MAX = '2099-12-31'

export default function FormPrediccion({ onEnviar, cargando }) {
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')

  const valido = fecha !== '' && hora !== '' && !cargando

  const handleSubmit = (e) => {
    e.preventDefault()
    if (valido) onEnviar(fecha, Number(hora))
  }

  return (
    <form className="formulario" onSubmit={handleSubmit}>
      <label>
        Fecha
        <input
          type="date"
          value={fecha}
          min={FECHA_MIN}
          max={FECHA_MAX}
          onChange={(e) => setFecha(e.target.value)}
        />
      </label>

      <label>
        Hora
        <select value={hora} onChange={(e) => setHora(e.target.value)}>
          <option value="">Elegir hora...</option>
          {HORAS.map((h) => (
            <option key={h} value={h}>
              {h}:00
            </option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={!valido}>
        {cargando ? 'Calculando...' : 'Predecir precio'}
      </button>
    </form>
  )
}