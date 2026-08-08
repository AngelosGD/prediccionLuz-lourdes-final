import { useState } from 'react'
import FormPrediccion from './components/FormPrediccion'
import Prediccion24h from './components/Prediccion24h'
import ComparacionReal from './components/ComparacionReal'
import { mockPredict } from './api/predict'
import './App.css'

function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function App() {
  const [resultado, setResultado] = useState(null)
  const [consulta, setConsulta] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handlePrediccion = async (fecha, hora) => {
    setCargando(true)
    setError(null)
    setResultado(null)
    setConsulta(null)
    try {
      const resp = await mockPredict(fecha, hora)
      setConsulta({ fecha: formatearFecha(fecha), hora })
      setResultado(resp)
    } catch (e) {
      setError(e.message || 'Error al obtener la predicción')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="app">
      <h1>Predicción de Precios de Luz</h1>
      <p className="subtitulo">
        Ingresa una fecha y hora para estimar el precio en EUR/MWh
      </p>

      <FormPrediccion onEnviar={handlePrediccion} cargando={cargando} />

      {!cargando && !error && !resultado && (
        <p className="ayuda">
          Elige una fecha y una hora y pulsa &quot;Predecir precio&quot;
        </p>
      )}

      {cargando && <p className="cargando">Calculando...</p>}
      {error && <p className="error">{error}</p>}

      {resultado && !cargando && (
        <div className="resultado">
          <p className="consulta">
            Para el {consulta.fecha} a las {consulta.hora}:00
          </p>
          <p className="resultado-label">Precio predicho</p>
          <p className="precio">
            {resultado.precio_predicho} <span>{resultado.unidad}</span>
          </p>
        </div>
      )}

      <Prediccion24h />
      <ComparacionReal />
    </div>
  )
}

export default App