# backend/app/routes/manpower.py

"""
MANPOWER EXPENDITURES (Actual)

This handles ACTUAL manpower expenditures in the 'manpower' table.
This is different from:
- manpower_allocation_breakdown (planned/allocated)
- manpower_funds_breakdown (funds received breakdown)
"""

from fastapi import APIRouter, HTTPException, Query, status
from psycopg2.extras import RealDictCursor
from typing import Optional
from datetime import date
import json

from ..database import get_db_connection, validate_foreign_key
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/manpower", tags=["Manpower Expenditure"])

# ==================== CREATE ====================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_manpower_expenditure(
    project_id: int,
    role: str,
    salary_per_month: float,
    months: int,
    num_personnel: int = 1,
    date_incurred: Optional[date] = None
):
    """
    Create actual manpower expenditure
    
    Total cost will be automatically calculated as: salary_per_month * months * num_personnel
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            # Optional: Validate against project dates
            if date_incurred:
                cur.execute(
                    "SELECT start_date, end_date FROM projects WHERE project_id = %s",
                    (project_id,)
                )
                project = cur.fetchone()
                if project and project['start_date'] and date_incurred < project['start_date']:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Expenditure date ({date_incurred}) is before project start date ({project['start_date']})"
                    )
            
            cur.execute(
                """INSERT INTO manpower 
                   (project_id, role, salary_per_month, months, num_personnel, date_incurred)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (project_id, role, salary_per_month, months, num_personnel, date_incurred)
            )
            result = cur.fetchone()
            conn.commit()
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


# ==================== READ ====================

@router.get("/{manpower_id}", status_code=status.HTTP_200_OK)
async def get_manpower_expenditure(manpower_id: int):
    """Get a specific manpower expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower WHERE manpower_id = %s",
                (manpower_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Manpower expenditure not found"
                )
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_manpower_expenditures(
    project_id: int,
    role: Optional[str] = Query(None, description="Filter by role")
):
    """Get all manpower expenditures for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if role:
                cur.execute(
                    """SELECT * FROM manpower 
                       WHERE project_id = %s AND role = %s 
                       ORDER BY date_incurred DESC""",
                    (project_id, role)
                )
            else:
                cur.execute(
                    """SELECT * FROM manpower 
                       WHERE project_id = %s 
                       ORDER BY date_incurred DESC""",
                    (project_id,)
                )
            
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== UPDATE ====================

@router.put("/{manpower_id}", status_code=status.HTTP_200_OK)
async def update_manpower_expenditure(
    manpower_id: int,
    role: Optional[str] = None,
    salary_per_month: Optional[float] = None,
    months: Optional[int] = None,
    num_personnel: Optional[int] = None,
    date_incurred: Optional[date] = None
):
    """Update manpower expenditure (total_cost will be recalculated automatically)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if manpower exists
            cur.execute(
                "SELECT * FROM manpower WHERE manpower_id = %s",
                (manpower_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Manpower expenditure not found"
                )
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if role is not None:
                update_fields.append("role = %s")
                values.append(role)
            
            if salary_per_month is not None:
                update_fields.append("salary_per_month = %s")
                values.append(salary_per_month)
            
            if months is not None:
                update_fields.append("months = %s")
                values.append(months)
            
            if num_personnel is not None:
                update_fields.append("num_personnel = %s")
                values.append(num_personnel)
            
            if date_incurred is not None:
                update_fields.append("date_incurred = %s")
                values.append(date_incurred)
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            values.append(manpower_id)
            query = f"""UPDATE manpower 
                       SET {', '.join(update_fields)} 
                       WHERE manpower_id = %s 
                       RETURNING *"""
            
            cur.execute(query, values)
            result = cur.fetchone()
            conn.commit()
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


# ==================== DELETE ====================

@router.delete("/{manpower_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manpower_expenditure(manpower_id: int):
    """Delete manpower expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM manpower WHERE manpower_id = %s RETURNING *",
                (manpower_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Manpower expenditure not found"
                )
            
            conn.commit()
            return None
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== SUMMARY ENDPOINTS ====================

@router.get("/project/{project_id}/summary", status_code=status.HTTP_200_OK)
async def get_project_manpower_summary(project_id: int):
    """
    Get manpower expenditure summary for a project
    
    Returns total expenditure by role
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT 
                       role,
                       COUNT(*) as transaction_count,
                       SUM(num_personnel) as total_personnel,
                       SUM(total_cost) as total_cost,
                       AVG(salary_per_month) as avg_salary_per_month
                   FROM manpower 
                   WHERE project_id = %s 
                   GROUP BY role
                   ORDER BY total_cost DESC""",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/project/{project_id}/total", status_code=status.HTTP_200_OK)
async def get_project_manpower_total(project_id: int):
    """Get total manpower expenditure for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT 
                       COUNT(*) as total_entries,
                       COALESCE(SUM(total_cost), 0) as total_expenditure
                   FROM manpower 
                   WHERE project_id = %s""",
                (project_id,)
            )
            result = cur.fetchone()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()