import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from './App'

vi.mock('./api/predict', () => ({
  predict: vi.fn(),
  fetchPredictions24h: vi.fn(),
  fetchComparar: vi.fn(),
}))

import { predict, fetchPredictions24h, fetchComparar } from './api/predict'

const PRECIOS_24 = Array.from({ length: 24 }, (_, h) => ({
  hora: h,
  precio_predicho: 50,
}))
PRECIOS_24[5].precio_predicho = 90 // hora más cara
PRECIOS_24[11].precio_predicho = 20 // hora más barata

async function llenarFormulario() {
  await userEvent.type(screen.getByLabelText('Fecha'), '2026-08-11')
  await userEvent.selectOptions(screen.getByLabelText('Hora'), '14')
}

describe('App (simulación de UI)', () => {
  beforeEach(() => {
    predict.mockReset()
    fetchPredictions24h.mockReset()
    fetchPredictions24h.mockResolvedValue({
      fecha: '2026-08-11',
      unidad: 'EUR/MWh',
      precios: PRECIOS_24,
    })
    fetchComparar.mockReset()
    fetchComparar.mockResolvedValue({
      fecha: '2026-08-11',
      hora: 14,
      precio_predicho: 62.35,
      precio_real: null,
      unidad: 'EUR/MWh',
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
    const boton = screen.getByRole('button', { name: /predecir precio/i })
    expect(boton).toBeDisabled()
    expect(predict).not.toHaveBeenCalled()
  })

  it('muestra el resultado tras llenar fecha y hora', async () => {
    predict.mockResolvedValue({
      precio_predicho: 62.35,
      unidad: 'EUR/MWh',
    })

    render(<App />)
    await llenarFormulario()

    const boton = screen.getByRole('button', { name: /predecir precio/i })
    expect(boton).toBeEnabled()
    await userEvent.click(boton)

    expect(predict).toHaveBeenCalledWith('2026-08-11', 14)

    await waitFor(() => {
      expect(screen.getByText('EUR/MWh')).toBeInTheDocument()
    })
    expect(screen.getByText('62.35')).toBeInTheDocument()
    expect(screen.getByText('Para el 11/08/2026 a las 14:00')).toBeInTheDocument()
    expect(
      screen.queryByText(/elige una fecha y una hora/i),
    ).not.toBeInTheDocument()
  })

  it('cambia el texto del botón mientras calcula', async () => {
    const liberar = vi.fn()
    predict.mockReturnValue(
      new Promise((resolve) => {
        liberar.mockImplementation(() =>
          resolve({ precio_predicho: 50, unidad: 'EUR/MWh' }),
        )
      }),
    )

    render(<App />)
    // Esperamos a que la gráfica 24h termine de cargar para que su botón
    // deje de decir "Calculando..." y no haya dos botones con ese texto.
    await waitFor(() => {
      expect(screen.getByText(/hora más cara/i)).toBeInTheDocument()
    })

    await llenarFormulario()
    await userEvent.click(screen.getByRole('button', { name: /predecir precio/i }))

    expect(
      screen.getByRole('button', { name: /calculando/i }),
    ).toBeInTheDocument()

    liberar()
    await waitFor(() => {
      expect(screen.getByText('EUR/MWh')).toBeInTheDocument()
    })
  })

  it('muestra el error del contrato cuando el envío falla', async () => {
    predict.mockRejectedValue(new Error('hora debe estar entre 0 y 23'))

    render(<App />)
    await llenarFormulario()
    await userEvent.click(screen.getByRole('button', { name: /predecir precio/i }))

    await waitFor(() => {
      expect(
        screen.getByText('hora debe estar entre 0 y 23'),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByText(/precio predicho/i),
    ).not.toBeInTheDocument()
  })

  it('resalta la hora más cara y la más barata en la gráfica 24h', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/hora más cara/i)).toBeInTheDocument()
    })
    expect(screen.getByTestId('hora-mas-cara')).toHaveTextContent(/05:00/)
    expect(screen.getByTestId('hora-mas-barata')).toHaveTextContent(/11:00/)
  })

  it('muestra "Sin dato real aún" cuando no hay precio real', async () => {
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

  it('muestra el precio real cuando el backend lo entrega', async () => {
    fetchComparar.mockResolvedValue({
      fecha: '2026-08-11',
      hora: 14,
      precio_predicho: 62.35,
      precio_real: 58.4,
      unidad: 'EUR/MWh',
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
      expect(screen.getByText('58.4')).toBeInTheDocument()
    })
    expect(screen.queryByText('Sin dato real aún')).not.toBeInTheDocument()
  })
})