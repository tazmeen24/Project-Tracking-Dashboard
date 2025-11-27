"""
Authentication Service
Handles all business logic related to user authentication and authorization
"""

from typing import Optional
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import psycopg2
from psycopg2.extras import RealDictCursor


class AuthService:
    """Service class for authentication and authorization operations"""
    
    def __init__(self, db_connection, secret_key: str, algorithm: str = "HS256"):
        self.conn = db_connection
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain password against a hashed password
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password from database
            
        Returns:
            True if password matches, False otherwise
        """
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """
        Hash a password
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password
        """
        return self.pwd_context.hash(password)
    
    def authenticate_user(self, username: str, password: str) -> Optional[dict]:
        """
        Authenticate a user with username and password
        
        Args:
            username: Username
            password: Plain text password
            
        Returns:
            User data if authenticated, None otherwise
        """
        user = self.get_user_by_username(username)
        if not user:
            return None
        if not self.verify_password(password, user['hashed_password']):
            return None
        return user
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT access token
        
        Args:
            data: Data to encode in the token
            expires_delta: Token expiration time
            
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt
    
    def decode_token(self, token: str) -> dict:
        """
        Decode and verify a JWT token
        
        Args:
            token: JWT token to decode
            
        Returns:
            Decoded token data
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            username: str = payload.get("sub")
            
            if username is None:
                raise credentials_exception
            
            return payload
            
        except JWTError:
            raise credentials_exception
    
    def get_user_by_username(self, username: str) -> Optional[dict]:
        """
        Get user by username
        
        Args:
            username: Username to search for
            
        Returns:
            User data if found, None otherwise
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    user_id,
                    username,
                    email,
                    full_name,
                    role,
                    hashed_password,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                WHERE username = %s
            """, (username,))
            
            user = cur.fetchone()
            return dict(user) if user else None
    
    def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """
        Get user by ID
        
        Args:
            user_id: User ID to search for
            
        Returns:
            User data if found, None otherwise
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    user_id,
                    username,
                    email,
                    full_name,
                    role,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                WHERE user_id = %s
            """, (user_id,))
            
            user = cur.fetchone()
            return dict(user) if user else None
    
    def get_current_user(self, token: str) -> dict:
        """
        Get current user from JWT token
        
        Args:
            token: JWT token
            
        Returns:
            Current user data
            
        Raises:
            HTTPException: If token is invalid or user not found
        """
        payload = self.decode_token(token)
        username: str = payload.get("sub")
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        
        user = self.get_user_by_username(username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    
    def create_user(self, user_data: dict) -> dict:
        """
        Create a new user
        
        Args:
            user_data: Dictionary containing user information
            
        Returns:
            Created user data (without password)
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if username already exists
                cur.execute("""
                    SELECT 1 FROM users WHERE username = %s
                """, (user_data['username'],))
                
                if cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Username already registered"
                    )
                
                # Check if email already exists
                if 'email' in user_data and user_data['email']:
                    cur.execute("""
                        SELECT 1 FROM users WHERE email = %s
                    """, (user_data['email'],))
                    
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=400,
                            detail="Email already registered"
                        )
                
                # Hash the password
                hashed_password = self.get_password_hash(user_data['password'])
                
                # Insert user
                cur.execute("""
                    INSERT INTO users
                    (username, email, full_name, role, hashed_password, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING user_id
                """, (
                    user_data['username'],
                    user_data.get('email'),
                    user_data.get('full_name'),
                    user_data.get('role', 'viewer'),
                    hashed_password,
                    user_data.get('is_active', True)
                ))
                
                user_id = cur.fetchone()['user_id']
                self.conn.commit()
                
                # Return user without password
                return self.get_user_by_id(user_id)
                
            except psycopg2.IntegrityError as e:
                self.conn.rollback()
                raise HTTPException(
                    status_code=400,
                    detail="Database integrity error"
                )
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def update_user(self, user_id: int, user_data: dict, current_user: dict) -> dict:
        """
        Update user information
        
        Args:
            user_id: User ID to update
            user_data: Dictionary containing updated user information
            current_user: Current authenticated user
            
        Returns:
            Updated user data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if user exists
                cur.execute("SELECT 1 FROM users WHERE user_id = %s", (user_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Check permissions (users can only update themselves unless admin)
                if current_user['user_id'] != user_id and current_user['role'] != 'admin':
                    raise HTTPException(
                        status_code=403,
                        detail="Not authorized to update this user"
                    )
                
                # Build update query
                update_fields = []
                update_values = []
                
                allowed_fields = ['email', 'full_name', 'is_active']
                
                # Only admins can change roles
                if current_user['role'] == 'admin':
                    allowed_fields.append('role')
                
                for field in allowed_fields:
                    if field in user_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(user_data[field])
                
                # Handle password update separately
                if 'password' in user_data:
                    update_fields.append("hashed_password = %s")
                    update_values.append(self.get_password_hash(user_data['password']))
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                update_values.append(user_id)
                
                query = f"""
                    UPDATE users 
                    SET {', '.join(update_fields)}
                    WHERE user_id = %s
                """
                
                cur.execute(query, update_values)
                self.conn.commit()
                
                return self.get_user_by_id(user_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_user(self, user_id: int, current_user: dict) -> dict:
        """
        Delete a user (soft delete by setting is_active to False)
        
        Args:
            user_id: User ID to delete
            current_user: Current authenticated user
            
        Returns:
            Success message
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Only admins can delete users
                if current_user['role'] != 'admin':
                    raise HTTPException(
                        status_code=403,
                        detail="Not authorized to delete users"
                    )
                
                # Check if user exists
                cur.execute("SELECT 1 FROM users WHERE user_id = %s", (user_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Prevent self-deletion
                if current_user['user_id'] == user_id:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot delete your own account"
                    )
                
                # Soft delete by setting is_active to False
                cur.execute("""
                    UPDATE users 
                    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, (user_id,))
                
                self.conn.commit()
                return {"message": "User deleted successfully"}
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_users(self, skip: int = 0, limit: int = 100) -> list:
        """
        Get all users (admin only)
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of users
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    user_id,
                    username,
                    email,
                    full_name,
                    role,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (limit, skip))
            
            users = cur.fetchall()
            return [dict(user) for user in users]
    
    def check_role_permission(self, user: dict, required_role: str) -> bool:
        """
        Check if user has required role permission
        
        Args:
            user: User data
            required_role: Required role for access
            
        Returns:
            True if user has permission, False otherwise
        """
        role_hierarchy = {
            'admin': 3,
            'editor': 2,
            'viewer': 1
        }
        
        user_role_level = role_hierarchy.get(user['role'], 0)
        required_role_level = role_hierarchy.get(required_role, 0)
        
        return user_role_level >= required_role_level
    
    def require_role(self, user: dict, required_role: str):
        """
        Require a specific role for access
        
        Args:
            user: User data
            required_role: Required role for access
            
        Raises:
            HTTPException: If user doesn't have required role
        """
        if not self.check_role_permission(user, required_role):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
    
    def change_password(self, user_id: int, old_password: str, 
                       new_password: str, current_user: dict) -> dict:
        """
        Change user password
        
        Args:
            user_id: User ID
            old_password: Current password
            new_password: New password
            current_user: Current authenticated user
            
        Returns:
            Success message
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check permissions
                if current_user['user_id'] != user_id and current_user['role'] != 'admin':
                    raise HTTPException(
                        status_code=403,
                        detail="Not authorized to change this password"
                    )
                
                # Get user with password
                cur.execute("""
                    SELECT hashed_password FROM users WHERE user_id = %s
                """, (user_id,))
                
                user = cur.fetchone()
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Verify old password (unless admin is changing someone else's password)
                if current_user['user_id'] == user_id:
                    if not self.verify_password(old_password, user['hashed_password']):
                        raise HTTPException(
                            status_code=400,
                            detail="Incorrect password"
                        )
                
                # Update password
                new_hashed_password = self.get_password_hash(new_password)
                cur.execute("""
                    UPDATE users 
                    SET hashed_password = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, (new_hashed_password, user_id))
                
                self.conn.commit()
                return {"message": "Password changed successfully"}
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))