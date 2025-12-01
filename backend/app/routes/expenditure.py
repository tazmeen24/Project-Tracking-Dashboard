# backend/app/routes/expenditure.py

"""
IMPORTANT: This file handles budget expenditures for:
- consumables
- contingency
- travel & training
- overhead

Manpower expenditures go in the 'manpower' table (see manpower.py)
Equipment expenditures go in the 'equipment' table (see equipment.py)
"""

from fastapi import APIRouter, HTTPException, Query, status
from psycopg2.extras import RealDictCursor
from typing import Optional
from datetime import date
import json

from ..database import get_db_connection, validate_foreign_key
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/expenditure", tags=["Expenditure"])

# ==================== CREATE ====================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_budget_expenditure(
    project_id: int,
    head: str,
    amount: float,
    date_incurred: Optional[date] = None,
    description: Optional[str] = None
):
    """
    Create budget expenditure record
    
    Valid heads: 'consumables', 'contingency', 'travel & training', 'overhead'
    
    NOTE: For manpower expenditures, use /manpower endpoint
    NOTE: For equipment expenditures, use /equipment endpoint
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            # Validate head
            valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
            if head not in valid_heads:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid head for budget_expenditure. Must be one of: {', '.join(valid_heads)}. "
                           f"Use /manpower or /equipment endpoints for those categories."
                )
            
            # Optional: Validate transaction date against project dates
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
                """INSERT INTO budget_expenditure 
                   (project_id, head, amount, date_incurred, description)
                   VALUES (%s, %s, %s, %s, %s) 
                   RETURNING *""",
                (project_id, head, amount, date_incurred, description)
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

@router.get("/{expenditure_id}", status_code=status.HTTP_200_OK)
async def get_expenditure(expenditure_id: int):
    """Get a specific expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM budget_expenditure WHERE expenditure_id = %s",
                (expenditure_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Expenditure record not found"
                )
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_budget_expenditure(
    project_id: int,
    head: Optional[str] = Query(None, description="Filter by head")
):
    """
    Get all budget expenditure records for a project
    
    Optionally filter by head (consumables, contingency, travel & training, overhead)
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if head:
                cur.execute(
                    """SELECT * FROM budget_expenditure 
                       WHERE project_id = %s AND head = %s 
                       ORDER BY date_incurred DESC""",
                    (project_id, head)
                )
            else:
                cur.execute(
                    """SELECT * FROM budget_expenditure 
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

@router.put("/{expenditure_id}", status_code=status.HTTP_200_OK)
async def update_budget_expenditure(
    expenditure_id: int,
    head: Optional[str] = None,
    amount: Optional[float] = None,
    date_incurred: Optional[date] = None,
    description: Optional[str] = None
):
    """Update budget expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if expenditure exists
            cur.execute(
                "SELECT * FROM budget_expenditure WHERE expenditure_id = %s",
                (expenditure_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Expenditure record not found"
                )
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if head is not None:
                valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
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
            
            if date_incurred is not None:
                update_fields.append("date_incurred = %s")
                values.append(date_incurred)
            
            if description is not None:
                update_fields.append("description = %s")
                values.append(description)
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            values.append(expenditure_id)
            query = f"""UPDATE budget_expenditure 
                       SET {', '.join(update_fields)} 
                       WHERE expenditure_id = %s 
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

@router.delete("/{expenditure_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget_expenditure(expenditure_id: int):
    """Delete budget expenditure record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM budget_expenditure WHERE expenditure_id = %s RETURNING *",
                (expenditure_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Expenditure record not found"
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
async def get_project_expenditure_summary(project_id: int):
    """
    Get expenditure summary by head for a project
    
    Returns total expenditure for each head (consumables, contingency, travel & training, overhead)
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT 
                       head,
                       COUNT(*) as transaction_count,
                       SUM(amount) as total_amount,
                       MIN(date_incurred) as earliest_date,
                       MAX(date_incurred) as latest_date
                   FROM budget_expenditure 
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