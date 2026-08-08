import { useState } from 'react'
import FormPrediccion from './components/FormPrediccion'
import { mockPredict } from './api/predict'
import './App.css'

function App() {
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handlePrediccion = async (fecha, hora) => {
    setCargando(true)
    setError(null)
    setResultado(null)
    try {
      const resp = await mockPredict(fecha, hora)
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

      {cargando && <p className="cargando">Calculando...</p>}
      {error && <p className="error">{error}</p>}
      {resultado && !cargando && (
        <div className="resultado">
          <p className="resultado-label">Precio predicho</p>
          <p className="precio">
            {resultado.precio_predicho} <span>{resultado.unidad}</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default App