from fastapi import APIRouter
from app.models.response_models import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse, summary="Public service health check")
async def health_check():
    """
    Public health check endpoint.
    Must not depend on Gemini or Supabase accessibility.
    """
    return HealthResponse(status="healthy", service="MediVerify AI Backend")
