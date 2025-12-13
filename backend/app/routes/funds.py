# backend/app/routes/funds.py

"""
FUNDS AND VALIDATION ENDPOINTS
Handles funds received, validation data, and summary endpoints
"""

from fastapi import APIRouter, HTTPException, status
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Any
import json

from ..database import get_db_connection
from ..utils.json_encoder import DecimalEncoder

# Changed prefix from "/funds/validation" to "/funds" to match frontend calls
router = APIRouter(prefix="/funds", tags=["Funds"])


# ==================== BUDGET HEAD STATUS ====================

@router.get("/validation/budget-status/{project_id}/{head}", status_code=status.HTTP_200_OK)
async def get_budget_head_status(project_id: int, head: str):
    """
    Get budget head status for validation
    
    Returns:
    - Allocated budget for this head
    - Total funds received
    - Total expenditure
    - Available amount to fund
    - Available amount to spend
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get allocated budget
            cur.execute(
                """SELECT allocated_amount 
                   FROM budget_allocations 
                   WHERE project_id = %s AND head = %s""",
                (project_id, head)
            )
            allocation = cur.fetchone()
            
            if not allocation:
                return {
                    "head": head,
                    "allocated_budget": 0,
                    "total_funds_received": 0,
                   "total_expenditure": 0,
                    "available_to_fund": 0,
                    "available_to_spend": 0,
                    "message": "No budget allocated for this head"
                }
            
            allocated = float(allocation['allocated_amount'])
            
            # Get total funds received
            cur.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM funds_received 
                   WHERE project_id = %s AND head = %s""",
                (project_id, head)
            )
            funds_result = cur.fetchone()
            total_funds = float(funds_result['total'])
            
            # Get total expenditure
            cur.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM expenditure 
                   WHERE project_id = %s AND head = %s""",
                (project_id, head)
            )
            exp_result = cur.fetchone()
            total_expenditure = float(exp_result['total'])
            
            return {
                "head": head,
                "allocated_budget": allocated,
                "total_funds_received": total_funds,
                "total_expenditure": total_expenditure,
                "available_to_fund": allocated - total_funds,
                "available_to_spend": total_funds - total_expenditure,
                "utilization_percent": round((total_expenditure / allocated * 100) if allocated > 0 else 0, 2)
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch budget status: {str(e)}"
        )
    finally:
        conn.close()


# ==================== MANPOWER USAGE ====================

@router.get("/validation/manpower-usage/{project_id}/{role}", status_code=status.HTTP_200_OK)
async def get_manpower_usage(project_id: int, role: str):
    """
    Get manpower usage for a specific role
    
    Returns:
    - Approved count, salary, months
    - Funded count and amount
    - Available count to fund
    - Paid count and expenditure
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get approved breakdown
            cur.execute(
                """SELECT num_personnel, salary_per_month, months
                   FROM budget_manpower_breakdown 
                   WHERE project_id = %s AND role = %s""",
                (project_id, role)
            )
            approved = cur.fetchone()
            
            if not approved:
                return {
                    "role": role,
                    "approved_count": 0,
                    "approved_salary": 0,
                    "approved_months": 0,
                    "funded_count": 0,
                    "total_funded_amount": 0,
                    "available_count": 0,
                    "paid_count": 0,
                    "total_expenditure": 0,
                    "message": "No approved breakdown for this role"
                }
            
            approved_count = int(approved['num_personnel'])
            approved_salary = float(approved['salary_per_month'])
            approved_months = int(approved['months'])
            
            # Get funded count and amount
            cur.execute(
                """SELECT 
                       COALESCE(SUM(num_personnel), 0) as funded_count,
                       COALESCE(SUM(salary_per_month * months * num_personnel), 0) as total_amount
                   FROM manpower_funds_breakdown 
                   WHERE project_id = %s AND role = %s""",
                (project_id, role)
            )
            funded = cur.fetchone()
            funded_count = int(funded['funded_count'])
            total_funded = float(funded['total_amount'])
            
            # Get paid count and expenditure
            cur.execute(
                """SELECT 
                       COALESCE(SUM(num_personnel), 0) as paid_count,
                       COALESCE(SUM(salary_per_month * months * num_personnel), 0) as total_amount
                   FROM manpower_expenditure_breakdown 
                   WHERE project_id = %s AND role = %s""",
                (project_id, role)
            )
            paid = cur.fetchone()
            paid_count = int(paid['paid_count'])
            total_expenditure = float(paid['total_amount'])
            
            return {
                "role": role,
                "approved_count": approved_count,
                "approved_salary": approved_salary,
                "approved_months": approved_months,
                "funded_count": funded_count,
                "total_funded_amount": total_funded,
                "available_count": approved_count - funded_count,
                "paid_count": paid_count,
                "total_expenditure": total_expenditure,
                "available_to_pay": funded_count - paid_count
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch manpower usage: {str(e)}"
        )
    finally:
        conn.close()


