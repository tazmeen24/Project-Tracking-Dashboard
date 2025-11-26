# app/routes/funds.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.budget import (
    FundsReceivedCreate, 
    FundsReceivedUpdate,
    ManpowerFundsBreakdownCreate,
    EquipmentFundsBreakdownCreate
)
from ..utils.json_encoder import DecimalEncoder
from ..utils.validators import (
    validate_funds_against_budget,
    validate_transaction_date,
    validate_manpower_funds_against_allocation,
    validate_equipment_funds_against_allocation
)

router = APIRouter(prefix="/funds", tags=["Funds"])

@router.post("/received")
async def create_funds_received(fund: FundsReceivedCreate):
    """Create funds received record"""
    conn = get_db_connection()
    warnings = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", fund.project_id, conn)
            
            # Collect warnings
            warning = validate_transaction_date(fund.project_id, fund.date_received, conn)
            if warning:
                warnings.append(warning)
            
            validate_funds_against_budget(fund.project_id, fund.head, fund.amount, conn)
            
            cur.execute(
                """INSERT INTO funds_received (project_id, head, amount, date_received, remarks)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (fund.project_id, fund.head, fund.amount, fund.date_received, fund.remarks)
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

@router.get("/received/project/{project_id}")
async def get_project_funds_received(project_id: int):
    """Get all funds received for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funds_received WHERE project_id = %s ORDER BY date_received", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.put("/received/{fund_id}")
async def update_funds_received(fund_id: int, fund: FundsReceivedUpdate):
    """Update funds received record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if fund.head is not None:
                update_fields.append("head = %s")
                values.append(fund.head)
            if fund.amount is not None:
                update_fields.append("amount = %s")
                values.append(fund.amount)
            if fund.date_received is not None:
                update_fields.append("date_received = %s")
                values.append(fund.date_received)
            if fund.remarks is not None:
                update_fields.append("remarks = %s")
                values.append(fund.remarks)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            values.append(fund_id)
            query = f"UPDATE funds_received SET {', '.join(update_fields)} WHERE fund_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Funds record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.delete("/received/{fund_id}")
async def delete_funds_received(fund_id: int):
    """Delete funds received record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM funds_received WHERE fund_id = %s RETURNING *", (fund_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Funds record not found")
            conn.commit()
            return {"message": "Funds record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.post("/breakdown/manpower")
async def create_manpower_funds_breakdown(data: ManpowerFundsBreakdownCreate):
    """Create manpower funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funds_received", "fund_id", data.fund_id, conn)
            validate_foreign_key("projects", "project_id", data.project_id, conn)
            
            validate_manpower_funds_against_allocation(data.project_id, data.role, data.num_personnel, conn)

            cur.execute(
                """INSERT INTO manpower_funds_breakdown 
                   (fund_id, project_id, role, salary_per_month, months, num_personnel)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (data.fund_id, data.project_id, data.role, data.salary_per_month, data.months, data.num_personnel)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.post("/breakdown/equipment")
async def create_equipment_funds_breakdown(data: EquipmentFundsBreakdownCreate):
    """Create equipment funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funds_received", "fund_id", data.fund_id, conn)
            validate_foreign_key("projects", "project_id", data.project_id, conn)
            
            validate_equipment_funds_against_allocation(data.project_id, data.item_name, data.quantity, conn)

            cur.execute(
                """INSERT INTO equipment_funds_breakdown 
                   (fund_id, project_id, item_name, quantity, unit_cost)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (data.fund_id, data.project_id, data.item_name, data.quantity, data.unit_cost)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/breakdown/manpower/project/{project_id}")
async def get_project_manpower_funds_breakdown(project_id: int):
    """Get manpower funds breakdown for project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM manpower_funds_breakdown WHERE project_id = %s", (project_id,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/breakdown/equipment/project/{project_id}")
async def get_project_equipment_funds_breakdown(project_id: int):
    """Get equipment funds breakdown for project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM equipment_funds_breakdown WHERE project_id = %s", (project_id,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/breakdown/summary/project/{project_id}")
async def get_funds_breakdown_summary(project_id: int):
    """Funds breakdown summary view"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funds_breakdown_summary WHERE project_id = %s", (project_id,))
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()