import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.request_models import ChatRequest
from app.models.response_models import ChatResponse, FactCheckResult, SafetyNotice, MedicalSource
from app.services.safety_service import safety_service
from app.services.fact_check_service import fact_check_service
from app.services.gemini_service import gemini_service
from app.services.supabase_service import supabase_service
from app.services.auth_service import get_optional_user
from app.utils.helpers import sanitize_text

router = APIRouter()

@router.post("/chat", response_model=ChatResponse, summary="Send message to AI Health Assistant")
async def chat_endpoint(
    request: ChatRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Main Chat API Endpoint.
    
    1. Validates query message.
    2. Runs emergency safety scanner.
    3. Retrieves trusted facts & medical sources from local knowledge base.
    4. Retrieves conversation context if available.
    5. Calls Gemini AI model with prompt injection safety.
    6. Formats & validates fact verification status (TRUE | FALSE | MIXED | UNVERIFIED).
    7. Persists chat records to Supabase when user is authenticated.
    """
    user_message = sanitize_text(request.message)
    if not user_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be blank."
        )

    user_id = current_user.get("user_id") if current_user else None
    user_jwt = current_user.get("jwt") if current_user else None

    # 1. Safety scan
    safety_notice = safety_service.check_query_safety(user_message)
    
    # 2. Knowledge Base Retrieval
    retrieved_facts, retrieved_sources = fact_check_service.retrieve_knowledge(user_message)

    # 3. Handle Conversation Session & Context Window
    conversation_id = request.conversation_id
    context_messages = []

    if user_id:
        if not conversation_id:
            # Create a new conversation session
            title = user_message[:40] + "..." if len(user_message) > 40 else user_message
            new_conv = await supabase_service.create_conversation(user_id=user_id, title=title, user_jwt=user_jwt)
            if new_conv:
                conversation_id = new_conv.get("id")
        else:
            # Retrieve recent conversation context
            context_messages = await supabase_service.get_recent_conversation_context(
                conversation_id=conversation_id,
                user_id=user_id,
                limit=6,
                user_jwt=user_jwt
            )

    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    # 4. Generate AI Response
    ai_raw = await gemini_service.generate_response(
        user_message=user_message,
        retrieved_facts=retrieved_facts,
        conversation_history=context_messages
    )

    # If emergency or elevated safety triggered from safety scanner, respect it
    if safety_notice.level == "EMERGENCY":
        final_safety = safety_notice
        ai_raw["answer"] = "Chest pain, heart pain, or difficulty breathing are critical medical symptoms that require immediate professional evaluation. Potential causes range from acute coronary syndrome (heart attack) to severe pulmonary or vascular emergencies. Please do not attempt self-treatment or delay seeking care."
        ai_raw["fact_check"]["claim"] = f"Emergency symptom inquiry ({user_message})"
        ai_raw["fact_check"]["explanation"] = "Acute cardiac or respiratory symptoms cannot be diagnosed online and require immediate clinical assessment."
    elif safety_notice.level in ["MEDIUM", "HIGH"] and ai_raw["safety_notice"]["level"] == "LOW":
        final_safety = safety_notice
    else:
        final_safety = SafetyNotice(
            level=ai_raw["safety_notice"]["level"],
            message=ai_raw["safety_notice"]["message"]
        )

    # 5. Build Fact Check Result with Verbatim Sources
    fact_check_data = ai_raw.get("fact_check")
    if fact_check_data and isinstance(fact_check_data, dict):
        status_verdict = fact_check_data.get("status", "UNVERIFIED")
        if status_verdict == "UNVERIFIED":
            final_sources = []
        else:
            final_sources = retrieved_sources

        fact_check_res = FactCheckResult(
            status=status_verdict,
            claim=fact_check_data.get("claim", user_message[:50]),
            explanation=fact_check_data.get("explanation", "Verified against medical knowledge base."),
            evidence_level=fact_check_data.get("evidence_level", "HIGH"),
            sources=final_sources
        )
    else:
        fact_check_res = None
        final_sources = []

    # 6. Save to Supabase if authenticated
    if user_id and conversation_id:
        # Save user message
        await supabase_service.save_message(
            conversation_id=conversation_id,
            user_id=user_id,
            role="user",
            content=user_message,
            user_jwt=user_jwt
        )
        
        # Save AI message
        await supabase_service.save_message(
            conversation_id=conversation_id,
            user_id=user_id,
            role="ai",
            content=ai_raw["answer"],
            fact_check=fact_check_res.model_dump() if fact_check_res else None,
            sources=[s.model_dump() for s in final_sources],
            safety_level=final_safety.level,
            user_jwt=user_jwt
        )

        # Update timestamp
        await supabase_service.update_conversation_timestamp(conversation_id, user_jwt)

    return ChatResponse(
        success=True,
        conversation_id=conversation_id,
        answer=ai_raw["answer"],
        fact_check=fact_check_res,
        sources=final_sources,
        safety_notice=final_safety,
        disclaimer="This information is for educational purposes and does not replace professional medical advice."
    )