# ==================== EQUIPMENT USAGE ====================

@router.get("/validation/equipment-usage/{project_id}/{item_name}", status_code=status.HTTP_200_OK)
async def get_equipment_usage(project_id: int, item_name: str):
    """
    Get equipment usage for a specific item
    
    Returns:
    - Approved quantity and unit cost
    - Funded quantity and amount
    - Available quantity to fund
    - Purchased quantity and expenditure
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get approved breakdown
            cur.execute(
                """SELECT quantity, unit_cost
                   FROM budget_equipment_breakdown 
                   WHERE project_id = %s AND item_name = %s""",
                (project_id, item_name)
            )
            approved = cur.fetchone()
            
            if not approved:
                return {
                    "item_name": item_name,
                    "approved_quantity": 0,
                    "approved_unit_cost": 0,
                    "funded_quantity": 0,
                    "total_funded_amount": 0,
                    "available_quantity": 0,
                    "purchased_quantity": 0,
                    "total_expenditure": 0,
                    "message": "No approved breakdown for this item"
                }
            
            approved_qty = int(approved['quantity'])
            approved_cost = float(approved['unit_cost'])
            
            # Get funded quantity and amount
            cur.execute(
                """SELECT 
                       COALESCE(SUM(quantity), 0) as funded_qty,
                       COALESCE(SUM(quantity * unit_cost), 0) as total_amount
                   FROM equipment_funds_breakdown 
                   WHERE project_id = %s AND item_name = %s""",
                (project_id, item_name)
            )
            funded = cur.fetchone()
            funded_qty = int(funded['funded_qty'])
            total_funded = float(funded['total_amount'])
            
            # Get purchased quantity and expenditure
            cur.execute(
                """SELECT 
                       COALESCE(SUM(quantity), 0) as purchased_qty,
                       COALESCE(SUM(quantity * unit_cost), 0) as total_amount
                   FROM equipment_expenditure_breakdown 
                   WHERE project_id = %s AND item_name = %s""",
                (project_id, item_name)
            )
            purchased = cur.fetchone()
            purchased_qty = int(purchased['purchased_qty'])
            total_expenditure = float(purchased['total_amount'])
            
            return {
                "item_name": item_name,
                "approved_quantity": approved_qty,
                "approved_unit_cost": approved_cost,
                "funded_quantity": funded_qty,
                "total_funded_amount": total_funded,
                "available_quantity": approved_qty - funded_qty,
                "purchased_quantity": purchased_qty,
                "total_expenditure": total_expenditure,
                "available_to_purchase": funded_qty - purchased_qty
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch equipment usage: {str(e)}"
        )
    finally:
        conn.close()


# ==================== PROJECT FINANCIAL SUMMARY ====================

@router.get("/validation/project-summary/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_financial_summary(project_id: int):
    """
    Get complete project financial summary
    
    Returns overall totals and breakdown by head
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get total budget
            cur.execute(
                """SELECT COALESCE(SUM(allocated_amount), 0) as total
                   FROM budget_allocations 
                   WHERE project_id = %s""",
                (project_id,)
            )
            total_budget = float(cur.fetchone()['total'])
            
            # Get total funds received
            cur.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM funds_received 
                   WHERE project_id = %s""",
                (project_id,)
            )
            total_funds = float(cur.fetchone()['total'])
            
            # Get total expenditure
            cur.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM expenditure 
                   WHERE project_id = %s""",
                (project_id,)
            )
            total_expenditure = float(cur.fetchone()['total'])
            
            # Get breakdown by head
            cur.execute(
                """SELECT 
                       ba.head,
                       ba.allocated_amount as allocated,
                       COALESCE(fr.total_funds, 0) as funded,
                       COALESCE(ex.total_expenditure, 0) as spent
                   FROM budget_allocations ba
                   LEFT JOIN (
                       SELECT head, SUM(amount) as total_funds
                       FROM funds_received
                       WHERE project_id = %s
                       GROUP BY head
                   ) fr ON ba.head = fr.head
                   LEFT JOIN (
                       SELECT head, SUM(amount) as total_expenditure
                       FROM expenditure
                       WHERE project_id = %s
                       GROUP BY head
                   ) ex ON ba.head = ex.head
                   WHERE ba.project_id = %s""",
                (project_id, project_id, project_id)
            )
            by_head = []
            for row in cur.fetchall():
                allocated = float(row['allocated'])
                funded = float(row['funded'])
                spent = float(row['spent'])
                by_head.append({
                    "head": row['head'],
                    "allocated": allocated,
                    "funded": funded,
                    "spent": spent,
                    "available_to_fund": allocated - funded,
                    "available_to_spend": funded - spent,
                    "budget_utilization": round((funded / allocated * 100) if allocated > 0 else 0, 2),
                    "fund_utilization": round((spent / funded * 100) if funded > 0 else 0, 2)
                })
            
            return {
                "project_id": project_id,
                "total_budget": total_budget,
                "total_funds_received": total_funds,
                "total_expenditure": total_expenditure,
                "budget_utilization_percent": round((total_funds / total_budget * 100) if total_budget > 0 else 0, 2),
                "fund_utilization_percent": round((total_expenditure / total_funds * 100) if total_funds > 0 else 0, 2),
                "available_to_fund": total_budget - total_funds,
                "available_to_spend": total_funds - total_expenditure,
                "by_head": by_head
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project summary: {str(e)}"
        )
    finally:
        conn.close()


