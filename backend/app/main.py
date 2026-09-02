import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api import health, chat, history
from app.models.response_models import ErrorResponse

# Setup rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MediVerify AI - Healthcare Fact Verification & Safe Guidance Assistant Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure Universal CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api/v1
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(chat.router, prefix=settings.API_V1_STR, tags=["Chat"])
app.include_router(history.router, prefix=settings.API_V1_STR, tags=["History"])

# Global Catch-All Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global exception occurred: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            success=False,
            error="Internal Server Error",
            detail="An unexpected error occurred while processing your request. Please try again later."
        ).model_dump()
    )

# Request Validation Exception Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg", "Invalid request parameters.") if errors else "Invalid request."
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            success=False,
            error="Validation Error",
            detail=first_msg
        ).model_dump()
    )

@app.on_event("startup")
async def startup_event():
    print(f"[STARTUP] {settings.PROJECT_NAME} starting on {settings.API_V1_STR}")
    print(f"[CORS] Allowed CORS Origins: {settings.cors_origins}")
    if not settings.GEMINI_API_KEY:
        print("[WARNING] GEMINI_API_KEY is not set. Demo fallback responses will be active.")
