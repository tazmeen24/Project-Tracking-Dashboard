"""
Financial Summary Routes
Matches existing project structure with psycopg2 direct connections
Place in: backend/app/routes/financial_summary.py
"""

from fastapi import APIRouter, HTTPException, Query, status
from datetime import date
from typing import Optional, List, Dict, Any
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/api/financial-summary", tags=["Financial Summary"])


@router.get("")
async def get_financial_summary(
    view_mode: str = Query("by_project", description="View mode"),
    date_filter_mode: str = Query("current", description="Date filter mode"),
    as_of_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    financial_year: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    project_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """
    Get comprehensive financial summary with multiple view modes and date filtering
    """
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Determine which query to use based on view_mode and date_filter_mode
        if view_mode == "by_project":
            data = _get_by_project(cursor, date_filter_mode, as_of_date, start_date, end_date, 
                                  financial_year, year, month, quarter, project_id)
        elif view_mode == "by_budget_head":
            data = _get_by_budget_head(cursor, date_filter_mode, as_of_date, start_date, end_date,
                                      financial_year, year, month, quarter, project_id)
        elif view_mode == "by_technical_group":
            data = _get_by_technical_group(cursor, date_filter_mode, as_of_date, start_date, end_date,
                                          financial_year, year, month, quarter, project_id)
        elif view_mode == "by_funding_agency":
            data = _get_by_funding_agency(cursor, date_filter_mode, as_of_date, start_date, end_date,
                                         financial_year, year, month, quarter, project_id)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid view_mode: {view_mode}")
        
        # Get grand totals
        grand_totals = _get_grand_totals(cursor, date_filter_mode, as_of_date, start_date, end_date,
                                        financial_year, year, month, quarter, project_id)
        
        # Pagination
        total_items = len(data)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_data = data[start_idx:end_idx]
        
        response = {
            "view_mode": view_mode,
            "filters": {
                "date_filter_mode": date_filter_mode,
                "as_of_date": as_of_date.isoformat() if as_of_date else None,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "financial_year": financial_year,
                "year": year,
                "month": month,
                "quarter": quarter,
                "project_id": project_id
            },
            "summary": grand_totals,
            "data": paginated_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": (total_items + per_page - 1) // per_page
            }
        }
        
        cursor.close()
        return json.loads(json.dumps(response, cls=DecimalEncoder))
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating financial summary: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/test")
async def test_connection():
    """Test endpoint to verify database connection and views"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Test 1: Database connection
        cursor.execute("SELECT 1 as test")
        db_ok = cursor.fetchone()['test'] == 1
        
        # Test 2: View exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.views 
                WHERE table_name = 'vw_financial_summary_by_project'
            ) as exists
        """)
        view_exists = cursor.fetchone()['exists']
        
        # Test 3: View has data
        cursor.execute("SELECT COUNT(*) as count FROM vw_financial_summary_by_project")
        row_count = cursor.fetchone()['count']
        
        cursor.close()
        
        return {
            "status": "ok",
            "database_connected": db_ok,
            "view_exists": view_exists,
            "row_count": row_count,
            "message": "All checks passed!" if (db_ok and view_exists and row_count > 0) else "Issues found"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Check backend logs for details"
        }
    finally:
        conn.close()


# ============================================================================
# Helper Functions
# ============================================================================

def _get_by_project(cursor, date_filter_mode, as_of_date, start_date, end_date,
                   financial_year, year, month, quarter, project_id):
    """Get financial summary by project"""
    
    if date_filter_mode == "current":
        # Use view for current data
        query = """
            SELECT * FROM vw_financial_summary_by_project
            WHERE (%s IS NULL OR project_id = %s)
            ORDER BY project_no, budget_head
        """
        cursor.execute(query, (project_id, project_id))
    else:
        # Use appropriate function based on date filter mode
        query, params = _build_date_filtered_query(
            "get_project_financial_summary_as_of_date",
            date_filter_mode, as_of_date, start_date, end_date,
            financial_year, year, month, quarter, project_id
        )
        cursor.execute(query, params)
    
    rows = cursor.fetchall()
    
    # Group by project
    projects_dict = {}
    for row in rows:
        pid = row['project_id']
        if pid not in projects_dict:
            projects_dict[pid] = {
                "project_id": row['project_id'],
                "project_no": row['project_no'],
                "title": row['title'],
                "technical_group": row['technical_group'],
                "funding_agency": row['funding_agency'],
                "approved_budget": 0,
                "funds_received": 0,
                "expenditure": 0,
                "budget_balance": 0,
                "funds_balance": 0,
                "budget_heads": []
            }
        
        # Add budget head detail
        projects_dict[pid]["budget_heads"].append({
            "name": row['budget_head'],
            "approved_budget": float(row['approved_budget']),
            "funds_received": float(row['funds_received']),
            "expenditure": float(row['expenditure']),
            "budget_balance": float(row['budget_balance']),
            "funds_balance": float(row['funds_balance']),
            "utilization_percentage": float(row['utilization_percentage'])
        })
        
        # Accumulate totals
        projects_dict[pid]["approved_budget"] += float(row['approved_budget'])
        projects_dict[pid]["funds_received"] += float(row['funds_received'])
        projects_dict[pid]["expenditure"] += float(row['expenditure'])
        projects_dict[pid]["budget_balance"] += float(row['budget_balance'])
        projects_dict[pid]["funds_balance"] += float(row['funds_balance'])
    
    # Calculate utilization
    for project in projects_dict.values():
        if project["approved_budget"] > 0:
            project["utilization_percentage"] = (project["expenditure"] / project["approved_budget"]) * 100
        else:
            project["utilization_percentage"] = 0.0
    
    return list(projects_dict.values())