# ==================== VALIDATION HELPERS ====================

@router.post("/validation/validate-fund/{project_id}", status_code=status.HTTP_200_OK)
async def validate_fund_creation(project_id: int, fund_data: dict):
    """
    Validate fund creation request
    
    Checks:
    - Amount doesn't exceed available budget
    - Personnel counts don't exceed approved
    - Equipment quantities don't exceed approved
    
    Returns validation result with errors and warnings
    """
    conn = get_db_connection()
    try:
        errors = []
        warnings = []
        
        head = fund_data.get('head')
        amount = float(fund_data.get('amount', 0))
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check budget availability
            cur.execute(
                """SELECT allocated_amount 
                   FROM budget_allocations 
                   WHERE project_id = %s AND head = %s""",
                (project_id, head)
            )
            allocation = cur.fetchone()
            
            if not allocation:
                errors.append(f"No budget allocated for {head}")
            else:
                allocated = float(allocation['allocated_amount'])
                
                # Get already funded
                cur.execute(
                    """SELECT COALESCE(SUM(amount), 0) as total
                       FROM funds_received 
                       WHERE project_id = %s AND head = %s""",
                    (project_id, head)
                )
                funded = float(cur.fetchone()['total'])
                available = allocated - funded
                
                if amount > available:
                    errors.append(
                        f"Amount ₹{amount:,.2f} exceeds available budget ₹{available:,.2f} "
                        f"(Allocated: ₹{allocated:,.2f}, Already funded: ₹{funded:,.2f})"
                    )
                elif amount > available * 0.9:
                    warnings.append(
                        f"Using {(amount/available*100):.1f}% of remaining budget"
                    )
            
            # TODO: Add manpower and equipment validation
            # This would check breakdown items against approved counts
            
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/validation/validate-expenditure/{project_id}", status_code=status.HTTP_200_OK)
async def validate_expenditure_creation(project_id: int, expenditure_data: dict):
    """
    Validate expenditure creation request
    
    CRITICAL CHECK: Ensures expenditure doesn't exceed available funds
    
    Returns validation result with errors and warnings
    """
    conn = get_db_connection()
    try:
        errors = []
        warnings = []
        
        head = expenditure_data.get('head')
        amount = float(expenditure_data.get('amount', 0))
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get total funds received
            cur.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM funds_received 
                   WHERE project_id = %s AND head = %s""",
                (project_id, head)
            )
            funds_available = float(cur.fetchone()['total'])
            
            # Get already spent
            cur.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM expenditure 
                   WHERE project_id = %s AND head = %s""",
                (project_id, head)
            )
            already_spent = float(cur.fetchone()['total'])
            
            available = funds_available - already_spent
            
            if amount > available:
                errors.append(
                    f"Insufficient funds! Amount ₹{amount:,.2f} exceeds available ₹{available:,.2f} "
                    f"(Funds received: ₹{funds_available:,.2f}, Already spent: ₹{already_spent:,.2f})"
                )
            elif amount > available * 0.9:
                warnings.append(
                    f"Using {(amount/available*100):.1f}% of remaining funds"
                )
            
            # TODO: Add manpower and equipment validation
            # Check if trying to pay/purchase more than funded
            
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "details": {
                "funds_available": funds_available,
                "already_spent": already_spent,
                "available": available,
                "amount_requested": amount
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )
    finally:
        conn.close()

