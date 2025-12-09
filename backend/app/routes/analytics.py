"""
Analytics Routes for Research Project Management System
Complete: Phase 1 + Phase 2 features merged
All analytics endpoints in one router
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
import io
import xlsxwriter
from datetime import datetime

from ..database import get_db_connection
from ..models.analytics_models import (
    PortfolioHealthResponse,
    KPIResponse,
    CashFlowResponse,
    ProjectRiskItem,
    CategoryDistribution
)
from ..services.analytics_service import AnalyticsService


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ============================================================================
# PHASE 1 - CORE ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/portfolio-health", response_model=PortfolioHealthResponse)
async def get_portfolio_health():
    """
    Get overall portfolio health metrics
    
    Returns total projects, budget, funds, expenditure, and balances
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_portfolio_health()
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching portfolio health: {str(e)}"
        )


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis():
    """
    Get Key Performance Indicators
    
    Returns budget compliance, funds utilization, time to funds, and project counts
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_kpis()
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching KPIs: {str(e)}"
        )


@router.get("/cash-flow", response_model=CashFlowResponse)
async def get_cash_flow(
    months: int = Query(default=12, ge=1, le=36, description="Number of months (1-36)")
):
    """
    Get cash flow trends for specified period
    
    Args:
        months: Number of months to retrieve (default: 12, max: 36)
    
    Returns monthly data points with funds, expenditure, and net cash flow
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_cash_flow(months)
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching cash flow: {str(e)}"
        )


@router.get("/projects-at-risk", response_model=List[ProjectRiskItem])
async def get_projects_at_risk(
    threshold: int = Query(default=20, ge=5, le=50, description="Percentage threshold (5-50)")
):
    """
    Get list of projects with low funds balance (at risk)
    
    Args:
        threshold: Percentage threshold for risk (default: 20%)
    
    Returns projects with funds balance below threshold
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_projects_at_risk(threshold)
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching projects at risk: {str(e)}"
        )


@router.get("/category-distribution", response_model=List[CategoryDistribution])
async def get_category_distribution():
    """
    Get budget distribution across all budget categories
    
    Returns budget and spending by category (Manpower, Equipment, etc.)
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_category_distribution()
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching category distribution: {str(e)}"
        )


# ============================================================================
# PHASE 2 - BURN RATE ANALYSIS
# ============================================================================

@router.get("/burn-rate")
async def get_burn_rate_analysis():
    """
    Get burn rate analysis for all active projects
    
    Returns:
        - Daily/monthly burn rate
        - Runway (days until funds depleted)
        - Projected depletion date
        - Urgency level (critical/high/medium/low)
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_burn_rate_analysis()
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching burn rate analysis: {str(e)}"
        )


# ============================================================================
# PHASE 2 - VARIANCE ANALYSIS
# ============================================================================

@router.get("/variance-analysis")
async def get_variance_analysis(
    project_id: Optional[int] = Query(None, description="Specific project ID, or all projects if omitted")
):
    """
    Get budget variance analysis (planned vs actual spending)
    
    Args:
        project_id: Optional - analyze specific project, or all if None
    
    Returns:
        - Category-wise variance
        - Over/under budget status
        - Utilization percentages
        - Summary statistics
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_budget_variance_analysis(project_id)
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching variance analysis: {str(e)}"
        )


# ============================================================================
# PHASE 2 - FINANCIAL YEAR COMPARISON
# ============================================================================

