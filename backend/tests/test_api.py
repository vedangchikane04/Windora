import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["data_loaded"] is True
    assert data["fuelhh_records_count"] > 0
    assert data["windfor_records_count"] > 0

def test_overview_endpoint():
    response = client.get("/api/overview?selected_date=2026-01-15&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["selected_date"] == "2026-01-15"
    assert data["cutoff_time"] == "11:00"
    assert "overview_metrics" in data
    assert data["overview_metrics"]["sample_count"] > 0

def test_forecasts_endpoint_valid():
    response = client.get("/api/forecasts?date=2026-01-15&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-01-15"
    assert len(data["intervals"]) == 48
    # Verify each interval structure
    first = data["intervals"][0]
    assert "actual_mw" in first
    assert "forecast_mw" in first
    assert "error_mw" in first
    assert "procurement_direction" in first

def test_forecasts_endpoint_invalid_date():
    # Outside January 2026
    response = client.get("/api/forecasts?date=2025-11-15")
    assert response.status_code == 400

    # Malformed date string
    response_malformed = client.get("/api/forecasts?date=invalid-date")
    assert response_malformed.status_code == 422

def test_accuracy_endpoint():
    response = client.get("/api/accuracy?start_date=2026-01-01&end_date=2026-01-07&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["aggregate_metrics"]["sample_count"] > 0
    assert len(data["daily_breakdown"]) == 7
    assert len(data["error_distribution"]) > 0

def test_forecast_history_endpoint():
    delivery_time = "2026-01-15T12:00:00Z"
    response = client.get(f"/api/forecast-history?delivery_time={delivery_time}&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_time"] == delivery_time
    assert len(data["versions"]) > 0
    # Must have at least one selected forecast
    selected = [v for v in data["versions"] if v["is_selected"]]
    assert len(selected) == 1
    # Check that selected forecast is eligible
    assert selected[0]["is_eligible"] is True
