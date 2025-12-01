# backend/app/routes/funds.py

"""
FUNDS RECEIVED endpoint
Handles all budget heads: manpower, equipment, consumables, contingency, travel & training, overhead

Funds can optionally have breakdowns:
- Manpower funds can have breakdown by role
- Equipment funds can have breakdown by item
"""

from fastapi import APIRouter, HTTPException, Query, status
from psycopg2.extras import RealDictCursor
from typing import Optional
from datetime import date
import json

from ..database import get_db_connection, validate_foreign_key
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/funds", tags=["Funds"])

# ==================== FUNDS RECEIVED CRUD ====================

@router.post("/received", status_code=status.HTTP_201_CREATED)
async def create_funds_received(
    project_id: int,
    head: str,
    amount: float,
    date_received: date,
    remarks: Optional[str] = None
):
    """
    Create funds received record
    
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
            
            # Optional: Validate against project dates
            cur.execute(
                "SELECT start_date, end_date FROM projects WHERE project_id = %s",
                (project_id,)
            )
            project = cur.fetchone()
            if project and project['start_date'] and date_received < project['start_date']:
                # Just a warning, don't block
                pass
            
            cur.execute(
                """INSERT INTO funds_received (project_id, head, amount, date_received, remarks)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (project_id, head, amount, date_received, remarks)
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


@router.get("/received/{fund_id}", status_code=status.HTTP_200_OK)
async def get_funds_received(fund_id: int):
    """Get a specific funds received record with breakdowns if applicable"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM funds_received WHERE fund_id = %s",
                (fund_id,)
            )
            fund = cur.fetchone()
            
            if not fund:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Funds record not found"
                )
            
            response = dict(fund)
            
            # Get breakdown if exists
            if fund['head'] == 'manpower':
                cur.execute(
                    "SELECT * FROM manpower_funds_breakdown WHERE fund_id = %s",
                    (fund_id,)
                )
                response['breakdown'] = [dict(row) for row in cur.fetchall()]
            elif fund['head'] == 'equipment':
                cur.execute(
                    "SELECT * FROM equipment_funds_breakdown WHERE fund_id = %s",
                    (fund_id,)
                )
                response['breakdown'] = [dict(row) for row in cur.fetchall()]
            
            return json.loads(json.dumps(response, cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/received/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_funds_received(
    project_id: int,
    head: Optional[str] = Query(None, description="Filter by head")
):
    """Get all funds received for a project, optionally filtered by head"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if head:
                cur.execute(
                    """SELECT * FROM funds_received 
                       WHERE project_id = %s AND head = %s 
                       ORDER BY date_received DESC""",
                    (project_id, head)
                )
            else:
                cur.execute(
                    """SELECT * FROM funds_received 
                       WHERE project_id = %s 
                       ORDER BY date_received DESC""",
                    (project_id,)
                )
            
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.put("/received/{fund_id}", status_code=status.HTTP_200_OK)
async def update_funds_received(
    fund_id: int,
    head: Optional[str] = None,
    amount: Optional[float] = None,
    date_received: Optional[date] = None,
    remarks: Optional[str] = None
):
    """Update funds received record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if fund exists
            cur.execute(
                "SELECT * FROM funds_received WHERE fund_id = %s",
                (fund_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Funds record not found"
                )
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if head is not None:
                valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 
                              'travel & training', 'overhead']
                if head not in valid_heads:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid head. Must be one of: {', '.join(valid_heads)}"
                    )
                update_fields.append("head = %s")
                values.append(head)
            
            if amount is not None:
                update_fields.append("amount = %s")
                values.append(amount)
            
            if date_received is not None:
                update_fields.append("date_received = %s")
                values.append(date_received)
            
            if remarks is not None:
                update_fields.append("remarks = %s")
                values.append(remarks)
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            values.append(fund_id)
            query = f"""UPDATE funds_received 
                       SET {', '.join(update_fields)} 
                       WHERE fund_id = %s 
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


@router.delete("/received/{fund_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funds_received(fund_id: int):
    """Delete funds received record (will cascade delete breakdowns)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM funds_received WHERE fund_id = %s RETURNING *",
                (fund_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Funds record not found"
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


# ==================== MANPOWER FUNDS BREAKDOWN ====================

@router.post("/breakdown/manpower", status_code=status.HTTP_201_CREATED)
async def create_manpower_funds_breakdown(
    fund_id: int,
    project_id: int,
    role: str,
    salary_per_month: float,
    months: int,
    num_personnel: int = 1
):
    """Create manpower funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funds_received", "fund_id", fund_id, conn)
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            cur.execute(
                """INSERT INTO manpower_funds_breakdown 
                   (fund_id, project_id, role, salary_per_month, months, num_personnel)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (fund_id, project_id, role, salary_per_month, months, num_personnel)
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


@router.get("/breakdown/manpower/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_manpower_funds_breakdown(project_id: int):
    """Get manpower funds breakdown for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_funds_breakdown WHERE project_id = %s",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.delete("/breakdown/manpower/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manpower_funds_breakdown(breakdown_id: int):
    """Delete manpower funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM manpower_funds_breakdown WHERE breakdown_id = %s RETURNING *",
                (breakdown_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Manpower funds breakdown not found"
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


# ==================== EQUIPMENT FUNDS BREAKDOWN ====================

@router.post("/breakdown/equipment", status_code=status.HTTP_201_CREATED)
async def create_equipment_funds_breakdown(
    fund_id: int,
    project_id: int,
    item_name: str,
    quantity: int,
    unit_cost: float
):
    """Create equipment funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funds_received", "fund_id", fund_id, conn)
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            cur.execute(
                """INSERT INTO equipment_funds_breakdown 
                   (fund_id, project_id, item_name, quantity, unit_cost)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (fund_id, project_id, item_name, quantity, unit_cost)
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


@router.get("/breakdown/equipment/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_equipment_funds_breakdown(project_id: int):
    """Get equipment funds breakdown for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_funds_breakdown WHERE project_id = %s",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.delete("/breakdown/equipment/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment_funds_breakdown(breakdown_id: int):
    """Delete equipment funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM equipment_funds_breakdown WHERE breakdown_id = %s RETURNING *",
                (breakdown_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Equipment funds breakdown not found"
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

@router.get("/received/project/{project_id}/summary", status_code=status.HTTP_200_OK)
async def get_project_funds_summary(project_id: int):
    """
    Get funds received summary by head for a project
    
    Returns total funds received for each head
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT 
                       head,
                       COUNT(*) as transaction_count,
                       SUM(amount) as total_amount,
                       MIN(date_received) as earliest_date,
                       MAX(date_received) as latest_date
                   FROM funds_received 
                   WHERE project_id = %s 
                   GROUP BY head
                   ORDER BY head""",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/breakdown/summary/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_funds_breakdown_summary(project_id: int):
    """
    Get funds breakdown summary using the database view
    
    This view aggregates breakdown details for manpower and equipment funds
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM funds_breakdown_summary WHERE project_id = %s",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()