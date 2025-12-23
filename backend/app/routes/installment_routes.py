# backend/app/routes/installment.py

from fastapi import APIRouter, HTTPException, status
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field, validator
import json

from ..database import get_db_connection
from ..auth import get_current_user
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/api/installments", tags=["Installments"])

# ==================== PYDANTIC MODELS ====================

class InstallmentBase(BaseModel):
    installment_number: int = Field(..., gt=0)
    sanction_number: str = Field(..., min_length=1)
    sanction_date: date
    total_amount: float = Field(..., gt=0)
    date_received: date
    remarks: Optional[str] = None

    @validator('date_received')
    def validate_dates(cls, v, values):
        if 'sanction_date' in values and v < values['sanction_date']:
            raise ValueError('Date received cannot be before sanction date')
        return v

class FundAllocation(BaseModel):
    head: str
    amount: float = Field(..., gt=0)
    breakdown: List[Dict] = Field(default=[])

    @validator('head')
    def validate_head(cls, v):
        valid_heads = ['manpower', 'equipment', 'consumables', 'travel & training', 'contingency', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v

class InstallmentWithFunds(BaseModel):
    installment: InstallmentBase
    fund_allocations: List[FundAllocation] = Field(..., min_items=1)

    @validator('fund_allocations')
    def validate_total_amount(cls, v, values):
        if 'installment' in values:
            total_allocated = sum(fund.amount for fund in v)
            if abs(total_allocated - values['installment'].total_amount) > 0.01:
                raise ValueError(
                    f'Total allocated (₹{total_allocated}) must equal installment amount (₹{values["installment"].total_amount})'
                )
        return v

# ==================== HELPER FUNCTIONS ====================

def get_installment_with_funds(conn, installment_id: int):
    """Get installment with all fund allocations and breakdowns"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM project_installments
            WHERE installment_id = %s
        """, (installment_id,))
        
        installment = cur.fetchone()
        if not installment:
            return None
        
        # Get funds
        cur.execute("""
            SELECT * FROM funds_received
            WHERE installment_id = %s
        """, (installment_id,))
        
        funds = cur.fetchall()
        fund_allocations = []
        
        for fund in funds:
            fund_data = {
                'fund_id': fund['fund_id'],
                'head': fund['head'],
                'amount': float(fund['amount']),
                'date_received': fund['date_received'].isoformat(),
                'remarks': fund['remarks'],
                'has_breakdown': False,
                'breakdown_count': 0,
                'breakdown': []
            }
            
            # Get breakdown
            if fund['head'] == 'manpower':
                cur.execute("""
                    SELECT * FROM manpower_funds_breakdown
                    WHERE fund_id = %s
                """, (fund['fund_id'],))
                breakdown = cur.fetchall()
                if breakdown:
                    fund_data['has_breakdown'] = True
                    fund_data['breakdown_count'] = len(breakdown)
                    fund_data['breakdown'] = [
                        {
                            'role': b['role'],
                            'salary_per_month': float(b['salary_per_month']),
                            'months': b['months'],
                            'num_personnel': b['num_personnel'],
                            'total_amount': float(b['total_amount'])
                        }
                        for b in breakdown
                    ]
            
            elif fund['head'] == 'equipment':
                cur.execute("""
                    SELECT * FROM equipment_funds_breakdown
                    WHERE fund_id = %s
                """, (fund['fund_id'],))
                breakdown = cur.fetchall()
                if breakdown:
                    fund_data['has_breakdown'] = True
                    fund_data['breakdown_count'] = len(breakdown)
                    fund_data['breakdown'] = [
                        {
                            'item_name': b['item_name'],
                            'quantity': b['quantity'],
                            'unit_cost': float(b['unit_cost']),
                            'total_amount': float(b['total_amount'])
                        }
                        for b in breakdown
                    ]
            
            fund_allocations.append(fund_data)
        
        result = dict(installment)
        result['installment_id'] = installment['installment_id']
        result['project_id'] = installment['project_id']
        result['installment_number'] = installment['installment_number']
        result['sanction_number'] = installment['sanction_number']
        result['sanction_date'] = installment['sanction_date'].isoformat()
        result['total_amount'] = float(installment['total_amount'])
        result['date_received'] = installment['date_received'].isoformat()
        result['remarks'] = installment['remarks']
        result['created_at'] = installment['created_at'].isoformat() if installment.get('created_at') else None
        result['updated_at'] = installment['updated_at'].isoformat() if installment.get('updated_at') else None
        result['funds_count'] = len(funds)
        result['fund_allocations'] = fund_allocations
        
        return result

