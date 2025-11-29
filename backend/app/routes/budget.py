# app/routes/budget.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.budget import BudgetAllocationCreate
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/budget", tags=["Budget"])

@router.post("/allocation")
async def create_budget_allocation(allocation: BudgetAllocationCreate):
    """Create budget allocation with breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", allocation.project_id, conn)
            
            cur.execute(
                "INSERT INTO budget_allocation (project_id, head, allocated_amount) VALUES (%s, %s, %s) RETURNING *",
                (allocation.project_id, allocation.head, allocation.allocated_amount)
            )
            result = cur.fetchone()
            allocation_id = result['allocation_id']
            
            # Insert manpower breakdown if provided
            if allocation.head == 'manpower' and allocation.manpower_breakdown:
                for item in allocation.manpower_breakdown:
                    cur.execute(
                        """INSERT INTO manpower_allocation_breakdown 
                           (allocation_id, project_id, role, salary_per_month, months, num_personnel)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (allocation_id, allocation.project_id, item.role, 
                         item.salary_per_month, item.months, item.num_personnel)
                    )
            
            # Insert equipment breakdown if provided
            if allocation.head == 'equipment' and allocation.equipment_breakdown:
                for item in allocation.equipment_breakdown:
                    cur.execute(
                        """INSERT INTO equipment_allocation_breakdown 
                           (allocation_id, project_id, item_name, quantity, unit_cost)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (allocation_id, allocation.project_id, item.item_name, 
                         item.quantity, item.unit_cost)
                    )
            
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/allocation/{allocation_id}/manpower-breakdown")
async def get_manpower_breakdown(allocation_id: int):
    """Get manpower breakdown for an allocation"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_allocation_breakdown WHERE allocation_id = %s",
                (allocation_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/allocation/{allocation_id}/equipment-breakdown")
async def get_equipment_breakdown(allocation_id: int):
    """Get equipment breakdown for an allocation"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_allocation_breakdown WHERE allocation_id = %s",
                (allocation_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/allocation/project/{project_id}/manpower-breakdown")
async def get_project_manpower_breakdown(project_id: int):
    """Get all manpower breakdown for a project (for dropdown population)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_allocation_breakdown WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/allocation/project/{project_id}/equipment-breakdown")
async def get_project_equipment_breakdown(project_id: int):
    """Get all equipment breakdown for a project (for dropdown population)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_allocation_breakdown WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()