from app.services.safety_service import safety_service

def test_emergency_keyword_detection():
    # Emergency query
    res = safety_service.check_query_safety("I am having severe chest pain and shortness of breath")
    assert res.level == "EMERGENCY"
    assert "urgent medical attention" in res.message

def test_high_risk_keyword_detection():
    res = safety_service.check_query_safety("I have high fever and severe pain")
    assert res.level == "HIGH"

def test_standard_query_safety():
    res = safety_service.check_query_safety("Are antibiotics effective against colds?")
    assert res.level == "LOW"
