import { useState } from 'react'

const HORAS = Array.from({ length: 24 }, (_, i) => i)
// Rango para evitar fechas absurdas en el input de fecha.
const FECHA_MIN = '2015-01-01'
const FECHA_MAX = '2099-12-31'

export default function FormPrediccion({ onEnviar, cargando }) {
  const [tipo, setTipo] = useState('unico')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const valido =
    !cargando &&
    (tipo === 'unico'
      ? fecha !== '' && hora !== ''
      : fechaInicio !== '' && fechaFin !== '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!valido) return
    if (tipo === 'unico') {
      onEnviar({ tipo, fecha, hora: Number(hora) })
    } else {
      onEnviar({ tipo, fechaInicio, fechaFin })
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit}>
      <div className="toggle-tipo">
        <button
          type="button"
          className={tipo === 'unico' ? 'activo' : ''}
          onClick={() => setTipo('unico')}
        >
          Una fecha
        </button>
        <button
          type="button"
          className={tipo === 'rango' ? 'activo' : ''}
          onClick={() => setTipo('rango')}
        >
          Rango de fechas
        </button>
      </div>

      {tipo === 'unico' ? (
        <>
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
        </>
      ) : (
        <>
          <label>
            Desde
            <input
              type="date"
              value={fechaInicio}
              min={FECHA_MIN}
              max={FECHA_MAX}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </label>

          <label>
            Hasta
            <input
              type="date"
              value={fechaFin}
              min={FECHA_MIN}
              max={FECHA_MAX}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </label>
        </>
      )}

      <button type="submit" disabled={!valido}>
        {cargando ? 'Calculando...' : tipo === 'unico' ? 'Predecir consumo' : 'Predecir rango'}
      </button>
    </form>
  )
}
