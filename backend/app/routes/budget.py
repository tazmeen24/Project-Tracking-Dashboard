# backend/app/routes/budget.py

from fastapi import APIRouter, HTTPException, Query, status
from psycopg2.extras import RealDictCursor
from typing import Optional
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.budget import BudgetAllocationCreate
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/budget", tags=["Budget"])

# ==================== BUDGET ALLOCATION CRUD ====================

@router.post("/allocation", status_code=status.HTTP_201_CREATED)
async def create_budget_allocation(
    project_id: int,
    head: str,
    allocated_amount: float,
    manpower_breakdown: Optional[list] = None,
    equipment_breakdown: Optional[list] = None
):
    """
    Create budget allocation with optional breakdown
    
    Valid heads: 'manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead'
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            # Validate head
            valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 
                          'travel & training', 'overhead']
            if head not in valid_heads:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid head. Must be one of: {', '.join(valid_heads)}"
                )
            
            cur.execute(
                """INSERT INTO budget_allocation (project_id, head, allocated_amount) 
                   VALUES (%s, %s, %s) RETURNING *""",
                (project_id, head, allocated_amount)
            )
            result = cur.fetchone()
            allocation_id = result['allocation_id']
            
            # Insert manpower breakdown if provided
            if head == 'manpower' and manpower_breakdown:
                for item in manpower_breakdown:
                    cur.execute(
                        """INSERT INTO manpower_allocation_breakdown 
                           (allocation_id, project_id, role, salary_per_month, months, 
                            num_personnel, qualification, experience_required)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (allocation_id, project_id, item.get('role'), 
                         item.get('salary_per_month'), item.get('months'), 
                         item.get('num_personnel', 1),
                         item.get('qualification'), item.get('experience_required'))
                    )
            
            # Insert equipment breakdown if provided
            if head == 'equipment' and equipment_breakdown:
                for item in equipment_breakdown:
                    cur.execute(
                        """INSERT INTO equipment_allocation_breakdown 
                           (allocation_id, project_id, item_name, quantity, unit_cost, 
                            description, product_website)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (allocation_id, project_id, item.get('item_name'), 
                         item.get('quantity'), item.get('unit_cost'),
                         item.get('description'), item.get('product_website'))
                    )
            
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


@router.get("/allocation/{allocation_id}", status_code=status.HTTP_200_OK)
async def get_budget_allocation(allocation_id: int):
    """Get a specific budget allocation with its breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM budget_allocation WHERE allocation_id = %s",
                (allocation_id,)
            )
            allocation = cur.fetchone()
            
            if not allocation:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail="Budget allocation not found")
            
            response = dict(allocation)
            
            # Get breakdown based on head
            if allocation['head'] == 'manpower':
                cur.execute(
                    """SELECT * FROM manpower_allocation_breakdown 
                       WHERE allocation_id = %s""",
                    (allocation_id,)
                )
                response['breakdown'] = [dict(row) for row in cur.fetchall()]
            elif allocation['head'] == 'equipment':
                cur.execute(
                    """SELECT * FROM equipment_allocation_breakdown 
                       WHERE allocation_id = %s""",
                    (allocation_id,)
                )
                response['breakdown'] = [dict(row) for row in cur.fetchall()]
            
            return json.loads(json.dumps(response, cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/allocation/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_budget_allocations(project_id: int):
    """Get all budget allocations for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM budget_allocation WHERE project_id = %s ORDER BY head",
                (project_id,)
            )
            allocations = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(allocations, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.put("/allocation/{allocation_id}", status_code=status.HTTP_200_OK)
async def update_budget_allocation(
    allocation_id: int,
    allocated_amount: Optional[float] = None
):
    """Update budget allocation amount (breakdown is updated separately)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM budget_allocation WHERE allocation_id = %s",
                (allocation_id,)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail="Budget allocation not found")
            
            if allocated_amount is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                  detail="No fields to update")
            
            cur.execute(
                """UPDATE budget_allocation 
                   SET allocated_amount = %s 
                   WHERE allocation_id = %s 
                   RETURNING *""",
                (allocated_amount, allocation_id)
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


@router.delete("/allocation/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget_allocation(allocation_id: int):
    """Delete budget allocation (will cascade delete breakdowns)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM budget_allocation WHERE allocation_id = %s",
                (allocation_id,)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail="Budget allocation not found")
            
            cur.execute(
                "DELETE FROM budget_allocation WHERE allocation_id = %s",
                (allocation_id,)
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


# ==================== MANPOWER BREAKDOWN OPERATIONS ====================

@router.get("/allocation/{allocation_id}/manpower-breakdown", status_code=status.HTTP_200_OK)
async def get_manpower_breakdown(allocation_id: int):
    """Get manpower breakdown for an allocation"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_allocation_breakdown WHERE allocation_id = %s",
                (allocation_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/allocation/project/{project_id}/manpower-breakdown", status_code=status.HTTP_200_OK)
async def get_project_manpower_breakdown(project_id: int):
    """Get all manpower breakdown for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_allocation_breakdown WHERE project_id = %s",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.delete("/manpower-breakdown/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manpower_breakdown(breakdown_id: int):
    """Delete a manpower breakdown item"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM manpower_allocation_breakdown WHERE breakdown_id = %s RETURNING *",
                (breakdown_id,)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail="Manpower breakdown not found")
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


# ==================== EQUIPMENT BREAKDOWN OPERATIONS ====================

@router.get("/allocation/{allocation_id}/equipment-breakdown", status_code=status.HTTP_200_OK)
async def get_equipment_breakdown(allocation_id: int):
    """Get equipment breakdown for an allocation"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_allocation_breakdown WHERE allocation_id = %s",
                (allocation_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/allocation/project/{project_id}/equipment-breakdown", status_code=status.HTTP_200_OK)
async def get_project_equipment_breakdown(project_id: int):
    """Get all equipment breakdown for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_allocation_breakdown WHERE project_id = %s",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.delete("/equipment-breakdown/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment_breakdown(breakdown_id: int):
    """Delete an equipment breakdown item"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM equipment_allocation_breakdown WHERE breakdown_id = %s RETURNING *",
                (breakdown_id,)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail="Equipment breakdown not found")
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