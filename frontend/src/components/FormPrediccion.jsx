import { useState } from 'react'

const HORAS = Array.from({ length: 24 }, (_, i) => i)

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