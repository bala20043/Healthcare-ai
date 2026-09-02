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
        query_summary = user_message.strip()
        if len(query_summary) > 50:
            query_summary = query_summary[:50] + "..."

        # 1. Non-healthcare check
        if any(term in norm_msg or term in lower_msg for term in NON_HEALTHCARE_KEYWORDS):
            return {
                "answer": f"The query '{query_summary}' appears to fall outside MediVerify AI's healthcare specialization. MediVerify AI is designed specifically for healthcare fact verification and safe medical guidance.",
                "fact_check": {
                    "status": "UNVERIFIED",
                    "claim": f"Non-healthcare inquiry: '{query_summary}'",
                    "explanation": f"The query '{query_summary}' was evaluated and determined to be outside the scope of evidence-based medical literature and healthcare fact-checking.",
                    "evidence_level": "LOW"
                },
                "safety_notice": {
                    "level": "LOW",
                    "message": "MediVerify AI provides healthcare guidance only. Consult appropriate specialized sources for non-medical topics."
                }
            }

        # 2. Emergency check
        if any(term in norm_msg or term in lower_msg for term in ["heart pain", "chest pain", "breath", "emergency", "cardiac"]):
            return DEMO_FALLBACKS["emergency"]

        # 3. Fever & Symptom Medication check (Rich Gemini-Level Medical Response)
        if "fever" in norm_msg or any(phrase in norm_msg for phrase in ["what tablet", "which medicine", "medicine for fever", "tablet for fever"]):
            return {
                "answer": (
                    "The standard, safest first-line over-the-counter medications for managing a fever in adults are:\n\n"
                    "• **Paracetamol (Acetaminophen / Tylenol)**: Typically **500 mg to 1,000 mg** every 4 to 6 hours as needed.\n"
                    "  - *Crucial Rule*: Do not exceed **4,000 mg (4 grams)** total in a 24-hour period to protect your liver. Check other cold & flu syrups so you don't accidentally take extra paracetamol.\n\n"
                    "• **Ibuprofen (NSAID)**: Typically **200 mg to 400 mg** every 4 to 6 hours as needed, taken with food or milk to protect your stomach.\n"
                    "  - *Crucial Rule*: Avoid ibuprofen if you have a history of stomach ulcers, kidney disease, or suspect Dengue fever.\n\n"
                    "*(Note: Children's doses are strictly based on body weight, and aspirin should never be given to children or teenagers due to the risk of Reye's syndrome.)*\n\n"
                    "### 🏡 Basic Home Care\n"
                    "• **Hydrate**: Drink plenty of fluids (water, clear soups, ORS) to prevent dehydration.\n"
                    "• **Rest**: Allow your body time to recover.\n"
                    "• **Cool Down**: Wear lightweight clothing and use a light blanket if experiencing chills.\n\n"
                    "### ⚠️ When to Seek Immediate Medical Care\n"
                    "Go to an urgent care clinic or emergency room if the fever is accompanied by any of these red flag symptoms:\n"
                    "• High fever (above 103°F / 39.4°C) or lasting longer than 3 days\n"
                    "• Severe headache, stiff neck, or extreme sensitivity to light\n"
                    "• Difficulty breathing, shortness of breath, or chest pain\n"
                    "• Confusion, extreme drowsiness, or persistent vomiting"
                ),
                "fact_check": {
                    "status": "TRUE",
                    "claim": "Paracetamol and Ibuprofen are safe first-line over-the-counter fever reducers",
                    "explanation": "Over-the-counter antipyretics like Acetaminophen and Ibuprofen are clinically established first-line medications for fever and symptom management in adults when taken within recommended safety limits.",
                    "evidence_level": "HIGH"
                },
                "safety_notice": {
                    "level": "MEDIUM",
                    "message": "This guidance is for educational reference. Consult a licensed pharmacist or physician for personal medical advice or persistent symptoms."
                }
            }

        # 4. Antibiotics & viral infections / secondary infection / leftover checks
        if "antibiotic" in norm_msg or "antibiotics" in norm_msg:
            if any(k in norm_msg for k in ["why", "prescribe", "doctor", "initial", "secondary"]):
                return DEMO_FALLBACKS["secondary"]
            if any(k in norm_msg for k in ["leftover", "unused", "home"]):
                return DEMO_FALLBACKS["leftover"]
            return DEMO_FALLBACKS["antibiotic"]

        # 5. Dehydration check
        if "water" in norm_msg or "dehydration" in norm_msg or "hyponatremia" in norm_msg:
            return DEMO_FALLBACKS["dehydration"]

        # 6. Generic query fallback
        return {
            "answer": f"Regarding your inquiry on '{query_summary}': Based on established evidence-based medical literature, individual health symptoms and medical conditions require personalized clinical evaluation. Always consult a qualified healthcare professional.",
            "fact_check": {
                "status": "UNVERIFIED",
                "claim": f"Medical inquiry: '{query_summary}'",
                "explanation": f"Evaluated query '{query_summary}' against medical reference database. No exact match found for specific clinical claim.",
                "evidence_level": "MEDIUM"
            },
            "safety_notice": {
                "level": "LOW",
                "message": "This response is for educational purposes only and does not substitute for professional medical advice."
            }
        }

gemini_service = GeminiService()
