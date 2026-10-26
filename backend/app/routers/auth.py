from fastapi import APIRouter, HTTPException

from app.db.models import LoginIn, TokenOut
from app.services.auth import authenticate_admin, create_access_token

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn):
    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    token = create_access_token(subject=payload.username)
    return TokenOut(access_token=token)
