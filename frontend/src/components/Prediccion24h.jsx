import { useEffect, useState } from 'react'
import { mockPredictions24h } from '../api/predict'

function hoyISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export default function Prediccion24h() {
  const [fecha, setFecha] = useState(hoyISO())
  const [cargando, setCargando] = useState(false)
  const [precios, setPrecios] = useState(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const datos = await mockPredictions24h(fecha)
      setPrecios(datos.precios)
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
      <h2>Próximas 24 horas</h2>
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

      {precios && <Grafico precios={precios} />}
    </section>
  )
}

function Grafico({ precios }) {
  const valores = precios.map((p) => p.precio_predicho)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const horaCara = precios.find((p) => p.precio_predicho === max)
  const horaBarata = precios.find((p) => p.precio_predicho === min)

  return (
    <div className="grafico-caja">
      <div className="leyenda">
        <p className="mas-cara">
          Hora más cara: <strong>{horaCara.hora}:00</strong> — {max} EUR/MWh
        </p>
        <p className="mas-barata">
          Hora más barata: <strong>{horaBarata.hora}:00</strong> — {min} EUR/MWh
        </p>
      </div>
      <div className="grafico">
        {precios.map((p) => {
          const esCara = p.precio_predicho === max
          const esBarata = p.precio_predicho === min
          return (
            <div
              key={p.hora}
              className={
                esCara
                  ? 'barra mas-cara'
                  : esBarata
                    ? 'barra mas-barata'
                    : 'barra'
              }
              style={{ height: `${Math.max((p.precio_predicho / max) * 100, 4)}%` }}
              title={`${p.hora}:00 — ${p.precio_predicho} EUR/MWh`}
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