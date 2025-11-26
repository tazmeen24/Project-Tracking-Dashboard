# app/routes/equipment.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.expenditure import EquipmentCreate, EquipmentUpdate
from ..utils.json_encoder import DecimalEncoder
from ..utils.validators import (
    validate_transaction_date,
    validate_equipment_cost_against_breakdown,
    validate_equipment_against_approved_quantity,
    validate_expenditure_against_budget
)

router = APIRouter(prefix="/equipment", tags=["Equipment"])

@router.post("")
async def create_equipment(equip: EquipmentCreate):
    """Create equipment expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", equip.project_id, conn)
            
            # Validate transaction date
            if equip.purchase_date:
                validate_transaction_date(equip.project_id, equip.purchase_date, conn)

            # Validate unit cost matches approved breakdown
            validate_equipment_cost_against_breakdown(equip.project_id, equip.name, equip.unit_cost, equip.quantity, conn)
            
            # Validate against approved quantity
            validate_equipment_against_approved_quantity(equip.project_id, equip.name, equip.quantity, conn)
            
            # Validate expenditure against budget
            total_amount = equip.quantity * equip.unit_cost
            validate_expenditure_against_budget(equip.project_id, 'equipment', total_amount, conn)
            
            cur.execute(
                """INSERT INTO equipment (project_id, name, purchase_date, quantity, unit_cost)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (equip.project_id, equip.name, equip.purchase_date, equip.quantity, equip.unit_cost)
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
async def get_project_equipment(project_id: int):
    """Get all equipment records for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM equipment WHERE project_id = %s ORDER BY purchase_date", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.put("/{equipment_id}")
async def update_equipment(equipment_id: int, equip: EquipmentUpdate):
    """Update equipment record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if equip.name is not None:
                update_fields.append("name = %s")
                values.append(equip.name)
            if equip.purchase_date is not None:
                update_fields.append("purchase_date = %s")
                values.append(equip.purchase_date)
            if equip.quantity is not None:
                update_fields.append("quantity = %s")
                values.append(equip.quantity)
            if equip.unit_cost is not None:
                update_fields.append("unit_cost = %s")
                values.append(equip.unit_cost)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(equipment_id)
            query = f"UPDATE equipment SET {', '.join(update_fields)} WHERE equipment_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Equipment record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.delete("/{equipment_id}")
async def delete_equipment(equipment_id: int):
    """Delete equipment record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM equipment WHERE equipment_id = %s RETURNING *", (equipment_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Equipment record not found")
            conn.commit()
            return {"message": "Equipment record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/plan-vs-actual/project/{project_id}")
async def get_equipment_plan_vs_actual(project_id: int):
    """Get plan vs actual comparison for equipment"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_plan_vs_actual WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()