# backend/app/routes/equipment.py

"""
EQUIPMENT EXPENDITURES (Actual)

This handles ACTUAL equipment expenditures in the 'equipment' table.
This is different from:
- equipment_allocation_breakdown (planned/allocated)
- equipment_funds_breakdown (funds received breakdown)
"""

from fastapi import APIRouter, HTTPException, Query, status
from psycopg2.extras import RealDictCursor
from typing import Optional
from datetime import date
import json

from ..database import get_db_connection, validate_foreign_key
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/equipment", tags=["Equipment Expenditure"])

# ==================== CREATE ====================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_equipment_expenditure(
    project_id: int,
    name: str,
    quantity: int,
    unit_cost: float,
    purchase_date: Optional[date] = None
):
    """
    Create actual equipment expenditure
    
    Total cost will be automatically calculated as: quantity * unit_cost
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            # Optional: Validate against project dates
            if purchase_date:
                cur.execute(
                    "SELECT start_date, end_date FROM projects WHERE project_id = %s",
                    (project_id,)
                )
                project = cur.fetchone()
                if project and project['start_date'] and purchase_date < project['start_date']:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Purchase date ({purchase_date}) is before project start date ({project['start_date']})"
                    )
            
            cur.execute(
                """INSERT INTO equipment 
                   (project_id, name, quantity, unit_cost, purchase_date)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (project_id, name, quantity, unit_cost, purchase_date)
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

@router.get("/{equipment_id}", status_code=status.HTTP_200_OK)
async def get_equipment_expenditure(equipment_id: int):
    """Get a specific equipment expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment WHERE equipment_id = %s",
                (equipment_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Equipment expenditure not found"
                )
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_equipment_expenditures(
    project_id: int,
    name: Optional[str] = Query(None, description="Filter by equipment name")
):
    """Get all equipment expenditures for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if name:
                cur.execute(
                    """SELECT * FROM equipment 
                       WHERE project_id = %s AND name ILIKE %s 
                       ORDER BY purchase_date DESC""",
                    (project_id, f"%{name}%")
                )
            else:
                cur.execute(
                    """SELECT * FROM equipment 
                       WHERE project_id = %s 
                       ORDER BY purchase_date DESC""",
                    (project_id,)
                )
            
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== UPDATE ====================

@router.put("/{equipment_id}", status_code=status.HTTP_200_OK)
async def update_equipment_expenditure(
    equipment_id: int,
    name: Optional[str] = None,
    quantity: Optional[int] = None,
    unit_cost: Optional[float] = None,
    purchase_date: Optional[date] = None
):
    """Update equipment expenditure (total_cost will be recalculated automatically)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if equipment exists
            cur.execute(
                "SELECT * FROM equipment WHERE equipment_id = %s",
                (equipment_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Equipment expenditure not found"
                )
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if name is not None:
                update_fields.append("name = %s")
                values.append(name)
            
            if quantity is not None:
                update_fields.append("quantity = %s")
                values.append(quantity)
            
            if unit_cost is not None:
                update_fields.append("unit_cost = %s")
                values.append(unit_cost)
            
            if purchase_date is not None:
                update_fields.append("purchase_date = %s")
                values.append(purchase_date)
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            values.append(equipment_id)
            query = f"""UPDATE equipment 
                       SET {', '.join(update_fields)} 
                       WHERE equipment_id = %s 
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

@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment_expenditure(equipment_id: int):
    """Delete equipment expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM equipment WHERE equipment_id = %s RETURNING *",
                (equipment_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Equipment expenditure not found"
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
async def get_project_equipment_summary(project_id: int):
    """
    Get equipment expenditure summary for a project
    
    Returns total expenditure by equipment name
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT 
                       name,
                       SUM(quantity) as total_quantity,
                       AVG(unit_cost) as avg_unit_cost,
                       SUM(total_cost) as total_cost
                   FROM equipment 
                   WHERE project_id = %s 
                   GROUP BY name
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
async def get_project_equipment_total(project_id: int):
    """Get total equipment expenditure for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT 
                       COUNT(*) as total_entries,
                       SUM(quantity) as total_items,
                       COALESCE(SUM(total_cost), 0) as total_expenditure
                   FROM equipment 
                   WHERE project_id = %s""",
                (project_id,)
            )
            result = cur.fetchone()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()