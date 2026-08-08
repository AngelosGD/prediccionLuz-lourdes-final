from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_predict_ok_devuelve_contrato():
    resp = client.post("/predict", json={"fecha": "2026-08-11", "hora": 14})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"precio_predicho", "unidad"}
    assert body["unidad"] == "EUR/MWh"
    assert isinstance(body["precio_predicho"], float)
    assert round(body["precio_predicho"], 2) == body["precio_predicho"]


def test_hora_fuera_de_rango():
    resp = client.post("/predict", json={"fecha": "2026-08-11", "hora": 24})
    assert resp.status_code == 400
    assert resp.json() == {"error": "hora debe estar entre 0 y 23"}


def test_fecha_invalida():
    resp = client.post("/predict", json={"fecha": "11-08-2026", "hora": 14})
    assert resp.status_code == 400
    assert "error" in resp.json()