import { useEffect, useState } from 'react'
import { predictions24h } from '../api/predict'

function hoyISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export default function Prediccion24h() {
  const [fecha, setFecha] = useState(hoyISO())
  const [cargando, setCargando] = useState(false)
  const [consumos, setConsumos] = useState(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const datos = await predictions24h(fecha)
      setConsumos(datos.consumos)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="tarjeta">
      <h2>Consumo próximas 24 horas</h2>
      <p className="descripcion">Predicción hora a hora para el día seleccionado.</p>

      <div className="fila">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <button onClick={cargar} disabled={!fecha || cargando}>
          {cargando ? 'Calculando...' : 'Actualizar'}
        </button>
      </div>

      {consumos && <Grafico consumos={consumos} />}
    </section>
  )
}

function Grafico({ consumos }) {
  const valores = consumos.map((p) => p.consumo_predicho)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const horaMax = consumos.find((p) => p.consumo_predicho === max)
  const horaMin = consumos.find((p) => p.consumo_predicho === min)
  const dosDigitos = (h) => String(h).padStart(2, '0')

  return (
    <div className="grafico-caja">
      <div className="leyenda">
        <p className="mas-cara" data-testid="hora-mas-consumo">
          Hora de mayor consumo: <strong>{dosDigitos(horaMax.hora)}:00</strong> — {max}{' '}
          MW
        </p>
        <p className="mas-barata" data-testid="hora-menos-consumo">
          Hora de menor consumo: <strong>{dosDigitos(horaMin.hora)}:00</strong> — {min}{' '}
          MW
        </p>
      </div>
      <div className="grafico">
        {consumos.map((p) => {
          const esMax = p.consumo_predicho === max
          const esMin = p.consumo_predicho === min
          return (
            <div
              key={p.hora}
              className={
                esMax
                  ? 'barra mas-cara'
                  : esMin
                    ? 'barra mas-barata'
                    : 'barra'
              }
              style={{ height: `${Math.max((p.consumo_predicho / max) * 100, 4)}%` }}
              title={`${dosDigitos(p.hora)}:00 — ${p.consumo_predicho} MW`}
            />
          )
        })}
      </div>
      <div className="ejes">
        <span>0:00</span>
        <span>12:00</span>
        <span>23:00</span>
      </div>
    </div>
  )
}
