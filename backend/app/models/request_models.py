from typing import Optional
from pydantic import BaseModel, Field, field_validator

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's healthcare query or claim to verify", min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(None, description="Optional UUID of existing conversation")

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Message content cannot be blank or whitespace only.")
        return s
