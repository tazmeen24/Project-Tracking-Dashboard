# app/database.py
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from .config import settings

DB_CONFIG = {
    "host": settings.DB_HOST,
    "database": settings.DB_NAME,
    "user": settings.DB_USER,
    "password": settings.DB_PASSWORD,
    "port": settings.DB_PORT,
}

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

def validate_foreign_key(table: str, column: str, value: int, conn):
    """Validate that a foreign key exists"""
    with conn.cursor() as cur:
        cur.execute(f"SELECT 1 FROM {table} WHERE {column} = %s", (value,))
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Invalid {column}: {value} does not exist in {table}")
        
def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
