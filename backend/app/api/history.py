from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.models.response_models import ConversationListResponse, ConversationItem, MessageItem
from app.services.supabase_service import supabase_service
from app.services.auth_service import get_current_user

router = APIRouter()

@router.get("/history", response_model=ConversationListResponse, summary="Get authenticated user's conversations")
async def get_user_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get paginated chat history conversations for authenticated user only.
    Ordered by updated_at DESC.
    """
    user_id = current_user["user_id"]
    user_jwt = current_user["jwt"]

    data = await supabase_service.get_user_conversations(
        user_id=user_id,
        limit=limit,
        offset=offset,
        user_jwt=user_jwt
    )

    items = [
        ConversationItem(
            id=conv["id"],
            user_id=conv["user_id"],
            title=conv.get("title", "New Conversation"),
            created_at=str(conv.get("created_at", "")),
            updated_at=str(conv.get("updated_at", ""))
        )
        for conv in data
    ]

    return ConversationListResponse(
        success=True,
        conversations=items,
        count=len(items)
    )

@router.get("/history/{conversation_id}", response_model=List[MessageItem], summary="Get messages in a conversation")
async def get_conversation_messages(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all messages for a specific conversation belonging to user.
    Returns 404 if conversation is not found or not owned by user.
    """
    user_id = current_user["user_id"]
    user_jwt = current_user["jwt"]

    messages_data = await supabase_service.get_conversation_messages(
        conversation_id=conversation_id,
        user_id=user_id,
        user_jwt=user_jwt
    )

    if not messages_data:
        # Check if conversation exists at all to return 404
        convs = await supabase_service.get_user_conversations(user_id=user_id, user_jwt=user_jwt)
        matching = [c for c in convs if c["id"] == conversation_id]
        if not matching:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found."
            )
        return []

    return [
        MessageItem(
            id=msg["id"],
            conversation_id=msg["conversation_id"],
            role=msg["role"],
            content=msg["content"],
            fact_check=msg.get("fact_check"),
            sources=msg.get("sources"),
            safety_level=msg.get("safety_level"),
            created_at=str(msg.get("created_at", ""))
        )
        for msg in messages_data
    ]

@router.delete("/history/{conversation_id}", summary="Delete a conversation")
async def delete_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a specific conversation session and its messages.
    """
    user_id = current_user["user_id"]
    user_jwt = current_user["jwt"]

    success = await supabase_service.delete_conversation(
        conversation_id=conversation_id,
        user_id=user_id,
        user_jwt=user_jwt
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or could not be deleted."
        )

    return {"success": True, "message": "Conversation deleted successfully."}

@router.delete("/history", summary="Clear all chat history")
async def clear_all_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete all conversations for the authenticated user.
    """
    user_id = current_user["user_id"]
    user_jwt = current_user["jwt"]

    await supabase_service.clear_user_history(user_id=user_id, user_jwt=user_jwt)
    return {"success": True, "message": "All chat history cleared successfully."}
