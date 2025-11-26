# backend/app/routes/lookups.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
from ..database import get_db_connection

router = APIRouter(tags=["Lookups"])  

@router.get("/technical-groups")
async def get_technical_groups():
    """Get all technical groups"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM technical_groups ORDER BY name")
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/funding-agencies")
async def get_funding_agencies():
    """Get all funding agencies"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agencies ORDER BY name")
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()