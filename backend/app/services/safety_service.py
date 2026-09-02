import re
from typing import Dict, Any
from app.models.response_models import SafetyNotice

EMERGENCY_KEYWORDS = [
    r"\bchest pain\b",
    r"\bheart pain\b",
    r"\bheart ache\b",
    r"\bchest tightness\b",
    r"\bshortness of breath\b",
    r"\bcan't breathe\b",
    r"\bcannot breathe\b",
    r"\bbreathing difficulty\b",
    r"\bloss of consciousness\b",
    r"\bpassed out\b",
    r"\bunconscious\b",
    r"\bsevere bleeding\b",
    r"\bprofuse bleeding\b",
    r"\banaphylaxis\b",
    r"\bswollen tongue\b",
    r"\bthroat closing\b",
    r"\bpoisoning\b",
    r"\boverdose\b",
    r"\bstroke\b",
    r"\bfacial drooping\b",
    r"\bheart attack\b",
    r"\bsuicide\b",
    r"\bself harm\b",
]

HIGH_RISK_KEYWORDS = [
    r"\bhigh fever\b",
    r"\bsevere pain\b",
    r"\bdehydration\b",
    r"\bblood in stool\b",
    r"\bblood in vomit\b",
    r"\bconfusion\b",
    r"\bseizure\b",
]

MEDICATION_REQUEST_KEYWORDS = [
    r"\bwhat tablet\b",
    r"\bwhich tablet\b",
    r"\bwhat medicine\b",
    r"\bwhich medicine\b",
    r"\bwhat pill\b",
    r"\bwhich pill\b",
    r"\bwhat drug\b",
    r"\bwhich drug\b",
    r"\btablet for\b",
    r"\bmedicine for\b",
    r"\bmedication for\b",
    r"\bcure for\b",
]

class SafetyService:
    def check_query_safety(self, query: str) -> SafetyNotice:
        """
        Scan query for red-flag emergency keywords, high risk keywords, or medication requests.
        Returns a SafetyNotice object.
        """
        lower_query = query.lower()
        
        # Check emergency keywords
        for pattern in EMERGENCY_KEYWORDS:
            if re.search(pattern, lower_query):
                return SafetyNotice(
                    level="EMERGENCY",
                    message="Your query contains symptoms that may require urgent medical attention. If you or someone else is experiencing severe pain, difficulty breathing, chest pain, or loss of consciousness, please call emergency services (e.g., 911 or local emergency number) or seek immediate emergency care."
                )
                
        # Check high-risk keywords
        for pattern in HIGH_RISK_KEYWORDS:
            if re.search(pattern, lower_query):
                return SafetyNotice(
                    level="HIGH",
                    message="These symptoms warrant prompt evaluation by a healthcare provider. Do not delay seeking professional medical advice."
                )

        # Check medication/tablet requests
        for pattern in MEDICATION_REQUEST_KEYWORDS:
            if re.search(pattern, lower_query):
                return SafetyNotice(
                    level="MEDIUM",
                    message="Medication and dosage decisions require professional clinical guidance. Always consult a physician or licensed pharmacist before taking any medication for new or persistent symptoms."
                )

        return SafetyNotice(
            level="LOW",
            message="This response is provided for educational and informational purposes only. Consult a healthcare professional for specific medical advice."
        )

safety_service = SafetyService()
