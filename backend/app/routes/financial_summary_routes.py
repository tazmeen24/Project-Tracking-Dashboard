"""
Financial Summary Routes
API endpoints for financial summary
Place in: backend/app/routes/financial_summary.py
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.models.financial_summary import (
    FinancialSummaryResponse,
    GrandTotals,
    FilterInfo,
    PaginationInfo
)
from app.services.financial_summary_service import FinancialSummaryService
from app.database import get_db_connection  # Adjust import based on your database.py location

router = APIRouter(prefix="/api/financial-summary", tags=["Financial Summary"])


@router.get("", response_model=FinancialSummaryResponse)
async def get_financial_summary(
    db: Session = Depends(get_db_connection),
    view_mode: str = Query(
        "by_project",
        description="View mode: by_project, by_budget_head, by_technical_group, by_funding_agency"
    ),
    date_filter_mode: str = Query(
        "current",
        description="Date filter: current, as_of_date, date_range, financial_year, monthly, quarterly"
    ),
    as_of_date: Optional[date] = Query(
        None,
        description="As of date for as_of_date mode"
    ),
    start_date: Optional[date] = Query(
        None,
        description="Start date for date_range mode"
    ),
    end_date: Optional[date] = Query(
        None,
        description="End date for date_range mode"
    ),
    financial_year: Optional[int] = Query(
        None,
        description="Financial year (e.g., 2024 for FY 2024-25)"
    ),
    year: Optional[int] = Query(
        None,
        description="Year for monthly/quarterly mode"
    ),
    month: Optional[int] = Query(
        None,
        ge=1,
        le=12,
        description="Month (1-12) for monthly mode"
    ),
    quarter: Optional[int] = Query(
        None,
        ge=1,
        le=4,
        description="Quarter (1-4) for quarterly mode"
    ),
    project_id: Optional[int] = Query(
        None,
        description="Filter by specific project"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Get comprehensive financial summary with multiple view modes and date filtering
    
    **View Modes:**
    - `by_project`: Projects with budget head breakdown (expandable rows)
    - `by_budget_head`: Aggregated by budget head across all projects
    - `by_technical_group`: Grouped by technical group
    - `by_funding_agency`: Grouped by funding agency
    
    **Date Filter Modes:**
    - `current`: All-time data (no filtering)
    - `as_of_date`: Cumulative up to specific date
    - `date_range`: During specific period (start to end)
    - `financial_year`: Indian FY (April-March)
    - `monthly`: Specific month
    - `quarterly`: Specific quarter
    
    **Always returns 2 types of balance:**
    - Budget Balance = Approved Budget - Expenditure
    - Funds Balance = Funds Received - Expenditure
    """
    
    try:
        service = FinancialSummaryService()
        
        # Determine date filter function and parameters
        date_filter_func = None
        date_params = {}
        
        if date_filter_mode == "as_of_date":
            if not as_of_date:
                raise HTTPException(
                    status_code=400, 
                    detail="as_of_date required for as_of_date mode"
                )
            date_filter_func = "get_project_financial_summary_as_of_date"
            date_params = {"as_of_date": as_of_date}
            
        elif date_filter_mode == "date_range":
            if not start_date or not end_date:
                raise HTTPException(
                    status_code=400,
                    detail="start_date and end_date required for date_range mode"
                )
            date_filter_func = "get_financial_summary_date_range"
            date_params = {"start_date": start_date, "end_date": end_date}
            
        elif date_filter_mode == "financial_year":
            if not financial_year:
                raise HTTPException(
                    status_code=400,
                    detail="financial_year required for financial_year mode"
                )
            date_filter_func = "get_financial_summary_financial_year"
            date_params = {"fy_year": financial_year}
            
        elif date_filter_mode == "monthly":
            if not year or not month:
                raise HTTPException(
                    status_code=400,
                    detail="year and month required for monthly mode"
                )
            date_filter_func = "get_financial_summary_monthly"
            date_params = {"target_year": year, "target_month": month}
            
        elif date_filter_mode == "quarterly":
            if not year or not quarter:
                raise HTTPException(
                    status_code=400,
                    detail="year and quarter required for quarterly mode"
                )
            date_filter_func = "get_financial_summary_quarter"
            date_params = {"target_year": year, "quarter": quarter}
        
        # current mode: date_filter_func remains None
        
        # Get data based on view mode
        if view_mode == "by_project":
            data = service.get_by_project(db, date_filter_func, date_params, project_id)
        elif view_mode == "by_budget_head":
            data = service.get_by_budget_head(db, date_filter_func, date_params, project_id)
        elif view_mode == "by_technical_group":
            data = service.get_by_technical_group(db, date_filter_func, date_params, project_id)
        elif view_mode == "by_funding_agency":
            data = service.get_by_funding_agency(db, date_filter_func, date_params, project_id)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid view_mode: {view_mode}"
            )
        
        # Get grand totals
        grand_totals = service.get_grand_totals(db, date_filter_func, date_params, project_id)
        
        # Pagination
        total_items = len(data)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_data = data[start_idx:end_idx]
        
        # Build response
        return FinancialSummaryResponse(
            view_mode=view_mode,
            filters=FilterInfo(
                date_filter_mode=date_filter_mode,
                as_of_date=as_of_date,
                start_date=start_date,
                end_date=end_date,
                financial_year=financial_year,
                year=year,
                month=month,
                quarter=quarter,
                project_id=project_id
            ),
            summary=GrandTotals(**grand_totals),
            data=paginated_data,
            pagination=PaginationInfo(
                page=page,
                per_page=per_page,
                total_items=total_items,
                total_pages=(total_items + per_page - 1) // per_page
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating financial summary: {str(e)}"
        )


@router.get("/export")
async def export_financial_summary(
    db: Session = Depends(get_db_connection),
    view_mode: str = Query("by_project"),
    date_filter_mode: str = Query("current"),
    as_of_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    financial_year: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    project_id: Optional[int] = None
):
    """
    Export financial summary to Excel
    
    Uses same parameters as main endpoint
    Returns Excel file with conditional formatting
    """
    # TODO: Implement Excel export using openpyxl
    # This will be similar to the export functionality in financial_summary_export.py
    raise HTTPException(status_code=501, detail="Excel export not yet implemented")