def _get_by_budget_head(cursor, date_filter_mode, as_of_date, start_date, end_date,
                       financial_year, year, month, quarter, project_id):
    """Get financial summary by budget head"""
    
    if date_filter_mode == "current":
        query = """
            SELECT * FROM vw_financial_summary_by_budget_head
            ORDER BY budget_head
        """
        cursor.execute(query)
    else:
        # Aggregate from date-filtered data
        query, params = _build_date_filtered_query(
            "get_project_financial_summary_as_of_date",
            date_filter_mode, as_of_date, start_date, end_date,
            financial_year, year, month, quarter, project_id
        )
        
        agg_query = f"""
            WITH filtered_data AS ({query})
            SELECT 
                budget_head,
                COUNT(DISTINCT project_id) as project_count,
                SUM(approved_budget) as total_approved,
                SUM(funds_received) as total_funds_received,
                SUM(expenditure) as total_expenditure,
                SUM(budget_balance) as budget_balance,
                SUM(funds_balance) as funds_balance,
                CASE 
                    WHEN SUM(approved_budget) > 0 
                    THEN (SUM(expenditure) / SUM(approved_budget) * 100)
                    ELSE 0 
                END as utilization_percentage
            FROM filtered_data
            GROUP BY budget_head
            ORDER BY budget_head
        """
        cursor.execute(agg_query, params)
    
    return [dict(row) for row in cursor.fetchall()]


def _get_by_technical_group(cursor, date_filter_mode, as_of_date, start_date, end_date,
                           financial_year, year, month, quarter, project_id):
    """Get financial summary by technical group"""
    
    if date_filter_mode == "current":
        query = """
            SELECT * FROM vw_financial_summary_by_technical_group
            ORDER BY group_name
        """
        cursor.execute(query)
    else:
        query, params = _build_date_filtered_query(
            "get_project_financial_summary_as_of_date",
            date_filter_mode, as_of_date, start_date, end_date,
            financial_year, year, month, quarter, project_id
        )
        
        agg_query = f"""
            WITH filtered_data AS ({query}),
            project_totals AS (
                SELECT 
                    project_id,
                    technical_group,
                    SUM(approved_budget) as total_approved_budget,
                    SUM(funds_received) as total_funds_received,
                    SUM(expenditure) as total_expenditure,
                    SUM(budget_balance) as total_budget_balance,
                    SUM(funds_balance) as total_funds_balance
                FROM filtered_data
                GROUP BY project_id, technical_group
            )
            SELECT 
                COALESCE(technical_group, 'Unassigned') as group_name,
                COUNT(DISTINCT project_id) as project_count,
                SUM(total_approved_budget) as total_approved,
                SUM(total_funds_received) as total_funds_received,
                SUM(total_expenditure) as total_expenditure,
                SUM(total_budget_balance) as budget_balance,
                SUM(total_funds_balance) as funds_balance,
                CASE 
                    WHEN SUM(total_approved_budget) > 0 
                    THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
                    ELSE 0 
                END as utilization_percentage
            FROM project_totals
            GROUP BY technical_group
            ORDER BY group_name
        """
        cursor.execute(agg_query, params)
    
    return [dict(row) for row in cursor.fetchall()]