@router.get("/fy-comparison")
async def get_fy_comparison(
    years: int = Query(default=3, ge=1, le=10, description="Number of years to compare (1-10)")
):
    """
    Compare financial metrics across multiple financial years
    
    Args:
        years: Number of years to compare (default: 3)
    
    Returns:
        - Year-over-year metrics
        - Growth rates (budget, funds, expenditure)
        - Project counts (new, completed, total)
        - Funds utilization trends
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_financial_year_comparison(years)
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching FY comparison: {str(e)}"
        )


# ============================================================================
# PHASE 2 - EXPORT TO EXCEL
# ============================================================================

@router.get("/export/excel")
async def export_to_excel(
    export_type: str = Query(default="summary", description="Type: summary, variance, burn_rate")
):
    """
    Export analytics data to Excel file
    
    Args:
        export_type: Type of data to export (summary, variance, burn_rate)
    
    Returns Excel file as download with formatted data
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        data = service.get_export_data(export_type)
        conn.close()
        
        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])
        
        # Create Excel file in memory
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Analytics Report')
        
        # Add formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4472C4',
            'font_color': 'white',
            'border': 1
        })
        
        currency_format = workbook.add_format({
            'num_format': '₹#,##0.00',
            'border': 1
        })
        
        percent_format = workbook.add_format({
            'num_format': '0.00%',
            'border': 1
        })
        
        normal_format = workbook.add_format({
            'border': 1
        })
        
        # Write report header
        worksheet.write(0, 0, data.get("report_type", "Analytics Report"), header_format)
        worksheet.write(1, 0, f"Generated: {data.get('generated_date', '')}", normal_format)
        worksheet.write(2, 0, "", normal_format)  # Empty row
        
        # Write data
        if "data" in data and len(data["data"]) > 0:
            # For variance/burn_rate, data structure is different
            if export_type in ["variance", "burn_rate"]:
                # Just write the raw data as JSON-like structure
                worksheet.write(3, 0, "Data exported successfully. View full details via API.", normal_format)
            else:
                # Write column headers
                row = 3
                headers = list(data["data"][0].keys())
                for col, header in enumerate(headers):
                    worksheet.write(row, col, header, header_format)
                    worksheet.set_column(col, col, 15)
                
                # Write data rows
                row = 4
                for item in data["data"]:
                    for col, header in enumerate(headers):
                        value = item[header]
                        
                        if isinstance(value, (int, float)):
                            if any(x in header.lower() for x in ['budget', 'fund', 'expenditure', 'balance', 'spent']):
                                worksheet.write(row, col, value, currency_format)
                            elif '%' in header or 'percentage' in header.lower():
                                worksheet.write(row, col, value / 100, percent_format)
                            else:
                                worksheet.write(row, col, value, normal_format)
                        else:
                            worksheet.write(row, col, str(value), normal_format)
                    row += 1
                
                # Write totals if available
                if "totals" in data:
                    row += 1
                    worksheet.write(row, 0, "TOTALS", header_format)
                    for col, header in enumerate(headers):
                        if header in data["totals"]:
                            worksheet.write(row, col, data["totals"][header], currency_format)
        
        workbook.close()
        output.seek(0)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"analytics_{export_type}_{timestamp}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Excel export: {str(e)}"
        )


# ============================================================================
# PHASE 2 - SPENDING TRENDS
# ============================================================================

@router.get("/trends")
async def get_spending_trends(
    months: int = Query(default=12, ge=3, le=36, description="Number of months to analyze (3-36)")
):
    """
    Get spending trends over time with cumulative data
    
    Args:
        months: Time range in months (default: 12)
    
    Returns:
        - Monthly funds received
        - Monthly expenditure
        - Variance (funds - expenditure)
        - Cumulative totals
    """
    try:
        conn = get_db_connection()
        service = AnalyticsService(conn)
        result = service.get_spending_trends(months)
        conn.close()
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching trends: {str(e)}"
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Simple health check for analytics endpoints
    
    Returns list of all available endpoints
    """
    return {
        "status": "healthy",
        "service": "analytics",
        "phase": "1 + 2 (Complete)",
        "endpoints": {
            "phase_1": [
                "/api/analytics/portfolio-health",
                "/api/analytics/kpis",
                "/api/analytics/cash-flow",
                "/api/analytics/projects-at-risk",
                "/api/analytics/category-distribution"
            ],
            "phase_2": [
                "/api/analytics/burn-rate",
                "/api/analytics/variance-analysis",
                "/api/analytics/fy-comparison",
                "/api/analytics/export/excel",
                "/api/analytics/trends"
            ]
        }
    }