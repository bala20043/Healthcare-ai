from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class MedicalSource(BaseModel):
    name: str = Field(..., description="Name of the medical publication or organization")
    organization: str = Field(..., description="Organization name (e.g., WHO, CDC)")
    url: str = Field(..., description="Reference URL")

class FactCheckResult(BaseModel):
    status: Literal["TRUE", "FALSE", "MIXED", "UNVERIFIED"] = Field(..., description="Fact check classification status")
    claim: str = Field(..., description="The user claim or health query topic being evaluated")
    explanation: str = Field(..., description="Detailed medical explanation supporting the status")
    evidence_level: Literal["HIGH", "MEDIUM", "LOW"] = Field(..., description="Level of supporting medical literature evidence")
    sources: List[MedicalSource] = Field(default_factory=list, description="Verbatim medical sources from knowledge base")

class SafetyNotice(BaseModel):
    level: Literal["LOW", "MEDIUM", "HIGH", "EMERGENCY"] = Field(..., description="Safety assessment level")
    message: str = Field(..., description="Safety advice or emergency directive")

class ChatResponse(BaseModel):
    success: bool = True
    conversation_id: str = Field(..., description="UUID of the current conversation session")
    answer: str = Field(..., description="Clear, evidence-based AI response")
    fact_check: Optional[FactCheckResult] = None
    sources: List[MedicalSource] = Field(default_factory=list)
    safety_notice: SafetyNotice
    disclaimer: str = "This information is for educational purposes only and should not be considered medical advice or diagnosis. Always consult a qualified healthcare provider."

class ErrorResponse(BaseModel):
    success: bool = False
    error: str = Field(..., description="Error summary")
    detail: Optional[str] = Field(None, description="Additional context or guidance")

class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "MediVerify AI Backend"

class MessageItem(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    fact_check: Optional[dict] = None
    sources: Optional[List[dict]] = None
    safety_level: Optional[str] = None
    created_at: str

class ConversationItem(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str

class ConversationListResponse(BaseModel):
    success: bool = True
    conversations: List[ConversationItem]
    count: int
