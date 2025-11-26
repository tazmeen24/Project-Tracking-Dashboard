# app/routes/reports.py
from fastapi import APIRouter, HTTPException, Query
from psycopg2.extras import RealDictCursor
from typing import Optional
from datetime import datetime
import json

from ..database import get_db_connection
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/financial-overview")
async def get_financial_overview(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Get financial overview with pagination"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            offset = (page - 1) * limit
            
            # total count
            cur.execute("SELECT COUNT(*) as total FROM projects")
            total_count = cur.fetchone()['total']
            
            # financial summary
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    tg.name AS technical_group,
                    fa.name AS agency_name,
                    
                    COALESCE(SUM(phs.planned_allocation), 0) AS total_allocation,
                    COALESCE(SUM(phs.funds_received), 0) AS total_funds_received,
                    COALESCE(SUM(phs.actual_expenditure), 0) AS total_expenditure,
                    
                    COALESCE(SUM(phs.planned_allocation), 0) - COALESCE(SUM(phs.actual_expenditure), 0) AS budget_balance,
                    COALESCE(SUM(phs.funds_received), 0) - COALESCE(SUM(phs.actual_expenditure), 0) AS funding_balance,
                    
                    CASE 
                        WHEN COALESCE(SUM(phs.planned_allocation), 0) > 0 
                        THEN ROUND((SUM(phs.actual_expenditure) / SUM(phs.planned_allocation)) * 100, 2)
                        ELSE 0
                    END AS budget_utilization_percent,
                    
                    CASE 
                        WHEN COALESCE(SUM(phs.funds_received), 0) > 0 
                        THEN ROUND((SUM(phs.actual_expenditure) / SUM(phs.funds_received)) * 100, 2)
                        ELSE 0
                    END AS funds_utilization_percent
                    
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN project_head_summary phs ON p.project_id = phs.project_id
                GROUP BY p.project_id, p.project_no, p.title, tg.name, fa.name
                ORDER BY p.project_no
                LIMIT %s OFFSET %s
            """, (limit, offset))
            
            results = cur.fetchall()
            return {
                "data": [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/budget-breakdown-comparison")
async def get_budget_breakdown_comparison(
    project_id: int = Query(..., description="Project ID"),
    as_of_date: Optional[str] = Query(None, description="Cumulative as of date in YYYY-MM-DD format"),
    start_date: Optional[str] = Query(None, description="Start date for range filter in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date for range filter in YYYY-MM-DD format")
):
    """Budget breakdown comparison with date filters"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Determine filter mode
            if start_date and end_date:
                # Date range mode
                date_condition_fr = "fr.date_received BETWEEN %s AND %s"
                date_condition_be = "be.date_incurred BETWEEN %s AND %s"
                date_condition_m = "m.date_incurred BETWEEN %s AND %s"
                date_condition_e = "e.purchase_date BETWEEN %s AND %s"
                date_params = [start_date, end_date] * 4
                filter_label = f"between {start_date} and {end_date}"
            else:
                # As of date mode
                filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
                date_condition_fr = "fr.date_received <= %s"
                date_condition_be = "be.date_incurred <= %s"
                date_condition_m = "m.date_incurred <= %s"
                date_condition_e = "e.purchase_date <= %s"
                date_params = [filter_date] * 4
                filter_label = f"as of {filter_date}"
            
            cur.execute(f"""
                SELECT 
                    ba.head,
                    COALESCE(ba.allocated_amount, 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_fr} THEN fr.amount 
                        ELSE 0 
                    END), 0) as funds_received,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_be} THEN be.amount 
                        ELSE 0 
                    END), 0) as expenditure_general,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_m} THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) as expenditure_manpower,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_e} THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as expenditure_equipment
                FROM budget_allocation ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
                LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
                LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
                LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
                WHERE ba.project_id = %s
                GROUP BY ba.head, ba.allocated_amount
                ORDER BY ba.head
            """, (*date_params, project_id))
            
            results = cur.fetchall()
            
            processed_results = []
            for row in results:
                total_expenditure = (
                    float(row['expenditure_general']) +
                    float(row['expenditure_manpower']) +
                    float(row['expenditure_equipment'])
                )
                processed_results.append({
                    'head': row['head'],
                    'approved_budget': float(row['approved_budget']),
                    'funds_received': float(row['funds_received']),
                    'total_expenditure': total_expenditure,
                    'unspent_balance': float(row['funds_received']) - total_expenditure
                })
            
            return {
                'filter_type': 'range' if start_date and end_date else 'as_of',
                'filter_label': filter_label,
                'data': processed_results
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/all-projects-budget-summary")
async def get_all_projects_budget_breakdown(
    as_of_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """All projects budget summary"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
            
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    COALESCE(SUM(ba.allocated_amount), 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN fr.date_received <= %s THEN fr.amount 
                        ELSE 0 
                    END), 0) as total_funds_received,
                    COALESCE(SUM(CASE 
                        WHEN be.date_incurred <= %s THEN be.amount 
                        ELSE 0 
                    END), 0) +
                    COALESCE(SUM(CASE 
                        WHEN m.date_incurred <= %s THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) +
                    COALESCE(SUM(CASE 
                        WHEN e.purchase_date <= %s THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as total_expenditure
                FROM projects p
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN budget_expenditure be ON p.project_id = be.project_id
                LEFT JOIN manpower m ON p.project_id = m.project_id
                LEFT JOIN equipment e ON p.project_id = e.project_id
                GROUP BY p.project_id, p.project_no, p.title
                ORDER BY p.project_no
            """, (filter_date, filter_date, filter_date, filter_date))
            
            results = cur.fetchall()
            processed_results = []
            for row in results:
                processed_results.append({
                    'project_id': row['project_id'],
                    'project_no': row['project_no'],
                    'title': row['title'],
                    'approved_budget': float(row['approved_budget']),
                    'total_funds_received': float(row['total_funds_received']),
                    'total_expenditure': float(row['total_expenditure']),
                    'unspent_balance': float(row['total_funds_received']) - float(row['total_expenditure'])
                })
            
            return {
                'as_of_date': filter_date,
                'data': processed_results
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/by-technical-group")
async def get_budget_breakdown_by_technical_group(
    as_of_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """Budget breakdown by technical group"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
            
            cur.execute("""
                SELECT 
                    tg.name as technical_group,
                    ba.head,
                    COALESCE(SUM(ba.allocated_amount), 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN fr.date_received <= %s THEN fr.amount 
                        ELSE 0 
                    END), 0) as funds_received,
                    COALESCE(SUM(CASE 
                        WHEN be.date_incurred <= %s THEN be.amount 
                        ELSE 0 
                    END), 0) as expenditure_general,
                    COALESCE(SUM(CASE 
                        WHEN m.date_incurred <= %s THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) as expenditure_manpower,
                    COALESCE(SUM(CASE 
                        WHEN e.purchase_date <= %s THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as expenditure_equipment
                FROM technical_groups tg
                LEFT JOIN projects p ON tg.group_id = p.technical_group_id
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
                LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
                LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
                LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
                GROUP BY tg.name, ba.head
                HAVING SUM(ba.allocated_amount) > 0
                ORDER BY tg.name, ba.head
            """, (filter_date, filter_date, filter_date, filter_date))
            
            results = cur.fetchall()
            
            # Group by technical group
            grouped_data = {}
            for row in results:
                group = row['technical_group']
                if group not in grouped_data:
                    grouped_data[group] = []
                
                total_expenditure = (
                    float(row['expenditure_general']) +
                    float(row['expenditure_manpower']) +
                    float(row['expenditure_equipment'])
                )
                
                grouped_data[group].append({
                    'head': row['head'],
                    'approved_budget': float(row['approved_budget']),
                    'funds_received': float(row['funds_received']),
                    'total_expenditure': total_expenditure,
                    'budget_balance': float(row['approved_budget']) - total_expenditure,
                    'funds_balance': float(row['funds_received']) - total_expenditure
                })
            
            return {
                'as_of_date': filter_date,
                'data': grouped_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/by-funding-agency")
async def get_budget_breakdown_by_funding_agency(
    as_of_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """Budget breakdown by funding agency"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
            
            cur.execute("""
                SELECT 
                    fa.name as funding_agency,
                    ba.head,
                    COALESCE(SUM(ba.allocated_amount), 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN fr.date_received <= %s THEN fr.amount 
                        ELSE 0 
                    END), 0) as funds_received,
                    COALESCE(SUM(CASE 
                        WHEN be.date_incurred <= %s THEN be.amount 
                        ELSE 0 
                    END), 0) as expenditure_general,
                    COALESCE(SUM(CASE 
                        WHEN m.date_incurred <= %s THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) as expenditure_manpower,
                    COALESCE(SUM(CASE 
                        WHEN e.purchase_date <= %s THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as expenditure_equipment
                FROM funding_agencies fa
                LEFT JOIN projects p ON fa.agency_id = p.funding_agency_id
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
                LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
                LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
                LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
                GROUP BY fa.name, ba.head
                HAVING SUM(ba.allocated_amount) > 0
                ORDER BY fa.name, ba.head
            """, (filter_date, filter_date, filter_date, filter_date))
            
            results = cur.fetchall()
            
            # Group by funding agency
            grouped_data = {}
            for row in results:
                agency = row['funding_agency']
                if agency not in grouped_data:
                    grouped_data[agency] = []
                
                total_expenditure = (
                    float(row['expenditure_general']) +
                    float(row['expenditure_manpower']) +
                    float(row['expenditure_equipment'])
                )
                
                grouped_data[agency].append({
                    'head': row['head'],
                    'approved_budget': float(row['approved_budget']),
                    'funds_received': float(row['funds_received']),
                    'total_expenditure': total_expenditure,
                    'budget_balance': float(row['approved_budget']) - total_expenditure,
                    'funds_balance': float(row['funds_received']) - total_expenditure
                })
            
            return {
                'as_of_date': filter_date,
                'data': grouped_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()