# ==================== ROUTES ====================

@router.get("/{installment_id}")
async def get_installment(installment_id: int, current_user: dict = get_current_user):
    """Get installment by ID with fund allocations"""
    conn = get_db_connection()
    try:
        installment = get_installment_with_funds(conn, installment_id)
        if not installment:
            raise HTTPException(status_code=404, detail="Installment not found")
        return json.loads(json.dumps(installment, cls=DecimalEncoder))
    finally:
        conn.close()

@router.post("/project/{project_id}/bulk", status_code=201)
async def create_installment_with_funds(
    project_id: int,
    data: InstallmentWithFunds,
    current_user: dict = get_current_user
):
    """Create installment with all fund allocations in one transaction"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Create installment
            cur.execute("""
                INSERT INTO project_installments 
                (project_id, installment_number, sanction_number, sanction_date, 
                 total_amount, date_received, remarks)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING installment_id
            """, (
                project_id,
                data.installment.installment_number,
                data.installment.sanction_number,
                data.installment.sanction_date,
                Decimal(str(data.installment.total_amount)),
                data.installment.date_received,
                data.installment.remarks
            ))
            
            installment_id = cur.fetchone()['installment_id']
            
            # Create fund allocations
            funds = []
            for fund_allocation in data.fund_allocations:
                cur.execute("""
                    INSERT INTO funds_received 
                    (project_id, installment_id, head, amount, date_received, remarks)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING fund_id
                """, (
                    project_id,
                    installment_id,
                    fund_allocation.head,
                    Decimal(str(fund_allocation.amount)),
                    data.installment.date_received,
                    ""
                ))
                
                fund_id = cur.fetchone()['fund_id']
                fund_info = {'fund_id': fund_id, 'head': fund_allocation.head, 'breakdown_ids': []}
                
                # Create breakdown
                if fund_allocation.head == 'manpower' and fund_allocation.breakdown:
                    for item in fund_allocation.breakdown:
                        cur.execute("""
                            INSERT INTO manpower_funds_breakdown
                            (fund_id, project_id, role, salary_per_month, months, num_personnel)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            RETURNING breakdown_id
                        """, (
                            fund_id, project_id, item['role'],
                            Decimal(str(item['salary_per_month'])),
                            item['months'], item['num_personnel']
                        ))
                        fund_info['breakdown_ids'].append(cur.fetchone()['breakdown_id'])
                
                elif fund_allocation.head == 'equipment' and fund_allocation.breakdown:
                    for item in fund_allocation.breakdown:
                        cur.execute("""
                            INSERT INTO equipment_funds_breakdown
                            (fund_id, project_id, item_name, quantity, unit_cost)
                            VALUES (%s, %s, %s, %s, %s)
                            RETURNING breakdown_id
                        """, (
                            fund_id, project_id, item['item_name'],
                            item['quantity'], Decimal(str(item['unit_cost']))
                        ))
                        fund_info['breakdown_ids'].append(cur.fetchone()['breakdown_id'])
                
                funds.append(fund_info)
            
            conn.commit()
            
            return {
                'installment_id': installment_id,
                'installment': get_installment_with_funds(conn, installment_id),
                'funds': funds,
                'warnings': []
            }
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{installment_id}", status_code=204)
async def delete_installment(installment_id: int, current_user: dict = get_current_user):
    """Delete an installment (cascades to all funds and breakdowns)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM project_installments WHERE installment_id = %s", (installment_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Installment not found")
            
            cur.execute("DELETE FROM project_installments WHERE installment_id = %s", (installment_id,))
            conn.commit()
            return None
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/project/{project_id}/stats")
async def get_installment_stats(project_id: int, current_user: dict = get_current_user):
    """Get installment statistics for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT COUNT(*) as total_installments,
                       COALESCE(SUM(total_amount), 0) as total_amount_received
                FROM project_installments
                WHERE project_id = %s
            """, (project_id,))
            stats = dict(cur.fetchone())
            
            # Get by head
            cur.execute("""
                SELECT head, 
                       COALESCE(SUM(amount), 0) as total_funded,
                       COUNT(*) as fund_count
                FROM funds_received
                WHERE project_id = %s
                GROUP BY head
            """, (project_id,))
            
            stats['by_head'] = [dict(row) for row in cur.fetchall()]
            return json.loads(json.dumps(stats, cls=DecimalEncoder))
    finally:
        conn.close()