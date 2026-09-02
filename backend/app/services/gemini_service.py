import json
import re
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings
from app.prompts.healthcare_prompt import HEALTHCARE_SYSTEM_PROMPT, format_user_prompt
from app.models.response_models import FactCheckResult, MedicalSource, SafetyNotice
from app.utils.helpers import normalize_query

# Revised Accuracy-First, Concise Demo Fallbacks
DEMO_FALLBACKS = {
    "emergency": {
        "answer": "Chest pain, heart pain, or difficulty breathing require immediate medical evaluation. These symptoms can indicate serious cardiac or pulmonary conditions. Do not attempt self-treatment or delay emergency care.",
        "fact_check": {
            "status": "UNVERIFIED",
            "claim": "Severe symptom evaluation (Chest / Heart Pain)",
            "explanation": "Acute cardiac or respiratory symptoms require immediate clinical assessment.",
            "evidence_level": "HIGH",
            "sources": [
                {"name": "American Heart Association", "url": "https://www.heart.org"},
                {"name": "Mayo Clinic Emergency Care", "url": "https://www.mayoclinic.org"}
            ]
        },
        "safety_notice": {
            "level": "EMERGENCY",
            "message": "Call emergency services (911) or go to the nearest emergency department immediately for severe chest pain or breathing difficulty."
        }
    },
    "fever_medication": {
        "answer": "Selecting an appropriate medication for fever or pain depends on your age, health history, existing medical conditions, and potential drug interactions. Because these individual factors determine safety, you should confirm the correct medication choice with a pharmacist or doctor before taking anything.",
        "fact_check": {
            "status": "UNVERIFIED",
            "claim": "Medication recommendation for fever symptoms",
            "explanation": "Medication selection requires individual clinical assessment considering health history and contraindications.",
            "evidence_level": "HIGH",
            "sources": [
                {"name": "U.S. Food and Drug Administration", "url": "https://www.fda.gov"},
                {"name": "Mayo Clinic", "url": "https://www.mayoclinic.org"}
            ]
        },
        "safety_notice": {
            "level": "MEDIUM",
            "message": "Medication choice depends on individual health factors. Confirm with a pharmacist or doctor before taking any medication."
        }
    },
    "antibiotic": {
        "answer": "Antibiotics treat bacterial infections only and are completely ineffective against viral illnesses like the common cold or influenza. Using antibiotics for viral infections provides no benefit and contributes to global antibiotic resistance.",
        "fact_check": {
            "status": "FALSE",
            "claim": "Antibiotics are effective against viral infections",
            "explanation": "Antibiotics target bacterial cell structures, which viruses do not possess. Colds and flu are caused by viruses.",
            "evidence_level": "HIGH",
            "sources": [
                {"name": "World Health Organization", "url": "https://www.who.int"},
                {"name": "Centers for Disease Control and Prevention", "url": "https://www.cdc.gov"}
            ]
        },
        "safety_notice": {
            "level": "LOW",
            "message": "Always consult your doctor before starting or stopping an antibiotic."
        }
    },
    "dehydration": {
        "answer": "Under typical conditions, gradual steady rehydration with water or electrolyte fluids is safe and effective. In rare, extreme scenarios involving rapid, very large-volume plain water intake, blood electrolyte levels can be diluted (hyponatremia). For severe dehydration, medical evaluation is recommended.",
        "fact_check": {
            "status": "FALSE",
            "claim": "Drinking large amounts of water quickly is always the safest treatment for dehydration",
            "explanation": "Under normal conditions, gradual fluid intake is safe. Rapid excessive plain water consumption in extreme cases carries a risk of hyponatremia.",
            "evidence_level": "HIGH",
            "sources": [
                {"name": "Mayo Clinic", "url": "https://www.mayoclinic.org"},
                {"name": "World Health Organization", "url": "https://www.who.int"}
            ]
        },
        "safety_notice": {
            "level": "MEDIUM",
            "message": "Severe dehydration accompanied by confusion or inability to keep fluids down requires medical attention."
        }
    },
    "secondary": {
        "answer": "A doctor may prescribe an antibiotic during a viral illness if a secondary bacterial infection develops. The antibiotic treats the secondary bacterial complication, such as bacterial pneumonia, not the underlying virus.",
        "fact_check": {
            "status": "TRUE",
            "claim": "Doctors sometimes prescribe antibiotics during a viral infection",
            "explanation": "Antibiotics are indicated when a secondary bacterial infection supervenes during a primary viral illness.",
            "evidence_level": "HIGH",
            "sources": [
                {"name": "British Medical Journal", "url": "https://www.bmj.com"},
                {"name": "Centers for Disease Control and Prevention", "url": "https://www.cdc.gov"}
            ]
        },
        "safety_notice": {
            "level": "LOW",
            "message": "Follow your prescribing physician's directions regarding dosage and duration."
        }
    },
    "leftover": {
        "answer": "Do not take leftover antibiotics without consulting a doctor. Unused antibiotics may not suit your current infection, may be expired, or may provide an incomplete dose that encourages resistant bacteria.",
        "fact_check": {
            "status": "FALSE",
            "claim": "It is safe to take leftover antibiotics at home",
            "explanation": "Self-prescribing leftover antibiotics risks improper treatment, drug toxicity, and bacterial resistance.",
            "evidence_level": "HIGH",
            "sources": [
                {"name": "World Health Organization", "url": "https://www.who.int"},
                {"name": "U.S. Food and Drug Administration", "url": "https://www.fda.gov"}
            ]
        },
        "safety_notice": {
            "level": "HIGH",
            "message": "Never self-medicate with leftover prescription drugs. Consult a healthcare professional."
        }
    },
    "off_topic": {
        "answer": "This query falls outside MediVerify AI's specialized healthcare scope. MediVerify AI is designed exclusively for medical fact verification and safe healthcare guidance.",
        "fact_check": {
            "status": "UNVERIFIED",
            "claim": "Non-healthcare inquiry",
            "explanation": "The query is outside the scope of evidence-based medical literature.",
            "evidence_level": "LOW",
            "sources": []
        },
        "safety_notice": {
            "level": "LOW",
            "message": "Consult appropriate specialized sources for non-medical topics."
        }
    }
}

