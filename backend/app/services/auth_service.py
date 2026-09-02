from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from jose import jwt, JWTError
from app.config import settings

class AuthService:
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify Supabase JWT token and extract user claims.
        """
        secret = settings.SUPABASE_JWT_SECRET
        
        # If secret is set, verify HS256 signature
        if secret:
            try:
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                return payload
            except JWTError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired authentication token."
                )
        else:
            # Fallback for unconfigured secret in local demo: decode without signature verification
            try:
                payload = jwt.get_unverified_claims(token)
                return payload
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Malformed authentication token."
                )

auth_service = AuthService()

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency requiring valid Bearer token.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing."
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'."
        )

    token = parts[1]
    claims = auth_service.verify_token(token)
    
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing user ID."
        )

    return {
        "user_id": user_id,
        "email": claims.get("email", ""),
        "jwt": token,
        "claims": claims
    }

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency allowing optional authentication.
    """
    if not authorization:
        return None

    try:
        return await get_current_user(authorization=authorization)
    except HTTPException:
        return None
