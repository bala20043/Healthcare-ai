from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chat_happy_path():
    payload = {
        "message": "Are antibiotics effective against viral infections?"
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "fact_check" in data
    assert data["fact_check"]["status"] == "FALSE"
    assert "safety_notice" in data
    assert "disclaimer" in data

def test_numbered_prefix_antibiotic_matching():
    payload = {
        "message": "1.Is it true that antibiotics are effective against viral infections such as the common cold and flu? Verify your answer using reliable medical sources"
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["fact_check"]["status"] == "FALSE"
    assert "No verified medical evidence match found" not in data["fact_check"]["explanation"]
    assert "antibiotic" in data["answer"].lower() or "bacteria" in data["answer"].lower()

def test_fever_medication_request_matching():
    payload = {
        "message": "fever will come what tablet can be considered"
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["fact_check"]["status"] in ["UNVERIFIED", "FALSE", "MIXED"]
    assert data["safety_notice"]["level"] in ["MEDIUM", "HIGH", "EMERGENCY"]
    assert any(term in data["answer"].lower() for term in ["doctor", "pharmacist", "healthcare", "fever", "medication", "tablet"])

def test_off_topic_non_healthcare_matching():
    payload = {
        "message": "what's the weather today"
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["fact_check"]["status"] in ["UNVERIFIED", "FALSE"]
    assert any(term in data["answer"].lower() for term in ["weather", "healthcare", "outside", "scope", "assistant"])

def test_empty_message_validation():
    payload = {"message": "   "}
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 400

def test_unauthenticated_history_access():
    response = client.get("/api/v1/history")
    assert response.status_code == 401
