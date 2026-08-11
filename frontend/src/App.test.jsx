import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from './App'

vi.mock('./api/predict', () => ({
  mockPredict: vi.fn(),
  mockPredictions24h: vi.fn(),
  mockComparar: vi.fn(),
  mockPredictRango: vi.fn(),
}))

import { mockPredict, mockPredictions24h, mockComparar, mockPredictRango } from './api/predict'

const CONSUMOS_24 = Array.from({ length: 24 }, (_, h) => ({
  hora: h,
  consumo_predicho: 28000,
}))
CONSUMOS_24[5].consumo_predicho = 35000 // hora de mayor consumo
CONSUMOS_24[11].consumo_predicho = 20000 // hora de menor consumo

function construirRango(nDias) {
  return Array.from({ length: nDias }, (_, i) => ({
    fecha: `2026-07-${String(i + 1).padStart(2, '0')}`,
    consumos: Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      consumo_predicho: 28000 + i * 500 + h * 100,
    })),
  }))
}

async function llenarFormulario() {
  await userEvent.type(screen.getByLabelText('Fecha'), '2026-08-11')
  await userEvent.selectOptions(screen.getByLabelText('Hora'), '14')
}

describe('App (simulación de UI)', () => {
  beforeEach(() => {
    mockPredict.mockReset()
    mockPredictions24h.mockReset()
    mockPredictions24h.mockResolvedValue({
      fecha: '2026-08-11',
      unidad: 'MW',
      consumos: CONSUMOS_24,
    })
    mockComparar.mockReset()
    mockComparar.mockResolvedValue({
      fecha: '2026-08-11',
      hora: 14,
      consumo_predicho: 31200,
      consumo_real: null,
      unidad: 'MW',
    })
    mockPredictRango.mockReset()
    mockPredictRango.mockResolvedValue({
      fecha_inicio: '2026-07-01',
      fecha_fin: '2026-07-03',
      unidad: 'MW',
      dias: construirRango(3),
    })
  })

  it('muestra el hint inicial antes de consultar', () => {
    render(<App />)
    expect(
      screen.getByText(/elige una fecha y una hora/i),
    ).toBeInTheDocument()
  })

  it('no permite enviar sin hora seleccionada', () => {
    render(<App />)
    const boton = screen.getByRole('button', { name: /predecir consumo/i })
    expect(boton).toBeDisabled()
    expect(mockPredict).not.toHaveBeenCalled()
  })

  it('muestra el resultado tras llenar fecha y hora', async () => {
    mockPredict.mockResolvedValue({
      consumo_predicho: 31200,
      unidad: 'MW',
    })

    render(<App />)
    await llenarFormulario()

    const boton = screen.getByRole('button', { name: /predecir consumo/i })
    expect(boton).toBeEnabled()
    await userEvent.click(boton)

    expect(mockPredict).toHaveBeenCalledWith('2026-08-11', 14)

    await waitFor(() => {
      expect(screen.getByText('MW')).toBeInTheDocument()
    })
    expect(screen.getByText('31200')).toBeInTheDocument()
    expect(screen.getByText('Para el 11/08/2026 a las 14:00')).toBeInTheDocument()
    expect(
      screen.queryByText(/elige una fecha y una hora/i),
    ).not.toBeInTheDocument()
  })

  it('cambia el texto del botón mientras calcula', async () => {
    const liberar = vi.fn()
    mockPredict.mockReturnValue(
      new Promise((resolve) => {
        liberar.mockImplementation(() =>
          resolve({ consumo_predicho: 30000, unidad: 'MW' }),
        )
      }),
    )

    render(<App />)
    // Esperamos a que la gráfica 24h termine de cargar para que su botón
    // deje de decir "Calculando..." y no haya dos botones con ese texto.
    await waitFor(() => {
      expect(screen.getByText(/hora de mayor consumo/i)).toBeInTheDocument()
    })

    await llenarFormulario()
    await userEvent.click(screen.getByRole('button', { name: /predecir consumo/i }))

    expect(
      screen.getByRole('button', { name: /calculando/i }),
    ).toBeInTheDocument()

    liberar()
    await waitFor(() => {
      expect(screen.getByText('MW')).toBeInTheDocument()
    })
  })

  it('muestra el error del contrato cuando el envío falla', async () => {
    mockPredict.mockRejectedValue(new Error('hora debe estar entre 0 y 23'))

    render(<App />)
    await llenarFormulario()
    await userEvent.click(screen.getByRole('button', { name: /predecir consumo/i }))

    await waitFor(() => {
      expect(
        screen.getByText('hora debe estar entre 0 y 23'),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByText(/consumo predicho/i),
    ).not.toBeInTheDocument()
  })

  it('resalta la hora de mayor y menor consumo en la gráfica 24h', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/hora de mayor consumo/i)).toBeInTheDocument()
    })
    expect(screen.getByTestId('hora-mas-consumo')).toHaveTextContent(/05:00/)
    expect(screen.getByTestId('hora-menos-consumo')).toHaveTextContent(/11:00/)
  })

  it('muestra "Sin dato real aún" cuando no hay consumo real', async () => {
    render(<App />)

    await userEvent.type(
      screen.getByLabelText('Fecha de comparación'),
      '2026-08-11',
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Hora de comparación'),
      '14',
    )

    await userEvent.click(screen.getByRole('button', { name: /comparar/i }))

    await waitFor(() => {
      expect(screen.getByText('Sin dato real aún')).toBeInTheDocument()
    })
  })

  it('muestra el consumo real cuando el backend lo entrega', async () => {
    mockComparar.mockResolvedValue({
      fecha: '2026-08-11',
      hora: 14,
      consumo_predicho: 31200,
      consumo_real: 30850,
      unidad: 'MW',
    })

    render(<App />)

    await userEvent.type(
      screen.getByLabelText('Fecha de comparación'),
      '2026-08-11',
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Hora de comparación'),
      '14',
    )

    await userEvent.click(screen.getByRole('button', { name: /comparar/i }))

    await waitFor(() => {
      expect(screen.getByText('30850')).toBeInTheDocument()
    })
    expect(screen.queryByText('Sin dato real aún')).not.toBeInTheDocument()
  })

  it('alterna entre una fecha y rango de fechas en el formulario', async () => {
    render(<App />)

    expect(screen.getByLabelText('Fecha')).toBeInTheDocument()
    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Rango de fechas' }))

    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument()
    expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Una fecha' }))
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument()
  })

  it('no permite enviar el rango sin fechas', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Rango de fechas' }))

    const boton = screen.getByRole('button', { name: 'Predecir rango' })
    expect(boton).toBeDisabled()
    expect(mockPredictRango).not.toHaveBeenCalled()
  })

  it('muestra la gráfica del rango tras enviar fechas', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Rango de fechas' }))

    await userEvent.type(screen.getByLabelText('Desde'), '2026-07-01')
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-07-03')
    await userEvent.click(screen.getByRole('button', { name: 'Predecir rango' }))

    expect(mockPredictRango).toHaveBeenCalledWith('2026-07-01', '2026-07-03')

    await waitFor(() => {
      expect(screen.getByText(/predicción del rango/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/del 01\/07\/2026 al 03\/07\/2026/i)).toBeInTheDocument()
    expect(screen.getByTestId('dia-mas-consumo')).toHaveTextContent(/03\/07/)
    expect(screen.getByTestId('dia-menos-consumo')).toHaveTextContent(/01\/07/)
  })

  it('muestra el consumo al pasar el cursor sobre la gráfica del rango', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Rango de fechas' }))

    await userEvent.type(screen.getByLabelText('Desde'), '2026-07-01')
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-07-03')
    await userEvent.click(screen.getByRole('button', { name: 'Predecir rango' }))

    const grafica = await screen.findByRole('img', {
      name: /gráfica de consumo predicho por hora en el rango/i,
    })

    // Mover el cursor al centro de la gráfica (el punto medio del rango).
    fireEvent.mouseMove(grafica, { clientX: 100, clientY: 100 })

    await waitFor(() => {
      expect(screen.getByTestId('tooltip-rango')).toHaveTextContent(/MW/)
    })
  })
})
