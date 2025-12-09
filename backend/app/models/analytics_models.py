"""
Analytics Models for Research Project Management System
Complete: Phase 1 + Phase 2 features
Pydantic models for request/response validation
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import date


# ============================================================================
# PHASE 1 - CORE ANALYTICS MODELS
# ============================================================================

class PortfolioHealthResponse(BaseModel):
    """Response model for portfolio health endpoint"""
    total_projects: int
    total_budget_value: float
    total_funds_received: float
    total_expenditure: float
    funds_vs_budget_percentage: float
    current_funds_balance: float
    current_budget_balance: float


class KPIResponse(BaseModel):
    """Response model for KPI metrics endpoint"""
    budget_compliance_rate: float  # % of projects within budget
    funds_utilization_rate: float  # funds spent / funds received
    avg_time_to_first_funds: Optional[float]  # days
    active_projects_count: int
    completed_projects_count: int


class CashFlowDataPoint(BaseModel):
    """Single data point for cash flow chart"""
    month: str
    year: int
    funds_received: float
    expenditure: float
    net_cash_flow: float


class CashFlowResponse(BaseModel):
    """Response model for cash flow endpoint"""
    data_points: List[CashFlowDataPoint]
    period: str  # e.g., "Last 12 months"


class ProjectRiskItem(BaseModel):
    """Single project in the at-risk list"""
    project_id: int
    project_code: str
    project_title: str
    pi_name: str
    funds_balance: float
    budget_balance: float
    funds_balance_percentage: float
    risk_level: str  # "high", "medium", "low"


class CategoryDistribution(BaseModel):
    """Budget category distribution data"""
    category: str
    total_budget: float
    total_spent: float
    utilization_percentage: float
    percentage_of_total: float


# ============================================================================
# PHASE 2 - BURN RATE MODELS
# ============================================================================

class BurnRateProject(BaseModel):
    """Individual project burn rate analysis"""
    project_id: int
    project_code: str
    project_title: str
    start_date: Optional[str]
    end_date: Optional[str]
    total_budget: float
    total_funds: float
    total_expenditure: float
    current_balance: float
    last_3_months_spending: float
    days_running: int
    daily_burn_rate: float
    recent_daily_burn_rate: float
    monthly_burn_rate: float
    runway_days: Optional[int]  # Days until funds depleted
    runway_months: Optional[float]  # Months until funds depleted
    projected_depletion_date: Optional[str]
    urgency: str  # "critical", "high", "medium", "low"


# ============================================================================
# PHASE 2 - VARIANCE ANALYSIS MODELS
# ============================================================================

class CategoryVariance(BaseModel):
    """Variance for a single budget category"""
    category: str
    budgeted: float
    actual_spent: float
    variance: float
    variance_percentage: float
    utilization_percentage: float
    status: str  # "over", "under", "on-track"


class ProjectVariance(BaseModel):
    """Variance analysis for a single project"""
    project_id: int
    project_code: str
    project_title: str
    categories: List[CategoryVariance]
    total_budgeted: float
    total_spent: float
    total_variance: float


class VarianceSummary(BaseModel):
    """Overall variance summary"""
    total_budgeted: float
    total_spent: float
    total_variance: float
    variance_percentage: float
    projects_over_budget: int
    projects_under_budget: int
    projects_on_track: int


class VarianceAnalysisResponse(BaseModel):
    """Response for variance analysis endpoint"""
    projects: List[ProjectVariance]
    summary: VarianceSummary


# ============================================================================
# PHASE 2 - FINANCIAL YEAR COMPARISON MODELS
# ============================================================================

class FinancialYearData(BaseModel):
    """Data for a single financial year"""
    financial_year: str  # e.g., "FY 2023-24"
    fy_year: int  # Start year
    total_projects: int
    new_projects: int
    completed_projects: int
    total_budget: float
    total_funds_received: float
    total_expenditure: float
    funds_utilization: float  # Percentage
    yoy_budget_growth: Optional[float] = None  # Year-over-year growth %
    yoy_funds_growth: Optional[float] = None
    yoy_expenditure_growth: Optional[float] = None


class FYComparisonSummary(BaseModel):
    """Summary of financial year comparison"""
    years_analyzed: int
    current_fy: Optional[FinancialYearData]
    previous_fy: Optional[FinancialYearData]


class FYComparisonResponse(BaseModel):
    """Response for financial year comparison endpoint"""
    financial_years: List[FinancialYearData]
    summary: FYComparisonSummary


# ============================================================================
# PHASE 2 - EXPORT MODELS
# ============================================================================

class ExportData(BaseModel):
    """Generic export data model"""
    report_type: str
    generated_date: str
    data: List[dict]
    totals: Optional[dict] = None


class ExportRequest(BaseModel):
    """Request for export generation"""
    export_type: str  # "summary", "detailed", "variance", "burn_rate"
    format: str  # "excel", "pdf"
    filters: Optional[dict] = None


class ExportResponse(BaseModel):
    """Response for export endpoint"""
    success: bool
    message: str
    download_url: Optional[str] = None
    file_name: Optional[str] = None


# ============================================================================
# PHASE 2 - TREND ANALYSIS MODELS
# ============================================================================

class TrendDataPoint(BaseModel):
    """Single data point for trend analysis"""
    period: str  # Month/Quarter/Year
    funds_received: float
    expenditure: float
    variance: float
    cumulative_funds: float
    cumulative_expenditure: float


class TrendAnalysisResponse(BaseModel):
    """Response for trend analysis endpoint"""
    trends: List[TrendDataPoint]
    period_type: str  # "monthly", "quarterly", "yearly"
    months_analyzed: int