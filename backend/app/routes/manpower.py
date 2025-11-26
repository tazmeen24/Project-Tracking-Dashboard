# app/routes/manpower.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.expenditure import ManpowerCreate, ManpowerUpdate
from ..utils.json_encoder import DecimalEncoder
from ..utils.validators import (
    validate_transaction_date,
    validate_manpower_salary_against_breakdown,
    validate_manpower_against_approved_posts,
    validate_expenditure_against_budget
)

router = APIRouter(prefix="/manpower", tags=["Manpower"])

@router.post("")
async def create_manpower(man: ManpowerCreate):
    """Create manpower expenditure record"""
    conn = get_db_connection()
    warnings = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", man.project_id, conn)
            
            # Collect warnings
            if man.date_incurred:
                warning = validate_transaction_date(man.project_id, man.date_incurred, conn)
                if warning:
                    warnings.append(warning)
            
            # Validate salary matches approved breakdown
            validate_manpower_salary_against_breakdown(man.project_id, man.role, man.salary_per_month, conn)
            
            validate_manpower_against_approved_posts(man.project_id, man.role, man.num_personnel, conn)
            
            total_amount = man.salary_per_month * man.months * man.num_personnel
            validate_expenditure_against_budget(man.project_id, 'manpower', total_amount, conn)

            cur.execute(
                """INSERT INTO manpower (project_id, role, salary_per_month, months, date_incurred, num_personnel)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (man.project_id, man.role, man.salary_per_month, man.months, man.date_incurred, man.num_personnel)
            )
            result = cur.fetchone()
            conn.commit()
            
            response_data = json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
            if warnings:
                return {
                    "data": response_data,
                    "warnings": warnings
                }
            
            return response_data
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/project/{project_id}")
async def get_project_manpower(project_id: int):
    """Get all manpower records for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM manpower WHERE project_id = %s ORDER BY date_incurred", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.put("/{manpower_id}")
async def update_manpower(manpower_id: int, man: ManpowerUpdate):
    """Update manpower record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if man.role is not None:
                update_fields.append("role = %s")
                values.append(man.role)
            if man.salary_per_month is not None:
                update_fields.append("salary_per_month = %s")
                values.append(man.salary_per_month)
            if man.months is not None:
                update_fields.append("months = %s")
                values.append(man.months)
            if man.date_incurred is not None:
                update_fields.append("date_incurred = %s")
                values.append(man.date_incurred)
            if man.num_personnel is not None:
                update_fields.append("num_personnel = %s")
                values.append(man.num_personnel)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(manpower_id)
            query = f"UPDATE manpower SET {', '.join(update_fields)} WHERE manpower_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Manpower record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.delete("/{manpower_id}")
async def delete_manpower(manpower_id: int):
    """Delete manpower record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM manpower WHERE manpower_id = %s RETURNING *", (manpower_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Manpower record not found")
            conn.commit()
            return {"message": "Manpower record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/plan-vs-actual/project/{project_id}")
async def get_manpower_plan_vs_actual(project_id: int):
    """Get plan vs actual comparison for manpower"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_plan_vs_actual WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()