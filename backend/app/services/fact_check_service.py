import json
import os
from typing import List, Dict, Any, Tuple
from app.models.response_models import MedicalSource
from app.utils.helpers import normalize_query

class FactCheckService:
    def __init__(self):
        self.knowledge_file = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "medical_knowledge.json"
        )
        self.topics = []
        self._load_knowledge_base()

    def _load_knowledge_base(self):
        try:
            if os.path.exists(self.knowledge_file):
                with open(self.knowledge_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.topics = data.get("topics", [])
        except Exception as e:
            print(f"Warning: Failed to load medical_knowledge.json: {e}")
            self.topics = []

    def retrieve_knowledge(self, query: str) -> Tuple[List[str], List[MedicalSource]]:
        """
        Search knowledge base for relevant facts and sources matching the FULL UNTRUNCATED user query.
        """
        norm_query = normalize_query(query)
        raw_lower = query.lower()
        matched_facts = []
        matched_sources = []
        seen_source_urls = set()

        for topic in self.topics:
            keywords = topic.get("keywords", [])
            # Match against normalized query or raw lowercase query
            if any(kw.lower() in norm_query or kw.lower() in raw_lower for kw in keywords):
                for fact in topic.get("facts", []):
                    if fact not in matched_facts:
                        matched_facts.append(fact)
                
                for src in topic.get("sources", []):
                    url = src.get("url", "")
                    if url not in seen_source_urls:
                        seen_source_urls.add(url)
                        matched_sources.append(
                            MedicalSource(
                                name=src.get("name", "Medical Reference"),
                                organization=src.get("organization", "Healthcare Organization"),
                                url=url
                            )
                        )

        return matched_facts, matched_sources

fact_check_service = FactCheckService()
