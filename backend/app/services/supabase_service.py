import httpx
from typing import List, Dict, Any, Optional
from app.config import settings

class SupabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

    def _get_headers(self, user_jwt: Optional[str] = None) -> Dict[str, str]:
        token = user_jwt if user_jwt else self.service_role_key
        return {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    async def create_conversation(self, user_id: str, title: str, user_jwt: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Create a new conversation session for user in Supabase database.
        """
        endpoint = f"{self.url}/rest/v1/conversations"
        payload = {
            "user_id": user_id,
            "title": title[:50]
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(endpoint, json=payload, headers=self._get_headers(user_jwt))
            if res.status_code in [200, 201]:
                data = res.json()
                return data[0] if isinstance(data, list) and len(data) > 0 else data
            else:
                print(f"Supabase create_conversation failed: {res.status_code} - {res.text}")
                return None

    async def save_message(
        self,
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        fact_check: Optional[Dict[str, Any]] = None,
        sources: Optional[List[Dict[str, Any]]] = None,
        safety_level: Optional[str] = None,
        user_jwt: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Insert message record into public.messages table in Supabase.
        """
        endpoint = f"{self.url}/rest/v1/messages"
        payload = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "fact_check": fact_check,
            "safety_level": safety_level
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(endpoint, json=payload, headers=self._get_headers(user_jwt))
            if res.status_code in [200, 201]:
                data = res.json()
                return data[0] if isinstance(data, list) and len(data) > 0 else data
            else:
                print(f"Supabase save_message failed: {res.status_code} - {res.text}")
                return None

    async def update_conversation_timestamp(self, conversation_id: str, user_jwt: Optional[str] = None):
        """
        Update updated_at timestamp on conversations table.
        """
        endpoint = f"{self.url}/rest/v1/conversations?id=eq.{conversation_id}"
        payload = {"updated_at": "now()"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.patch(endpoint, json=payload, headers=self._get_headers(user_jwt))

    async def get_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0, user_jwt: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch user conversations ordered by updated_at desc.
        """
        endpoint = f"{self.url}/rest/v1/conversations?user_id=eq.{user_id}&order=updated_at.desc&limit={limit}&offset={offset}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(endpoint, headers=self._get_headers(user_jwt))
            if res.status_code == 200:
                return res.json()
            return []

    async def get_conversation_messages(self, conversation_id: str, user_id: str, user_jwt: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch messages for a specific conversation belonging to user.
        """
        endpoint = f"{self.url}/rest/v1/messages?conversation_id=eq.{conversation_id}&user_id=eq.{user_id}&order=created_at.asc"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(endpoint, headers=self._get_headers(user_jwt))
            if res.status_code == 200:
                return res.json()
            return []

    async def get_recent_conversation_context(self, conversation_id: str, user_id: str, limit: int = 6, user_jwt: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch last N messages for bounded context window.
        """
        endpoint = f"{self.url}/rest/v1/messages?conversation_id=eq.{conversation_id}&user_id=eq.{user_id}&order=created_at.desc&limit={limit}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(endpoint, headers=self._get_headers(user_jwt))
            if res.status_code == 200:
                msgs = res.json()
                return list(reversed(msgs))
            return []

    async def delete_conversation(self, conversation_id: str, user_id: str, user_jwt: Optional[str] = None) -> bool:
        """
        Delete a conversation and its messages.
        """
        endpoint = f"{self.url}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.delete(endpoint, headers=self._get_headers(user_jwt))
            return res.status_code in [200, 204]

    async def clear_user_history(self, user_id: str, user_jwt: Optional[str] = None) -> bool:
        """
        Delete all conversations for user.
        """
        endpoint = f"{self.url}/rest/v1/conversations?user_id=eq.{user_id}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.delete(endpoint, headers=self._get_headers(user_jwt))
            return res.status_code in [200, 204]

supabase_service = SupabaseService()
