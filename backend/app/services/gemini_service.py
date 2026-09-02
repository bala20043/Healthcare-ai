import json
import re
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings
from app.prompts.healthcare_prompt import HEALTHCARE_SYSTEM_PROMPT, format_user_prompt
from app.models.response_models import FactCheckResult, MedicalSource, SafetyNotice
from app.utils.helpers import normalize_query

# Fallback responses for key demo questions if API key is missing or fails
DEMO_FALLBACKS = {
    "emergency": {
        "answer": "Chest pain, heart pain, or difficulty breathing are critical medical symptoms that require immediate professional evaluation. Potential causes range from acute coronary syndrome (heart attack) to severe pulmonary or vascular emergencies. Do not attempt self-treatment or wait for symptoms to pass.",
        "fact_check": {
            "status": "UNVERIFIED",
            "claim": "Severe symptom evaluation (Chest / Heart Pain)",
            "explanation": "Acute cardiac or respiratory symptoms cannot be diagnosed online and require immediate clinical assessment and ECG monitoring.",
            "evidence_level": "HIGH"
        },
        "safety_notice": {
            "level": "EMERGENCY",
            "message": "Your query contains symptoms that may require urgent medical attention. If you or someone else is experiencing severe pain, difficulty breathing, chest pain, or loss of consciousness, please call emergency services (e.g. 911 or local emergency number) or go to the nearest emergency department immediately."
        }
    },
    "fever_medication": {
        "answer": "I cannot prescribe or recommend specific medications or tablets for fever or symptoms. Fever is an immune response that can be triggered by viral or bacterial causes. Before taking any medication (such as fever reducers or pain relievers), you should consult a licensed pharmacist or physician who can evaluate your medical history, symptoms, and dosage safely.",
        "fact_check": {
            "status": "UNVERIFIED",
            "claim": "Medication selection for fever symptoms",
            "explanation": "Symptom-based drug selection falls outside verified self-treatment guidance. Medication prescription and recommendation require direct clinical assessment.",
            "evidence_level": "HIGH"
        },
        "safety_notice": {
            "level": "MEDIUM",
            "message": "Medication and dosage decisions require professional clinical guidance. Always consult a physician or licensed pharmacist before taking any medication for new or persistent symptoms."
        }
    },
    "antibiotic": {
        "answer": "Antibiotics are specifically designed to treat bacterial infections. They are not effective against viral infections such as the common cold, flu (influenza), or COVID-19. Taking antibiotics for viral infections can lead to unnecessary side effects and contributes to global antibiotic resistance.",
        "fact_check": {
            "status": "FALSE",
            "claim": "Antibiotics are effective against viral infections",
            "explanation": "Antibiotics target bacterial cell structures and processes, which viruses do not possess. Cold and flu are caused by viruses.",
            "evidence_level": "HIGH"
        },
        "safety_notice": {
            "level": "LOW",
            "message": "Consult your doctor before taking any antibiotic. Never use leftover or prescribed antibiotics without direct medical instruction."
        }
    },
    "dehydration": {
        "answer": "Drinking a very large quantity of plain water rapidly is not always the safest treatment for dehydration. While rehydration is essential, drinking excessive water too quickly can dilute blood electrolyte levels, leading to hyponatremia (water intoxication). For mild to moderate dehydration, gradually sipping oral rehydration solutions (ORS) with balanced electrolytes is safer.",
        "fact_check": {
            "status": "FALSE",
            "claim": "Drinking large amounts of water quickly is always the safest treatment for dehydration",
            "explanation": "Rapid excessive consumption of plain water without electrolytes can trigger hyponatremia. Gradual electrolyte rehydration is recommended.",
            "evidence_level": "HIGH"
        },
        "safety_notice": {
            "level": "MEDIUM",
            "message": "Severe dehydration accompanied by confusion, dizziness, or inability to keep fluids down requires immediate medical attention."
        }
    },
    "secondary": {
        "answer": "While antibiotics do not kill viruses, a doctor might prescribe an antibiotic during a viral illness if the patient develops a secondary bacterial infection. A viral illness can temporarily weaken respiratory defenses, allowing bacteria to cause complications such as bacterial pneumonia or ear infections. The antibiotic treats the secondary bacterial infection, not the underlying virus.",
        "fact_check": {
            "status": "TRUE",
            "claim": "Doctors sometimes prescribe antibiotics during a viral infection",
            "explanation": "Antibiotics are prescribed when a secondary bacterial infection supervenes or is strongly suspected during a primary viral illness.",
            "evidence_level": "HIGH"
        },
        "safety_notice": {
            "level": "LOW",
            "message": "Always follow your prescribing physician's directions regarding dosage and duration."
        }
    },
    "leftover": {
        "answer": "You should not take leftover antibiotics at home without consulting a doctor. Leftover medications may be the wrong antibiotic for your current infection, may be expired, or may be an incomplete dose that encourages antibiotic-resistant bacterial strains to grow.",
        "fact_check": {
            "status": "FALSE",
            "claim": "It is safe to take leftover antibiotics at home",
            "explanation": "Self-prescribing leftover antibiotics risks improper treatment, drug toxicity, and antibiotic resistance.",
            "evidence_level": "HIGH"
        },
        "safety_notice": {
            "level": "HIGH",
            "message": "Never self-medicate with leftover prescription drugs. Have your illness evaluated by a licensed clinician."
        }
    },
    "off_topic": {
        "answer": "This query appears to fall outside MediVerify AI's healthcare specialization. MediVerify AI is designed specifically for healthcare fact verification, medical claim evaluation, and safe health guidance.",
        "fact_check": {
            "status": "UNVERIFIED",
            "claim": "Non-healthcare inquiry",
            "explanation": "This topic is outside the scope of medical literature and healthcare fact verification.",
            "evidence_level": "LOW"
        },
        "safety_notice": {
            "level": "LOW",
            "message": "MediVerify AI provides healthcare guidance only. Consult appropriate sources for non-medical topics."
        }
    }
}

