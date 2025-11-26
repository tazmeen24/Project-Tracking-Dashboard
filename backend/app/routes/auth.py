# app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from psycopg2.extras import RealDictCursor

from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    require_role
)
from ..models.auth import Token, User, UserCreate
from ..database import get_db_connection
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint"""
    print(f"   Login attempt received")
    print(f"   Username: '{form_data.username}'")
    print(f"   Password length: {len(form_data.password)}")
    
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        print(f" Authentication FAILED for username: '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f" Authentication SUCCESSFUL for user: {user.username}")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Update last login
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = %s",
                (user.username,)
            )
            conn.commit()
    finally:
        conn.close()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return current_user

@router.post("/register", response_model=User)
async def register_user(user: UserCreate, current_user: User = Depends(require_role("admin"))):
    """Admin only: Create a new user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if username exists
            cur.execute("SELECT username FROM users WHERE username = %s", (user.username,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Username already registered")
            
            # Check if email exists
            cur.execute("SELECT email FROM users WHERE email = %s", (user.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Create user
            hashed_password = get_password_hash(user.password)
            cur.execute(
                """INSERT INTO users (username, email, full_name, hashed_password, role)
                   VALUES (%s, %s, %s, %s, %s) RETURNING user_id, username, email, full_name, role, is_active""",
                (user.username, user.email, user.full_name, hashed_password, user.role)
            )
            new_user = cur.fetchone()
            conn.commit()
            return User(**new_user)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/users", response_model=list)
async def list_users(current_user: User = Depends(require_role("admin"))):
    """Admin only: List all users"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username, email, full_name, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC"
            )
            users = cur.fetchall()
            return [dict(user) for user in users]
    finally:
        conn.close()