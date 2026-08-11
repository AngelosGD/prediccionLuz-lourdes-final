"""Tests de la API contra el contrato (README secciones 4 y 4b).

Correr desde backend/: .venv/bin/python -m pytest
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_predict_exitoso(client):
    resp = client.post("/predict", json={"fecha": "2026-08-11", "hora": 14})
    assert resp.status_code == 200
    data = resp.json()
    assert set(data) == {"consumo_predicho", "unidad"}
    assert data["unidad"] == "MW"
    assert isinstance(data["consumo_predicho"], (int, float))


def test_predict_hora_fuera_de_rango(client):
    resp = client.post("/predict", json={"fecha": "2026-08-11", "hora": 24})
    assert resp.status_code == 422
    assert resp.json() == {"error": "hora debe estar entre 0 y 23"}


def test_predict_hora_negativa(client):
    resp = client.post("/predict", json={"fecha": "2026-08-11", "hora": -1})
    assert resp.status_code == 422
    assert resp.json() == {"error": "hora debe estar entre 0 y 23"}


def test_predict_hora_string_rechazada(client):
    # Contrato: hora es integer (14), no string ("14")
    resp = client.post("/predict", json={"fecha": "2026-08-11", "hora": "14"})
    assert resp.status_code == 422
    assert "error" in resp.json()


def test_predict_fecha_invalida(client):
    resp = client.post("/predict", json={"fecha": "11/08/2026", "hora": 14})
    assert resp.status_code == 422
    assert "error" in resp.json()


def test_predict_falta_campo(client):
    resp = client.post("/predict", json={"hora": 14})
    assert resp.status_code == 422
    assert "error" in resp.json()


def test_predict_24h(client):
    resp = client.post("/predict/24h", json={"fecha": "2026-08-11"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["fecha"] == "2026-08-11"
    assert data["unidad"] == "MW"
    assert len(data["consumos"]) == 24
    assert [p["hora"] for p in data["consumos"]] == list(range(24))
    assert all(isinstance(p["consumo_predicho"], (int, float)) for p in data["consumos"])


def test_predict_rango_exitoso(client):
    resp = client.post(
        "/predict/rango",
        json={"fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-03"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["fecha_inicio"] == "2026-07-01"
    assert data["fecha_fin"] == "2026-07-03"
    assert data["unidad"] == "MW"
    assert len(data["dias"]) == 3
    assert [d["fecha"] for d in data["dias"]] == ["2026-07-01", "2026-07-02", "2026-07-03"]
    for dia in data["dias"]:
        assert len(dia["consumos"]) == 24
        assert all(isinstance(c["consumo_predicho"], (int, float)) for c in dia["consumos"])


def test_predict_rango_invertido(client):
    resp = client.post(
        "/predict/rango",
        json={"fecha_inicio": "2026-07-10", "fecha_fin": "2026-07-01"},
    )
    assert resp.status_code == 422
    assert "error" in resp.json()


def test_predict_rango_muy_largo(client):
    resp = client.post(
        "/predict/rango",
        json={"fecha_inicio": "2025-01-01", "fecha_fin": "2026-12-31"},
    )
    assert resp.status_code == 422
    assert "error" in resp.json()


def test_predict_rango_fecha_invalida(client):
    resp = client.post(
        "/predict/rango",
        json={"fecha_inicio": "01/07/2026", "fecha_fin": "2026-07-03"},
    )
    assert resp.status_code == 422
    assert "error" in resp.json()


def test_predict_real_sin_dataset(client):
    resp = client.post("/predict/real", json={"fecha": "2026-08-11", "hora": 14})
    assert resp.status_code == 200
    data = resp.json()
    assert set(data) == {"fecha", "hora", "consumo_predicho", "consumo_real", "unidad"}
    assert data["hora"] == 14
    assert data["unidad"] == "MW"
    assert data["consumo_real"] is None  # la fecha 2026 no está en el dataset histórico


def test_cors_habilitado(client):
    resp = client.options(
        "/predict",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert resp.status_code == 200
    # Con allow_credentials=True, Starlette refleja el Origin en vez de "*"
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
