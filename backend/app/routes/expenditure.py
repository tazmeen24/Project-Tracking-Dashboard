# app/routes/expenditure.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.expenditure import BudgetExpenditureCreate, BudgetExpenditureUpdate
from ..utils.json_encoder import DecimalEncoder
from ..utils.validators import (
    validate_transaction_date,
    validate_expenditure_against_budget
)

router = APIRouter(prefix="/expenditure", tags=["Expenditure"])

@router.post("")
async def create_budget_expenditure(exp: BudgetExpenditureCreate):
    """Create budget expenditure record (consumables, contingency, travel, overhead)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", exp.project_id, conn)
            
            # Validate transaction date
            if exp.date_incurred:
                validate_transaction_date(exp.project_id, exp.date_incurred, conn)
            
            # Validate expenditure against budget
            validate_expenditure_against_budget(exp.project_id, exp.head, exp.amount, conn)
            
            cur.execute(
                """INSERT INTO budget_expenditure (project_id, head, amount, date_incurred, description)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (exp.project_id, exp.head, exp.amount, exp.date_incurred, exp.description)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/project/{project_id}")
async def get_project_budget_expenditure(project_id: int):
    """Get all budget expenditure records for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM budget_expenditure WHERE project_id = %s ORDER BY date_incurred", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.put("/{expenditure_id}")
async def update_budget_expenditure(expenditure_id: int, exp: BudgetExpenditureUpdate):
    """Update budget expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if exp.head is not None:
                update_fields.append("head = %s")
                values.append(exp.head)
            if exp.amount is not None:
                update_fields.append("amount = %s")
                values.append(exp.amount)
            if exp.date_incurred is not None:
                update_fields.append("date_incurred = %s")
                values.append(exp.date_incurred)
            if exp.description is not None:
                update_fields.append("description = %s")
                values.append(exp.description)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(expenditure_id)
            query = f"UPDATE budget_expenditure SET {', '.join(update_fields)} WHERE expenditure_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Expenditure record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.delete("/{expenditure_id}")
async def delete_budget_expenditure(expenditure_id: int):
    """Delete budget expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM budget_expenditure WHERE expenditure_id = %s RETURNING *", (expenditure_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Expenditure record not found")
            conn.commit()
            return {"message": "Expenditure record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/allocation/project/{project_id}")
async def get_project_budget_allocation(project_id: int):
    """Get budget allocation for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM budget_allocation WHERE project_id = %s ORDER BY head", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()