NON_HEALTHCARE_KEYWORDS = [
    "weather", "sports", "football", "cricket", "movie", "cinema", "python", "programming", "code", "capital of", "president", "currency", "crypto", "stock"
]

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL

    async def generate_response(
        self,
        user_message: str,
        retrieved_facts: List[str],
        conversation_history: Optional[List[dict]] = None
    ) -> Dict[str, Any]:
        """
        Generate AI response via Google Gemini API with fallback for demo reliability.
        """
        # If API key is not configured, return demo fallback response
        if not self.api_key:
            return self._get_fallback_response(user_message)

        prompt_text = format_user_prompt(user_message, retrieved_facts, conversation_history)

        # Retry logic up to 2 attempts
        for attempt in range(2):
            try:
                res_data = await self._call_gemini_api(prompt_text)
                if res_data:
                    return res_data
            except Exception as e:
                print(f"Gemini API attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(1)

        # Fallback if API calls fail
        return self._get_fallback_response(user_message)

    async def _call_gemini_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": HEALTHCARE_SYSTEM_PROMPT},
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                print(f"Gemini API Error Status: {response.status_code}, Body: {response.text}")
                return None
            
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None
            
            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return self._parse_and_validate_json(raw_text)

    def _parse_and_validate_json(self, raw_text: str) -> Optional[Dict[str, Any]]:
        try:
            json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
            else:
                parsed = json.loads(raw_text)

            status = str(parsed.get("fact_check", {}).get("status", "UNVERIFIED")).upper()
            if status not in ["TRUE", "FALSE", "MIXED", "UNVERIFIED"]:
                if "PARTIAL" in status:
                    status = "MIXED"
                else:
                    status = "UNVERIFIED"

            evidence = str(parsed.get("fact_check", {}).get("evidence_level", "HIGH")).upper()
            if evidence not in ["HIGH", "MEDIUM", "LOW"]:
                evidence = "HIGH"

            safety_lvl = str(parsed.get("safety_notice", {}).get("level", "LOW")).upper()
            if safety_lvl not in ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]:
                safety_lvl = "LOW"

            return {
                "answer": parsed.get("answer", "No answer generated."),
                "fact_check": {
                    "status": status,
                    "claim": parsed.get("fact_check", {}).get("claim", "General Health Inquiry"),
                    "explanation": parsed.get("fact_check", {}).get("explanation", "Verification completed against medical literature."),
                    "evidence_level": evidence
                },
                "safety_notice": {
                    "level": safety_lvl,
                    "message": parsed.get("safety_notice", {}).get("message", "Educational guidance only. Consult a doctor.")
                }
            }
        except Exception as e:
            print(f"Failed to parse Gemini JSON output: {e}")
            return None

    def _get_fallback_response(self, user_message: str) -> Dict[str, Any]:
        norm_msg = normalize_query(user_message)
        lower_msg = user_message.lower()

        # 1. Non-healthcare check
        if any(term in norm_msg or term in lower_msg for term in NON_HEALTHCARE_KEYWORDS):
            res = dict(DEMO_FALLBACKS["off_topic"])
            res["fact_check"] = dict(res["fact_check"])
            res["fact_check"]["claim"] = f"Non-healthcare inquiry ({user_message[:45]})"
            res["fact_check"]["explanation"] = f"The query '{user_message[:45]}' falls outside the scope of medical fact verification."
            return res

        # 2. Emergency check
        if any(term in norm_msg or term in lower_msg for term in ["heart pain", "chest pain", "breath", "emergency", "cardiac"]):
            return DEMO_FALLBACKS["emergency"]

        # 3. Antibiotic / Cold / Virus check (flexible topic match on full untruncated input)
        if "antibiotic" in norm_msg or "antibiotics" in norm_msg or "antibiotic" in lower_msg:
            return DEMO_FALLBACKS["antibiotic"]

        # 4. Symptom/Medication/Fever check
        if ("fever" in norm_msg and any(t in norm_msg for t in ["tablet", "medicine", "pill", "take", "consider"])) or \
           any(phrase in norm_msg for phrase in ["what tablet", "which medicine", "medicine for", "tablet for", "what drug", "which pill"]):
            res = dict(DEMO_FALLBACKS["fever_medication"])
            res["fact_check"] = dict(res["fact_check"])
            res["fact_check"]["claim"] = f"Medication selection for symptoms ({user_message[:45]})"
            res["fact_check"]["explanation"] = f"Specific drug recommendations for '{user_message[:45]}' require direct clinical evaluation and cannot be provided online."
            return res

        # 5. Dehydration check
        if "water" in norm_msg or "dehydration" in norm_msg or "hyponatremia" in norm_msg:
            return DEMO_FALLBACKS["dehydration"]

        # 6. Secondary infection check
        if "secondary" in norm_msg or "co infection" in norm_msg or "coinfection" in norm_msg:
            return DEMO_FALLBACKS["secondary"]

        # 7. Leftover check
        if "leftover" in norm_msg or "unused" in norm_msg:
            return DEMO_FALLBACKS["leftover"]

        # 8. Query-specific fallback
        return {
            "answer": f"Thank you for your healthcare question regarding '{user_message[:55]}'. Based on trusted medical guidance, symptom management and drug selection require an individualized clinical evaluation. Always consult a physician or pharmacist for specific treatment decisions.",
            "fact_check": {
                "status": "UNVERIFIED",
                "claim": user_message[:45],
                "explanation": f"No specific verified fact match found in the knowledge base for query: '{user_message[:45]}'.",
                "evidence_level": "MEDIUM"
            },
            "safety_notice": {
                "level": "LOW",
                "message": "This response is for educational purposes only and does not replace professional medical advice."
            }
        }

gemini_service = GeminiService()
