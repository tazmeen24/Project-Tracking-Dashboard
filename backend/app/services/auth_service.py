# backend/app/routes/auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    get_db_connection,
    Token,
    User,
    UserCreate
)
from ..config import settings
from psycopg2.extras import RealDictCursor

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login endpoint
    """
    print(f"\n=== LOGIN ATTEMPT ===")
    print(f"Username: {form_data.username}")
    
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        print(f"Authentication failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"Authentication successful for user: {user.username}")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    print(f"Token created successfully")
    print(f"=== LOGIN COMPLETE ===\n")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active
        }
    }

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """
    Register a new user
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if username already exists
            cur.execute(
                "SELECT user_id FROM users WHERE username = %s",
                (user_data.username,)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already registered"
                )
            
            # Check if email already exists
            cur.execute(
                "SELECT user_id FROM users WHERE email = %s",
                (user_data.email,)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Hash the password
            hashed_password = get_password_hash(user_data.password)
            
            # Insert new user
            cur.execute(
                """
                INSERT INTO users (username, email, full_name, hashed_password, role, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING user_id, username, email, full_name, role, is_active
                """,
                (
                    user_data.username,
                    user_data.email,
                    user_data.full_name,
                    hashed_password,
                    user_data.role,
                    True
                )
            )
            
            new_user = cur.fetchone()
            conn.commit()
            
            return {
                "message": "User created successfully",
                "user": dict(new_user)
            }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )
    finally:
        conn.close()

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    """
    return current_user

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout endpoint (client should delete token)
    """
    return {"message": "Successfully logged out"}