# backend/app/routes/auth.py
"""
Authentication Routes
Handles all authentication-related endpoints
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor

from ..config import settings
from ..services.auth_service import AuthService

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Database connection helper
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=settings.DB_HOST,
            database=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            port=settings.DB_PORT
        )
        return conn
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )

# Pydantic Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: str
    role: str = "viewer"

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: Optional[str]
    full_name: Optional[str]
    role: str
    is_active: bool

# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme)):
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        user = auth_service.get_current_user(token)
        return user
    finally:
        conn.close()

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get('is_active', False):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Router
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login endpoint
    
    - **username**: User's username
    - **password**: User's password
    
    Returns access token and user information
    """
    print(f"\n{'='*60}")
    print(f"LOGIN ATTEMPT")
    print(f"{'='*60}")
    print(f"Username: {form_data.username}")
    
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        # Authenticate user
        user = auth_service.authenticate_user(form_data.username, form_data.password)
        
        if not user:
            print(f"❌ Authentication FAILED for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"✅ Authentication SUCCESSFUL for user: {user['username']}")
        
        # Check if user is active
        if not user.get('is_active', False):
            print(f"❌ User is INACTIVE: {user['username']}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=auth_service.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth_service.create_access_token(
            data={"sub": user['username']},
            expires_delta=access_token_expires
        )
        
        print(f"✅ Token created successfully")
        print(f"Token expires in: {auth_service.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
        print(f"{'='*60}\n")
        
        # Return token and user info (without password)
        user_response = {
            "user_id": user['user_id'],
            "username": user['username'],
            "email": user.get('email'),
            "full_name": user.get('full_name'),
            "role": user['role'],
            "is_active": user['is_active']
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """
    Register a new user
    
    - **username**: Unique username (required)
    - **email**: User's email address
    - **full_name**: User's full name
    - **password**: User's password (required)
    - **role**: User role (default: viewer)
    
    Returns created user information
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        # Create user
        new_user = auth_service.create_user(user_data.dict())
        
        return UserResponse(**new_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )
    finally:
        conn.close()

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    """
    Get current authenticated user information
    
    Returns current user's profile
    """
    return UserResponse(**current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update current user's information
    
    Users can update their own profile information
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        # Filter out None values
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No valid fields to update"
            )
        
        # Update user
        updated_user = auth_service.update_user(
            current_user['user_id'],
            update_data,
            current_user
        )
        
        return UserResponse(**updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update error: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Change current user's password
    
    - **old_password**: Current password (required)
    - **new_password**: New password (required)
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        result = auth_service.change_password(
            current_user['user_id'],
            password_change.old_password,
            password_change.new_password,
            current_user
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change error: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_active_user)):
    """
    Logout endpoint
    
    Note: Since we're using JWT tokens, the client should delete the token.
    This endpoint is mainly for logging/auditing purposes.
    """
    return {
        "message": "Successfully logged out",
        "detail": "Please delete your access token from client storage"
    }

# Admin endpoints
@router.get("/users", response_model=list[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all users (Admin only)
    
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100)
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        # Check if user is admin
        auth_service.require_role(current_user, "admin")
        
        users = auth_service.get_all_users(skip, limit)
        
        return [UserResponse(**user) for user in users]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )
    finally:
        conn.close()

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get user by ID (Admin only, or user viewing themselves)
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        # Check permissions: admin or self
        if current_user['user_id'] != user_id and current_user['role'] != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view this user"
            )
        
        user = auth_service.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(**user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )
    finally:
        conn.close()

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update user by ID (Admin only, or user updating themselves)
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        # Filter out None values
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No valid fields to update"
            )
        
        # Update user
        updated_user = auth_service.update_user(user_id, update_data, current_user)
        
        return UserResponse(**updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update error: {str(e)}"
        )
    finally:
        conn.close()

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete user by ID (Admin only)
    
    Note: This is a soft delete - user is marked as inactive
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        result = auth_service.delete_user(user_id, current_user)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete error: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/users/{user_id}/change-password")
async def admin_change_password(
    user_id: int,
    password_change: PasswordChange,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Change password for any user (Admin only, or user changing their own password)
    
    - **old_password**: Required only when changing own password
    - **new_password**: New password (required)
    """
    conn = get_db_connection()
    try:
        auth_service = AuthService(conn, settings.SECRET_KEY, settings.ALGORITHM)
        
        result = auth_service.change_password(
            user_id,
            password_change.old_password,
            password_change.new_password,
            current_user
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change error: {str(e)}"
        )
    finally:
        conn.close()