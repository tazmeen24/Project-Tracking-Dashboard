# app/routes/dashboard.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
from ..database import get_db_connection

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats():
    """Get overall dashboard statistics"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) as total_projects FROM projects")
            total_projects = cur.fetchone()['total_projects']
            
            cur.execute("""
                SELECT COUNT(*) as active_projects 
                FROM projects 
                WHERE end_date IS NULL OR end_date >= CURRENT_DATE
            """)
            active_projects = cur.fetchone()['active_projects']
            
            cur.execute("""
                SELECT 
                    SUM(planned_allocation) AS total_allocation,
                    SUM(funds_received) AS total_funds,
                    SUM(actual_expenditure) AS total_expenditure
                FROM project_head_summary
            """)
            financial_stats = cur.fetchone()
            
            return {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "total_allocation": float(financial_stats['total_allocation'] or 0),
                "total_funds": float(financial_stats['total_funds'] or 0),
                "total_expenditure": float(financial_stats['total_expenditure'] or 0),
                "balance": float(
                    (financial_stats['total_funds'] or 0) -
                    (financial_stats['total_expenditure'] or 0)
                )
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()