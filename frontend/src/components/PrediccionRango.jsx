import { useState } from 'react'

function aplanar(dias) {
  return dias.flatMap((dia) =>
    dia.consumos.map((c) => ({ fecha: dia.fecha, hora: c.hora, valor: c.consumo_predicho })),
  )
}

function diaConExtremo(dias, fn) {
  const totales = dias.map((dia) => ({
    fecha: dia.fecha,
    total: dia.consumos.reduce((s, c) => s + c.consumo_predicho, 0),
  }))
  return totales.reduce((a, b) => (fn(a.total, b.total) ? a : b))
}

function formatear(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function formatearCorto(iso) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

const W = 800
const H = 260
const PAD = 24

export default function PrediccionRango({ inicio, fin, dias, unidad }) {
  const [indice, setIndice] = useState(null)

  if (!dias || dias.length === 0) return null

  const puntos = aplanar(dias)
  const valores = puntos.map((p) => p.valor)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const diaMayor = diaConExtremo(dias, (a, b) => a > b)
  const diaMenor = diaConExtremo(dias, (a, b) => a < b)

  const xs = (i) => PAD + (i / (puntos.length - 1)) * (W - 2 * PAD)
  const ys = (v) => H - PAD - ((v - min) / (max - min || 1)) * (H - 2 * PAD)

  const linea = puntos.map((p, i) => `${xs(i).toFixed(1)},${ys(p.valor).toFixed(1)}`).join(' ')

  const numEtiquetas = 5
  const idxEtiqueta = (i) => Math.round((i * (puntos.length - 1)) / (numEtiquetas - 1))

  const manejarMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    const paso = (W - 2 * PAD) / (puntos.length - 1)
    const idx = Math.max(0, Math.min(puntos.length - 1, Math.round((x - PAD) / paso)))
    setIndice(idx)
  }

  const punto = indice != null ? puntos[indice] : null

  return (
    <section className="tarjeta">
      <h2>Predicción del rango</h2>
      <p className="descripcion">
        Del {inicio} al {fin} — {dias.length} días, hora a hora. Pasa el cursor
        sobre la gráfica para ver el consumo de cada hora.
      </p>

      <div className="leyenda">
        <p className="mas-cara" data-testid="dia-mas-consumo">
          Día de mayor consumo: <strong>{formatearCorto(diaMayor.fecha)}</strong>
        </p>
        <p className="mas-barata" data-testid="dia-menos-consumo">
          Día de menor consumo: <strong>{formatearCorto(diaMenor.fecha)}</strong>
        </p>
      </div>

      <svg
        className="grafico-linea"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Gráfica de consumo predicho por hora en el rango de fechas"
        onMouseMove={manejarMouse}
        onMouseLeave={() => setIndice(null)}
      >
        <polyline
          points={linea}
          fill="none"
          stroke="#1f77b4"
          strokeWidth="2"
        />

        {punto && (
          <g>
            <line
              x1={xs(indice)}
              x2={xs(indice)}
              y1={PAD}
              y2={H - PAD}
              stroke="#38bdf8"
              strokeDasharray="3 3"
            />
            <circle
              cx={xs(indice)}
              cy={ys(punto.valor)}
              r="4"
              fill="#38bdf8"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <g
              transform={`translate(${xs(indice) > W / 2 ? xs(indice) - 128 : xs(indice) + 12}, ${Math.max(6, ys(punto.valor) - 48)})`}
            >
              <rect width="116" height="40" rx="6" fill="#0b1220" stroke="#22304f" />
              <text x="8" y="16" fontSize="11" fill="#8b98b3">
                {formatear(punto.fecha)} {String(punto.hora).padStart(2, '0')}:00
              </text>
              <text x="8" y="33" fontSize="13" fontWeight="700" fill="#4ade80" data-testid="tooltip-rango">
                {punto.valor.toLocaleString('es', { maximumFractionDigits: 2 })} {unidad}
              </text>
            </g>
          </g>
        )}

        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={PAD} x2={W - PAD} y1={ys(v)} y2={ys(v)} stroke="#ddd" strokeDasharray="4 4" />
            <text x={W - PAD - 4} y={ys(v) + 4} textAnchor="end" fontSize="10" fill="#888">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: numEtiquetas }, (_, i) => {
          const idx = idxEtiqueta(i)
          const p = puntos[idx]
          return (
            <text
              key={i}
              x={xs(idx)}
              y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#888"
            >
              {formatearCorto(p.fecha)}
            </text>
          )
        })}
      </svg>

      <p className="nota-unidad">Consumo en {unidad}</p>
    </section>
  )
}
