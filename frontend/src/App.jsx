import { useState } from 'react'
import FormPrediccion from './components/FormPrediccion'
import Prediccion24h from './components/Prediccion24h'
import PrediccionRango from './components/PrediccionRango'
import ComparacionReal from './components/ComparacionReal'
import { mockPredict, mockPredictRango } from './api/predict'
import './App.css'

function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function App() {
  const [resultado, setResultado] = useState(null)
  const [consulta, setConsulta] = useState(null)
  const [resultadoRango, setResultadoRango] = useState(null)
  const [consultaRango, setConsultaRango] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handlePrediccion = async (datos) => {
    setCargando(true)
    setError(null)
    setResultado(null)
    setConsulta(null)
    setResultadoRango(null)
    setConsultaRango(null)
    try {
      if (datos.tipo === 'rango') {
        const resp = await mockPredictRango(datos.fechaInicio, datos.fechaFin)
        setConsultaRango({ inicio: formatearFecha(datos.fechaInicio), fin: formatearFecha(datos.fechaFin) })
        setResultadoRango(resp)
      } else {
        const resp = await mockPredict(datos.fecha, datos.hora)
        setConsulta({ fecha: formatearFecha(datos.fecha), hora: datos.hora })
        setResultado(resp)
      }
    } catch (e) {
      setError(e.message || 'Error al obtener la predicción')
    } finally {
      setCargando(false)
    }
  }

  const hayResultado = resultado || resultadoRango

  return (
    <div className="app">
      <h1>Predicción de Consumo Eléctrico</h1>
      <p className="subtitulo">
        Ingresa una fecha y hora, o un rango de fechas, para estimar el consumo en MW
      </p>

      <FormPrediccion onEnviar={handlePrediccion} cargando={cargando} />

      {!cargando && !error && !hayResultado && (
        <p className="ayuda">
          Elige una fecha y una hora (o un rango de fechas) y pulsa predecir
        </p>
      )}

      {cargando && <p className="cargando">Calculando...</p>}
      {error && <p className="error">{error}</p>}

      {resultado && !cargando && (
        <div className="resultado">
          <p className="consulta">
            Para el {consulta.fecha} a las {consulta.hora}:00
          </p>
          <p className="resultado-label">Consumo predicho</p>
          <p className="precio">
            {resultado.consumo_predicho} <span>{resultado.unidad}</span>
          </p>
        </div>
      )}

      {resultadoRango && !cargando && (
        <PrediccionRango
          inicio={consultaRango.inicio}
          fin={consultaRango.fin}
          dias={resultadoRango.dias}
          unidad={resultadoRango.unidad}
        />
      )}

      <Prediccion24h />
      <ComparacionReal />
    </div>
  )
}

export default App
