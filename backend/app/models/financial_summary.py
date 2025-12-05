"""
Financial Summary Models
Pydantic schemas for financial summary API responses
Place in: backend/app/models/financial_summary.py
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import date


class BudgetHeadDetail(BaseModel):
    """Individual budget head within a project"""
    name: str = Field(..., description="Budget head name (manpower, equipment, etc.)")
    approved_budget: Decimal = Field(..., description="Approved budget allocation")
    funds_received: Decimal = Field(..., description="Funds received for this head")
    expenditure: Decimal = Field(..., description="Actual expenditure")
    budget_balance: Decimal = Field(..., description="Budget Balance (Approved - Expenditure)")
    funds_balance: Decimal = Field(..., description="Funds Balance (Received - Expenditure)")
    utilization_percentage: float = Field(..., description="Utilization percentage")


class ProjectFinancialSummary(BaseModel):
    """Project-level financial summary"""
    project_id: int
    project_no: str
    title: str
    technical_group: Optional[str] = None
    funding_agency: Optional[str] = None
    approved_budget: Decimal
    funds_received: Decimal
    expenditure: Decimal
    budget_balance: Decimal
    funds_balance: Decimal
    utilization_percentage: float
    budget_heads: List[BudgetHeadDetail] = []


class BudgetHeadSummary(BaseModel):
    """Budget head aggregated across all projects"""
    budget_head: str
    project_count: int
    total_approved: Decimal
    total_funds_received: Decimal
    total_expenditure: Decimal
    budget_balance: Decimal
    funds_balance: Decimal
    utilization_percentage: float


class TechnicalGroupSummary(BaseModel):
    """Technical group aggregated summary"""
    group_name: str
    project_count: int
    total_approved: Decimal
    total_funds_received: Decimal
    total_expenditure: Decimal
    budget_balance: Decimal
    funds_balance: Decimal
    utilization_percentage: float


class FundingAgencySummary(BaseModel):
    """Funding agency aggregated summary"""
    agency_name: str
    project_count: int
    total_approved: Decimal
    total_funds_received: Decimal
    total_expenditure: Decimal
    budget_balance: Decimal
    funds_balance: Decimal
    utilization_percentage: float


class GrandTotals(BaseModel):
    """System-wide totals"""
    total_projects: int
    total_approved_budget: Decimal
    total_funds_received: Decimal
    total_expenditure: Decimal
    budget_balance: Decimal
    funds_balance: Decimal
    overall_utilization: float


class PaginationInfo(BaseModel):
    """Pagination metadata"""
    page: int
    per_page: int
    total_items: int
    total_pages: int


class FilterInfo(BaseModel):
    """Applied filters"""
    date_filter_mode: str
    as_of_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    financial_year: Optional[int] = None
    year: Optional[int] = None
    month: Optional[int] = None
    quarter: Optional[int] = None
    project_id: Optional[int] = None


class FinancialSummaryResponse(BaseModel):
    """Main API response structure"""
    view_mode: str
    filters: FilterInfo
    summary: GrandTotals
    data: List[dict]  # Can be ProjectFinancialSummary, BudgetHeadSummary, etc.
    pagination: PaginationInfo