def _get_by_funding_agency(cursor, date_filter_mode, as_of_date, start_date, end_date,
                          financial_year, year, month, quarter, project_id):
    """Get financial summary by funding agency"""
    
    if date_filter_mode == "current":
        query = """
            SELECT * FROM vw_financial_summary_by_funding_agency
            ORDER BY agency_name
        """
        cursor.execute(query)
    else:
        query, params = _build_date_filtered_query(
            "get_project_financial_summary_as_of_date",
            date_filter_mode, as_of_date, start_date, end_date,
            financial_year, year, month, quarter, project_id
        )
        
        agg_query = f"""
            WITH filtered_data AS ({query}),
            project_totals AS (
                SELECT 
                    project_id,
                    funding_agency,
                    SUM(approved_budget) as total_approved_budget,
                    SUM(funds_received) as total_funds_received,
                    SUM(expenditure) as total_expenditure,
                    SUM(budget_balance) as total_budget_balance,
                    SUM(funds_balance) as total_funds_balance
                FROM filtered_data
                GROUP BY project_id, funding_agency
            )
            SELECT 
                COALESCE(funding_agency, 'Unassigned') as agency_name,
                COUNT(DISTINCT project_id) as project_count,
                SUM(total_approved_budget) as total_approved,
                SUM(total_funds_received) as total_funds_received,
                SUM(total_expenditure) as total_expenditure,
                SUM(total_budget_balance) as budget_balance,
                SUM(total_funds_balance) as funds_balance,
                CASE 
                    WHEN SUM(total_approved_budget) > 0 
                    THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
                    ELSE 0 
                END as utilization_percentage
            FROM project_totals
            GROUP BY funding_agency
            ORDER BY agency_name
        """
        cursor.execute(agg_query, params)
    
    return [dict(row) for row in cursor.fetchall()]


def _get_grand_totals(cursor, date_filter_mode, as_of_date, start_date, end_date,
                     financial_year, year, month, quarter, project_id):
    """Get system-wide grand totals"""
    
    if date_filter_mode == "current":
        query = """
            SELECT * FROM vw_financial_summary_grand_totals
        """
        cursor.execute(query)
    else:
        query, params = _build_date_filtered_query(
            "get_project_financial_summary_as_of_date",
            date_filter_mode, as_of_date, start_date, end_date,
            financial_year, year, month, quarter, project_id
        )
        
        totals_query = f"""
            WITH filtered_data AS ({query}),
            project_totals AS (
                SELECT 
                    project_id,
                    SUM(approved_budget) as total_approved_budget,
                    SUM(funds_received) as total_funds_received,
                    SUM(expenditure) as total_expenditure,
                    SUM(budget_balance) as total_budget_balance,
                    SUM(funds_balance) as total_funds_balance
                FROM filtered_data
                GROUP BY project_id
            )
            SELECT 
                COUNT(DISTINCT project_id) as total_projects,
                SUM(total_approved_budget) as total_approved_budget,
                SUM(total_funds_received) as total_funds_received,
                SUM(total_expenditure) as total_expenditure,
                SUM(total_budget_balance) as budget_balance,
                SUM(total_funds_balance) as funds_balance,
                CASE 
                    WHEN SUM(total_approved_budget) > 0 
                    THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
                    ELSE 0 
                END as overall_utilization
            FROM project_totals
        """
        cursor.execute(totals_query, params)
    
    row = cursor.fetchone()
    if row:
        return dict(row)
    else:
        return {
            "total_projects": 0,
            "total_approved_budget": 0,
            "total_funds_received": 0,
            "total_expenditure": 0,
            "budget_balance": 0,
            "funds_balance": 0,
            "overall_utilization": 0
        }


def _build_date_filtered_query(base_func, date_filter_mode, as_of_date, start_date, end_date,
                               financial_year, year, month, quarter, project_id):
    """Build SQL query and parameters based on date filter mode"""
    
    if date_filter_mode == "as_of_date":
        if not as_of_date:
            raise HTTPException(status_code=400, detail="as_of_date required")
        query = f"SELECT * FROM {base_func}(%s) WHERE (%s IS NULL OR project_id = %s)"
        params = (as_of_date, project_id, project_id)
        
    elif date_filter_mode == "date_range":
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="start_date and end_date required")
        query = "SELECT * FROM get_financial_summary_date_range(%s, %s) WHERE (%s IS NULL OR project_id = %s)"
        params = (start_date, end_date, project_id, project_id)
        
    elif date_filter_mode == "financial_year":
        if not financial_year:
            raise HTTPException(status_code=400, detail="financial_year required")
        query = "SELECT * FROM get_financial_summary_financial_year(%s) WHERE (%s IS NULL OR project_id = %s)"
        params = (financial_year, project_id, project_id)
        
    elif date_filter_mode == "monthly":
        if not year or not month:
            raise HTTPException(status_code=400, detail="year and month required")
        query = "SELECT * FROM get_financial_summary_monthly(%s, %s) WHERE (%s IS NULL OR project_id = %s)"
        params = (year, month, project_id, project_id)
        
    elif date_filter_mode == "quarterly":
        if not year or not quarter:
            raise HTTPException(status_code=400, detail="year and quarter required")
        query = "SELECT * FROM get_financial_summary_quarter(%s, %s) WHERE (%s IS NULL OR project_id = %s)"
        params = (year, quarter, project_id, project_id)
    else:
        # Default to current
        query = "SELECT * FROM vw_financial_summary_by_project WHERE (%s IS NULL OR project_id = %s)"
        params = (project_id, project_id)
    
    return query, params