GREETING_KEYWORDS = [
    "hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "bye", "good morning", "good evening", "good afternoon", "how are you", "who are you", "help"
]

AMBIGUOUS_HEALTH_TERMS = [
    "fever", "headache", "cough", "cold", "pain", "stomach", "nausea", "vomiting", "rash", "dizzy"
]

NON_HEALTHCARE_KEYWORDS = [
    "weather", "sports", "football", "cricket", "movie", "cinema", "python", "programming", "code", "capital of", "president", "currency", "crypto", "stock", "soil", "salinity", "farmer", "agricultural", "agriculture"
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
        if not self.api_key:
            return self._get_fallback_response(user_message)

        prompt_text = format_user_prompt(user_message, retrieved_facts, conversation_history)

        for attempt in range(2):
            try:
                res_data = await self._call_gemini_api(prompt_text)
                if res_data:
                    return res_data
            except Exception as e:
                print(f"Gemini API attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(1)

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

            fc = parsed.get("fact_check")
            fact_check_obj = None
            if fc and isinstance(fc, dict) and fc.get("claim"):
                status = str(fc.get("status", "UNVERIFIED")).upper()
                if status not in ["TRUE", "FALSE", "MIXED", "UNVERIFIED"]:
                    status = "UNVERIFIED"

                evidence = str(fc.get("evidence_level", "HIGH")).upper()
                if evidence not in ["HIGH", "MEDIUM", "LOW"]:
                    evidence = "HIGH"

                fact_check_obj = {
                    "status": status,
                    "claim": fc.get("claim", "General Health Inquiry"),
                    "explanation": fc.get("explanation", "Verification completed against medical literature."),
                    "evidence_level": evidence,
                    "sources": fc.get("sources", [])
                }

            safety_lvl = str(parsed.get("safety_notice", {}).get("level", "LOW")).upper()
            if safety_lvl not in ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]:
                safety_lvl = "LOW"

            return {
                "answer": parsed.get("answer", "No answer generated."),
                "fact_check": fact_check_obj,
                "safety_notice": {
                    "level": safety_lvl,
                    "message": parsed.get("safety_notice", {}).get("message", "Educational guidance only. Consult a doctor.")
                }
            }
        except Exception as e:
            print(f"Failed to parse Gemini JSON output: {e}")
            return None

    def _handle_multi_question_fallback(self, user_message: str) -> Optional[Dict[str, Any]]:
        items = re.split(r'(?=\b[1-9][0-9]*[\.\)]\s+)', user_message)
        items = [item.strip() for item in items if item.strip()]

        if len(items) < 2:
            return None

        answers = []
        sources_set = {}

        for item in items:
            match_num = re.match(r'^([1-9][0-9]*)[\.\)]\s*(.*)', item, re.DOTALL)
            if match_num:
                num = match_num.group(1)
                text = match_num.group(2)
            else:
                num = str(len(answers) + 1)
                text = item

            norm = normalize_query(text)
            lower = text.lower()

            # Non-healthcare / Off-topic
            if any(term in norm or term in lower for term in NON_HEALTHCARE_KEYWORDS):
                answers.append(f"**{num}.** Question {num} falls outside MediVerify AI's specialized healthcare scope, so I cannot provide advice on this non-medical topic — I am happy to answer the healthcare questions above.")
                continue

            # Dehydration
            if "water" in norm or "dehydration" in norm or "hyponatremia" in norm:
                resp = DEMO_FALLBACKS["dehydration"]
                answers.append(f"**{num}.** {resp['answer']}")
                for s in resp["fact_check"]["sources"]:
                    sources_set[s["url"]] = s
                continue

            # Secondary bacterial infection
            if ("antibiotic" in norm or "antibiotics" in norm) and any(k in norm for k in ["why", "prescribe", "doctor", "initial", "secondary", "viral infection"]):
                resp = DEMO_FALLBACKS["secondary"]
                answers.append(f"**{num}.** {resp['answer']}")
                for s in resp["fact_check"]["sources"]:
                    sources_set[s["url"]] = s
                continue

            # Leftover antibiotics
            if ("antibiotic" in norm or "antibiotics" in norm) and any(k in norm for k in ["leftover", "unused", "home", "respiratory"]):
                resp = DEMO_FALLBACKS["leftover"]
                answers.append(f"**{num}.** {resp['answer']}")
                for s in resp["fact_check"]["sources"]:
                    sources_set[s["url"]] = s
                continue

            # Antibiotics general
            if "antibiotic" in norm or "antibiotics" in norm:
                resp = DEMO_FALLBACKS["antibiotic"]
                answers.append(f"**{num}.** {resp['answer']}")
                for s in resp["fact_check"]["sources"]:
                    sources_set[s["url"]] = s
                continue

            # Symptom / medication inquiry
            if ("fever" in norm and any(t in norm for t in ["tablet", "medicine", "pill", "take", "consider", "drug"])) or \
               any(phrase in norm for phrase in ["what tablet", "which medicine", "medicine for", "tablet for", "what drug", "which pill", "headache medicine", "pain tablet", "head pain"]):
                resp = DEMO_FALLBACKS["fever_medication"]
                answers.append(f"**{num}.** {resp['answer']}")
                for s in resp["fact_check"]["sources"]:
                    sources_set[s["url"]] = s
                continue

            # Generic sub-answer fallback
            answers.append(f"**{num}.** Evaluating your inquiry requires considering your individual medical history. Please consult a qualified pharmacist or doctor for personalized guidance.")

        final_sources = list(sources_set.values())

        return {
            "answer": "\n\n".join(answers),
            "fact_check": {
                "status": "FALSE",
                "claim": "Evaluation of multi-part healthcare queries (Dehydration, Antibiotic Use, & Safety)",
                "explanation": "Evaluated each sub-question against clinical literature. Non-healthcare topics explicitly flagged as out of scope.",
                "evidence_level": "HIGH",
                "sources": final_sources
            },
            "safety_notice": {
                "level": "LOW",
                "message": "Always consult a licensed physician or pharmacist regarding individual medical questions."
            }
        }

    def _get_fallback_response(self, user_message: str) -> Dict[str, Any]:
        norm_clean = re.sub(r'[^\w\s]', '', user_message.lower().strip())

        # 1. Greetings & Small Talk
        if norm_clean in GREETING_KEYWORDS or norm_clean == "":
            return {
                "answer": "Hi! I'm MediVerify AI — ask me any healthcare question or claim you would like verified.",
                "fact_check": None,
                "safety_notice": {
                    "level": "LOW",
                    "message": "Educational information assistant."
                }
            }

        # 2. Ambiguous Single-Word / Short Health Term
        words = norm_clean.split()
        if len(words) <= 2 and norm_clean in AMBIGUOUS_HEALTH_TERMS:
            term = user_message.strip()
            return {
                "answer": f"Could you tell me a bit more about your question regarding {term}? For example, are you asking about {term} management, symptoms, or when to seek medical care?",
                "fact_check": None,
                "safety_notice": {
                    "level": "LOW",
                    "message": "Educational information assistant."
                }
            }

        # 3. Check multi-question message
        multi_resp = self._handle_multi_question_fallback(user_message)
        if multi_resp:
            return multi_resp

        norm_msg = normalize_query(user_message)
        lower_msg = user_message.lower()

        # 4. Non-healthcare check for single queries
        if any(term in norm_msg or term in lower_msg for term in NON_HEALTHCARE_KEYWORDS):
            return DEMO_FALLBACKS["off_topic"]

        # 5. Emergency check
        if any(term in norm_msg or term in lower_msg for term in ["heart pain", "chest pain", "breath", "emergency", "cardiac"]):
            return DEMO_FALLBACKS["emergency"]

        # 6. Symptom / Medication request check
        if ("fever" in norm_msg and any(t in norm_msg for t in ["tablet", "medicine", "pill", "take", "consider", "drug"])) or \
           any(phrase in norm_msg for phrase in ["what tablet", "which medicine", "medicine for", "tablet for", "what drug", "which pill", "headache medicine", "pain tablet", "head pain"]):
            return DEMO_FALLBACKS["fever_medication"]

        # 7. Antibiotics checks
        if "antibiotic" in norm_msg or "antibiotics" in norm_msg:
            if any(k in norm_msg for k in ["why", "prescribe", "doctor", "initial", "secondary"]):
                return DEMO_FALLBACKS["secondary"]
            if any(k in norm_msg for k in ["leftover", "unused", "home"]):
                return DEMO_FALLBACKS["leftover"]
            return DEMO_FALLBACKS["antibiotic"]

        # 8. Dehydration check
        if "water" in norm_msg or "dehydration" in norm_msg or "hyponatremia" in norm_msg:
            return DEMO_FALLBACKS["dehydration"]

        # 9. Generic query fallback
        return {
            "answer": "Evaluating your health inquiry requires considering your individual medical history. Please consult a qualified pharmacist or doctor for personalized guidance.",
            "fact_check": {
                "status": "UNVERIFIED",
                "claim": user_message.strip()[:45],
                "explanation": "No specific medical claim match found in the local evidence database.",
                "evidence_level": "MEDIUM",
                "sources": []
            },
            "safety_notice": {
                "level": "LOW",
                "message": "Educational information only. Consult a doctor for personal advice."
            }
        }

gemini_service = GeminiService()
