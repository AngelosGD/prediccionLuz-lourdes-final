import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from './App'

vi.mock('./api/predict', () => ({
  mockPredict: vi.fn(),
}))

import { mockPredict } from './api/predict'

async function llenarFormulario() {
  await userEvent.type(screen.getByLabelText(/fecha/i), '2026-08-11')
  await userEvent.selectOptions(screen.getByLabelText(/hora/i), '14')
}

describe('App (simulación de UI)', () => {
  beforeEach(() => {
    mockPredict.mockReset()
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
    expect(mockPredict).not.toHaveBeenCalled()
  })

  it('muestra el resultado tras llenar fecha y hora', async () => {
    mockPredict.mockResolvedValue({
      precio_predicho: 62.35,
      unidad: 'EUR/MWh',
    })

    render(<App />)
    await llenarFormulario()

    const boton = screen.getByRole('button', { name: /predecir precio/i })
    expect(boton).toBeEnabled()
    await userEvent.click(boton)

    expect(mockPredict).toHaveBeenCalledWith('2026-08-11', 14)

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
    mockPredict.mockReturnValue(
      new Promise((resolve) => {
        liberar.mockImplementation(() =>
          resolve({ precio_predicho: 50, unidad: 'EUR/MWh' }),
        )
      }),
    )

    render(<App />)
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
    mockPredict.mockRejectedValue(new Error('hora debe estar entre 0 y 23'))

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
})