# ==================== CREATE, UPDATE, DELETE FUNDS ====================

@router.post("/received", status_code=status.HTTP_201_CREATED)
async def create_fund(fund_data: dict):
    """Create a new fund received record with optional breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO funds_received (project_id, head, amount, date_received, remarks)
                   VALUES (%s, %s, %s, %s, %s)
                   RETURNING *""",
                (fund_data['project_id'], fund_data['head'], fund_data['amount'],
                 fund_data['date_received'], fund_data.get('remarks'))
            )
            fund = dict(cur.fetchone())
            fund_id = fund['fund_id']
            
            breakdown = fund_data.get('breakdown', [])
            fund['breakdown'] = []
            
            if fund_data['head'] == 'manpower' and breakdown:
                for item in breakdown:
                    cur.execute(
                        """INSERT INTO manpower_funds_breakdown 
                           (fund_id, project_id, role, salary_per_month, months, num_personnel)
                           VALUES (%s, %s, %s, %s, %s, %s)
                           RETURNING *""",
                        (fund_id, fund_data['project_id'], item['role'], 
                         item['salary_per_month'], item['months'], item['num_personnel'])
                    )
                    fund['breakdown'].append(dict(cur.fetchone()))
                    
            elif fund_data['head'] == 'equipment' and breakdown:
                for item in breakdown:
                    cur.execute(
                        """INSERT INTO equipment_funds_breakdown 
                           (fund_id, project_id, item_name, quantity, unit_cost)
                           VALUES (%s, %s, %s, %s, %s)
                           RETURNING *""",
                        (fund_id, fund_data['project_id'], item['item_name'], 
                         item['quantity'], item['unit_cost'])
                    )
                    fund['breakdown'].append(dict(cur.fetchone()))
            
            conn.commit()
            return json.loads(json.dumps(fund, cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to create fund: {str(e)}")
    finally:
        conn.close()


@router.put("/received/{fund_id}", status_code=status.HTTP_200_OK)
async def update_fund(fund_id: int, update_data: dict):
    """Update fund received record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields = []
            values = []
            
            for field in ['head', 'amount', 'date_received', 'remarks']:
                if field in update_data:
                    update_fields.append(f"{field} = %s")
                    values.append(update_data[field])
            
            if not update_fields:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                  detail="No fields to update")
            
            values.append(fund_id)
            query = f"UPDATE funds_received SET {', '.join(update_fields)} WHERE fund_id = %s RETURNING *"
            
            cur.execute(query, values)
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail=f"Fund {fund_id} not found")
            
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to update fund: {str(e)}")
    finally:
        conn.close()


@router.delete("/received/{fund_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fund(fund_id: int):
    """Delete fund received record"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM funds_received WHERE fund_id = %s", (fund_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail=f"Fund {fund_id} not found")
            conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to delete fund: {str(e)}")
    finally:
        conn.close()


# ==================== MANPOWER FUNDS BREAKDOWN ====================

@router.get("/breakdown/manpower/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_manpower_funds_breakdown(project_id: int):
    """Get all manpower funds breakdown for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM manpower_funds_breakdown 
                   WHERE project_id = %s 
                   ORDER BY fund_id, role""",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to fetch manpower breakdown: {str(e)}")
    finally:
        conn.close()


@router.post("/breakdown/manpower", status_code=status.HTTP_201_CREATED)
async def create_manpower_funds_breakdown(breakdown_data: dict):
    """Create manpower funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO manpower_funds_breakdown 
                   (fund_id, project_id, role, salary_per_month, months, num_personnel)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   RETURNING *""",
                (breakdown_data['fund_id'], breakdown_data['project_id'],
                 breakdown_data['role'], breakdown_data['salary_per_month'],
                 breakdown_data['months'], breakdown_data['num_personnel'])
            )
            result = dict(cur.fetchone())
            conn.commit()
            return json.loads(json.dumps(result, cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to create breakdown: {str(e)}")
    finally:
        conn.close()


@router.delete("/breakdown/manpower/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manpower_funds_breakdown(breakdown_id: int):
    """Delete manpower funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM manpower_funds_breakdown WHERE breakdown_id = %s",
                       (breakdown_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail=f"Breakdown {breakdown_id} not found")
            conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to delete breakdown: {str(e)}")
    finally:
        conn.close()


# ==================== EQUIPMENT FUNDS BREAKDOWN ====================

@router.get("/breakdown/equipment/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_equipment_funds_breakdown(project_id: int):
    """Get all equipment funds breakdown for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM equipment_funds_breakdown 
                   WHERE project_id = %s 
                   ORDER BY fund_id, item_name""",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to fetch equipment breakdown: {str(e)}")
    finally:
        conn.close()


@router.post("/breakdown/equipment", status_code=status.HTTP_201_CREATED)
async def create_equipment_funds_breakdown(breakdown_data: dict):
    """Create equipment funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO equipment_funds_breakdown 
                   (fund_id, project_id, item_name, quantity, unit_cost)
                   VALUES (%s, %s, %s, %s, %s)
                   RETURNING *""",
                (breakdown_data['fund_id'], breakdown_data['project_id'],
                 breakdown_data['item_name'], breakdown_data['quantity'],
                 breakdown_data['unit_cost'])
            )
            result = dict(cur.fetchone())
            conn.commit()
            return json.loads(json.dumps(result, cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to create breakdown: {str(e)}")
    finally:
        conn.close()


@router.delete("/breakdown/equipment/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment_funds_breakdown(breakdown_id: int):
    """Delete equipment funds breakdown"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipment_funds_breakdown WHERE breakdown_id = %s",
                       (breakdown_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail=f"Breakdown {breakdown_id} not found")
            conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Failed to delete breakdown: {str(e)}")
    finally:
        conn.close()


# ==================== GET FUNDS BY PROJECT ====================

@router.get("/received/{fund_id}", status_code=status.HTTP_200_OK)
async def get_fund_by_id(fund_id: int):
    """
    Get a single fund by fund_id, including breakdown if manpower/equipment
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get the fund
            cur.execute(
                """SELECT *
                   FROM funds_received
                   WHERE fund_id = %s""",
                (fund_id,)
            )
            fund = cur.fetchone()
            
            if not fund:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Fund {fund_id} not found"
                )
            
            fund = dict(fund)
            
            # Get breakdown if manpower or equipment
            if fund['head'] == 'manpower':
                cur.execute(
                    """SELECT *
                       FROM manpower_funds_breakdown
                       WHERE fund_id = %s
                       ORDER BY role""",
                    (fund_id,)
                )
                fund['breakdown'] = [dict(row) for row in cur.fetchall()]
                
            elif fund['head'] == 'equipment':
                cur.execute(
                    """SELECT *
                       FROM equipment_funds_breakdown
                       WHERE fund_id = %s
                       ORDER BY item_name""",
                    (fund_id,)
                )
                fund['breakdown'] = [dict(row) for row in cur.fetchall()]
            else:
                fund['breakdown'] = []
            
            return json.loads(json.dumps(fund, cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch fund: {str(e)}"
        )
    finally:
        conn.close()

@router.get("/received/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_funds_by_project(project_id: int, head: str = None):
    """
    Get all funds received for a project, optionally filtered by budget head
    
    For manpower and equipment, includes breakdown details from respective breakdown tables
    
    Query params:
    - head: Optional budget head filter
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if head:
                # Get funds for specific head
                cur.execute(
                    """SELECT *
                       FROM funds_received
                       WHERE project_id = %s AND head = %s
                       ORDER BY date_received DESC""",
                    (project_id, head)
                )
                funds = [dict(row) for row in cur.fetchall()]
                
                # If manpower or equipment, fetch breakdown details for each fund
                if head == 'manpower':
                    for fund in funds:
                        cur.execute(
                            """SELECT *
                               FROM manpower_funds_breakdown
                               WHERE fund_id = %s
                               ORDER BY role""",
                            (fund['fund_id'],)
                        )
                        fund['breakdown'] = [dict(row) for row in cur.fetchall()]
                        
                elif head == 'equipment':
                    for fund in funds:
                        cur.execute(
                            """SELECT *
                               FROM equipment_funds_breakdown
                               WHERE fund_id = %s
                               ORDER BY item_name""",
                            (fund['fund_id'],)
                        )
                        fund['breakdown'] = [dict(row) for row in cur.fetchall()]
                
                return json.loads(json.dumps(funds, cls=DecimalEncoder))
            else:
                # Get all funds for project (no head filter)
                cur.execute(
                    """SELECT *
                       FROM funds_received
                       WHERE project_id = %s
                       ORDER BY date_received DESC""",
                    (project_id,)
                )
                results = [dict(row) for row in cur.fetchall()]
                return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch funds: {str(e)}"
        )
    finally:
        conn.close()


# ==================== SUMMARY ENDPOINTS ====================

@router.get("/received/project/{project_id}/summary", status_code=status.HTTP_200_OK)
async def get_project_funds_summary(project_id: int):
    """
    Get funds received summary by head for a project
    
    Returns total funds for each head
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


@router.get("/validation/breakdown/summary/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_funds_breakdown_summary(project_id: int):
    """
    Get funds breakdown summary using the database view
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM funds_breakdown_summary 
                   WHERE project_id = %s 
                   ORDER BY head, breakdown_type""",
                (project_id,)
            )
            results = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(results, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )
    finally:
        conn.close()