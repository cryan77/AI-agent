"""JWT authentication."""

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.schemas import UserProfile
from app.services.database import get_connection, hash_password
from app.services.data_loader import data_store

ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


def _secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is required")
    return secret


def _expire_hours() -> int:
    return int(os.getenv("JWT_EXPIRE_HOURS", "24"))


def create_access_token(user: UserProfile) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=_expire_hours())
    payload = {
        "sub": user.email,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "customer_id": user.customer_id,
        "vip": user.vip,
        "exp": expire,
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        ) from e


def _row_to_user(row) -> UserProfile:
    return UserProfile(
        email=row["email"],
        name=row["name"],
        role=row["role"],
        customer_id=row["customer_id"],
        vip=bool(row["vip"]),
    )


def get_user_by_email(email: str) -> UserProfile | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT email, password_hash, role, customer_id, name, vip FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    return _row_to_user(row)


def verify_password(email: str, password: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return False
    return row["password_hash"] == hash_password(password)


def authenticate_user(email: str, password: str) -> UserProfile | None:
    if not verify_password(email, password):
        return None
    return get_user_by_email(email)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserProfile:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please sign in.",
        )
    payload = decode_token(credentials.credentials)
    user = get_user_by_email(payload.get("email", ""))
    if not user or user.email != payload.get("email"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


def require_admin(user: UserProfile = Depends(get_current_user)) -> UserProfile:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_customer(user: UserProfile = Depends(get_current_user)) -> UserProfile:
    if user.role != "customer" or not user.customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required")
    return user
