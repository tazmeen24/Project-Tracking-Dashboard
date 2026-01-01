# app/financial_queries.py
"""
Financial Summary Functions
Replaces PostgreSQL stored functions for SQLite compatibility
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from dateutil.relativedelta import relativedelta
import sqlite3

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def dict_factory(cursor, row):
    """Convert sqlite3.Row to dict"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def execute_query(conn, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute query and return results as list of dicts"""
    # Save original row_factory
    original_factory = conn.row_factory
    
    # Set dict factory temporarily
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    
    try:
        cursor.execute(query, params)
        results = cursor.fetchall()
        return results
    finally:
        # Restore original row_factory
        conn.row_factory = original_factory

# =============================================================================
# CORE FUNCTION: GET FINANCIAL SUMMARY BY DATE RANGE
# =============================================================================

def get_financial_summary_date_range(
    conn,
    start_date: date,
    end_date: date,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for a specific date range.
    
    Returns funds received and expenditure DURING the period.
    
    Args:
        conn: Database connection
        start_date: Start date of period
        end_date: End date of period
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    """
    
    query = """
    WITH project_budgets AS (
        SELECT 
            p.project_id,
            p.project_no,
            p.title,
            tg.name as technical_group,
            fa.name as funding_agency,
            ba.head,
            COALESCE(ba.allocated_amount, 0) as approved_budget
        FROM projects p
        LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
        LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
        LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
        WHERE (? IS NULL OR p.project_id = ?)
    ),
    funds_by_head AS (
        -- Only funds received DURING the date range
        SELECT 
            fr.project_id,
            fr.head,
            SUM(fr.amount) as funds_received
        FROM funds_received fr
        WHERE fr.date_received BETWEEN ? AND ?
        GROUP BY fr.project_id, fr.head
    ),
    expenditure_by_head AS (
        -- Only expenditure incurred DURING the date range
        SELECT 
            m.project_id,
            'manpower' as head,
            SUM(m.total_cost) as expenditure
        FROM manpower m
        WHERE m.date_incurred BETWEEN ? AND ?
        GROUP BY m.project_id
        
        UNION ALL
        
        SELECT 
            e.project_id,
            'equipment' as head,
            SUM(e.total_cost) as expenditure
        FROM equipment e
        WHERE e.purchase_date BETWEEN ? AND ?
        GROUP BY e.project_id
        
        UNION ALL
        
        SELECT 
            be.project_id,
            be.head,
            SUM(be.amount) as expenditure
        FROM budget_expenditure be
        WHERE be.date_incurred BETWEEN ? AND ?
        GROUP BY be.project_id, be.head
    )
    SELECT 
        pb.project_id,
        pb.project_no,
        pb.title,
        pb.technical_group,
        pb.funding_agency,
        pb.head as budget_head,
        pb.approved_budget,
        COALESCE(fh.funds_received, 0) as funds_received,
        COALESCE(eh.expenditure, 0) as expenditure,
        (pb.approved_budget - COALESCE(eh.expenditure, 0)) as budget_balance,
        (COALESCE(fh.funds_received, 0) - COALESCE(eh.expenditure, 0)) as funds_balance,
        CASE 
            WHEN pb.approved_budget > 0 
            THEN (COALESCE(eh.expenditure, 0) / pb.approved_budget * 100)
            ELSE 0 
        END as utilization_percentage
    FROM project_budgets pb
    LEFT JOIN funds_by_head fh ON pb.project_id = fh.project_id AND pb.head = fh.head
    LEFT JOIN expenditure_by_head eh ON pb.project_id = eh.project_id AND pb.head = eh.head
    ORDER BY pb.project_no, pb.head
    """
    
    params = (
        p_project_id, p_project_id,  # WHERE clause
        start_date, end_date,         # funds_received
        start_date, end_date,         # manpower
        start_date, end_date,         # equipment
        start_date, end_date          # budget_expenditure
    )
    
    return execute_query(conn, query, params)

# =============================================================================
# FUNCTION: GET FINANCIAL SUMMARY BY FINANCIAL YEAR
# =============================================================================

def get_financial_summary_financial_year(
    conn,
    fy_year: int,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for a financial year.
    
    Indian Financial Year: April 1 to March 31
    
    Args:
        conn: Database connection
        fy_year: Financial year (e.g., 2024 for FY 2024-25)
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    
    Example:
        # For FY 2024-25 (April 1, 2024 to March 31, 2025)
        get_financial_summary_financial_year(conn, 2024)
    """
    
    # Indian Financial Year: April 1 to March 31
    fy_start = date(fy_year, 4, 1)
    fy_end = date(fy_year + 1, 3, 31)
    
    return get_financial_summary_date_range(conn, fy_start, fy_end, p_project_id)

# =============================================================================
# FUNCTION: GET FINANCIAL SUMMARY BY MONTH
# =============================================================================

def get_financial_summary_monthly(
    conn,
    target_year: int,
    target_month: int,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for a specific month.
    
    Args:
        conn: Database connection
        target_year: Year (e.g., 2024)
        target_month: Month (1-12)
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    
    Example:
        # For January 2024
        get_financial_summary_monthly(conn, 2024, 1)
    """
    
    # First day of the month
    month_start = date(target_year, target_month, 1)
    
    # Last day of the month
    month_end = month_start + relativedelta(months=1, days=-1)
    
    return get_financial_summary_date_range(conn, month_start, month_end, p_project_id)

# =============================================================================
# FUNCTION: GET FINANCIAL SUMMARY BY QUARTER
# =============================================================================

def get_financial_summary_quarter(
    conn,
    target_year: int,
    quarter: int,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for a specific quarter.
    
    Args:
        conn: Database connection
        target_year: Year (e.g., 2024)
        quarter: Quarter (1-4)
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    
    Example:
        # For Q2 2024 (April-June)
        get_financial_summary_quarter(conn, 2024, 2)
    
    Raises:
        ValueError: If quarter is not 1, 2, 3, or 4
    """
    
    if quarter not in [1, 2, 3, 4]:
        raise ValueError('Quarter must be 1, 2, 3, or 4')
    
    # Calculate quarter dates
    if quarter == 1:
        quarter_start = date(target_year, 1, 1)
        quarter_end = date(target_year, 3, 31)
    elif quarter == 2:
        quarter_start = date(target_year, 4, 1)
        quarter_end = date(target_year, 6, 30)
    elif quarter == 3:
        quarter_start = date(target_year, 7, 1)
        quarter_end = date(target_year, 9, 30)
    else:  # quarter == 4
        quarter_start = date(target_year, 10, 1)
        quarter_end = date(target_year, 12, 31)
    
    return get_financial_summary_date_range(conn, quarter_start, quarter_end, p_project_id)

# =============================================================================
# FUNCTION: GET PROJECT FINANCIAL SUMMARY AS OF DATE
# =============================================================================

def get_project_financial_summary_as_of_date(
    conn,
    as_of_date: date
) -> List[Dict[str, Any]]:
    """
    Get cumulative financial summary as of a specific date.
    
    Returns all funds received and expenditure UP TO the specified date.
    
    Args:
        conn: Database connection
        as_of_date: Date to calculate cumulative totals up to
    
    Returns:
        List of dicts with financial summary data
    
    Example:
        # Get financial summary as of December 31, 2024
        get_project_financial_summary_as_of_date(conn, date(2024, 12, 31))
    """
    
    query = """
    WITH project_budgets AS (
        SELECT 
            p.project_id,
            p.project_no,
            p.title,
            tg.name as technical_group,
            fa.name as funding_agency,
            ba.head,
            ba.allocated_amount as approved_budget
        FROM projects p
        LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
        LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
        INNER JOIN budget_allocation ba ON p.project_id = ba.project_id
    ),
    funds_by_head AS (
        -- All funds received UP TO the as_of_date (cumulative)
        SELECT 
            fr.project_id,
            fr.head,
            SUM(fr.amount) as funds_received
        FROM funds_received fr
        WHERE fr.date_received <= ?
        GROUP BY fr.project_id, fr.head
    ),
    expenditure_by_head AS (
        -- All expenditure incurred UP TO the as_of_date (cumulative)
        SELECT 
            m.project_id,
            'manpower' as head,
            SUM(m.total_cost) as expenditure
        FROM manpower m
        WHERE m.date_incurred <= ? OR m.date_incurred IS NULL
        GROUP BY m.project_id
        
        UNION ALL
        
        SELECT 
            e.project_id,
            'equipment' as head,
            SUM(e.total_cost) as expenditure
        FROM equipment e
        WHERE e.purchase_date <= ? OR e.purchase_date IS NULL
        GROUP BY e.project_id
        
        UNION ALL
        
        SELECT 
            be.project_id,
            be.head,
            SUM(be.amount) as expenditure
        FROM budget_expenditure be
        WHERE be.date_incurred <= ? OR be.date_incurred IS NULL
        GROUP BY be.project_id, be.head
    )
    SELECT 
        pb.project_id,
        pb.project_no,
        pb.title,
        pb.technical_group,
        pb.funding_agency,
        pb.head as budget_head,
        pb.approved_budget,
        COALESCE(fh.funds_received, 0) as funds_received,
        COALESCE(eh.expenditure, 0) as expenditure,
        (pb.approved_budget - COALESCE(eh.expenditure, 0)) as budget_balance,
        (COALESCE(fh.funds_received, 0) - COALESCE(eh.expenditure, 0)) as funds_balance,
        CASE 
            WHEN pb.approved_budget > 0 
            THEN (COALESCE(eh.expenditure, 0) / pb.approved_budget * 100)
            ELSE 0 
        END as utilization_percentage
    FROM project_budgets pb
    LEFT JOIN funds_by_head fh ON pb.project_id = fh.project_id AND pb.head = fh.head
    LEFT JOIN expenditure_by_head eh ON pb.project_id = eh.project_id AND pb.head = eh.head
    ORDER BY pb.project_no, pb.head
    """
    
    params = (as_of_date, as_of_date, as_of_date, as_of_date)
    
    return execute_query(conn, query, params)

# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_current_financial_year() -> int:
    """
    Get the current financial year.
    
    Returns:
        Financial year (e.g., 2024 for FY 2024-25)
    
    Example:
        # If today is December 15, 2024, returns 2024
        # If today is April 15, 2025, returns 2025
    """
    today = date.today()
    if today.month >= 4:
        return today.year
    else:
        return today.year - 1

def get_financial_summary_current_year(
    conn,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for the current financial year.
    
    Args:
        conn: Database connection
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    """
    fy_year = get_current_financial_year()
    return get_financial_summary_financial_year(conn, fy_year, p_project_id)

def get_financial_summary_current_month(
    conn,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for the current month.
    
    Args:
        conn: Database connection
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    """
    today = date.today()
    return get_financial_summary_monthly(conn, today.year, today.month, p_project_id)

def get_financial_summary_current_quarter(
    conn,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get financial summary for the current quarter.
    
    Args:
        conn: Database connection
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    """
    today = date.today()
    quarter = ((today.month - 1) // 3) + 1
    return get_financial_summary_quarter(conn, today.year, quarter, p_project_id)

def get_financial_summary_ytd(
    conn,
    p_project_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get year-to-date financial summary (from start of FY to today).
    
    Args:
        conn: Database connection
        p_project_id: Optional project ID to filter by
    
    Returns:
        List of dicts with financial summary data
    """
    fy_year = get_current_financial_year()
    fy_start = date(fy_year, 4, 1)
    today = date.today()
    
    return get_financial_summary_date_range(conn, fy_start, today, p_project_id)

# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    # Example usage
    import sqlite3
    from pathlib import Path
    
    # Connect to database
    db_path = Path(__file__).parent.parent / "project_tracking.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    try:
        # Example 1: Get financial summary for FY 2024-25
        print("="*70)
        print("Financial Summary for FY 2024-25")
        print("="*70)
        results = get_financial_summary_financial_year(conn, 2024)
        for row in results:
            print(f"{row['project_no']} - {row['budget_head']}: "
                  f"Budget: {row['approved_budget']}, "
                  f"Spent: {row['expenditure']}")
        
        # Example 2: Get financial summary for January 2024
        print("\n" + "="*70)
        print("Financial Summary for January 2024")
        print("="*70)
        results = get_financial_summary_monthly(conn, 2024, 1)
        for row in results:
            print(f"{row['project_no']}: {row['expenditure']}")
        
        # Example 3: Get cumulative summary as of today
        print("\n" + "="*70)
        print("Cumulative Financial Summary (as of today)")
        print("="*70)
        results = get_project_financial_summary_as_of_date(conn, date.today())
        for row in results:
            print(f"{row['project_no']}: {row['utilization_percentage']}% utilized")
        
    finally:
        conn.close()