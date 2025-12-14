# backend/app/models/reports_models.py

from pydantic import BaseModel
from typing import Dict, Optional

class ReportGenerationRequest(BaseModel):
    """Request model for report generation"""
    
    reportType: str = "comprehensive"
    format: str = "pdf"
    includeSections: Dict[str, bool] = {
        'financial_summary': True,
        'budget_allocation': True,
        'funds_expenditure': True,
        'category_breakdown': True,
        'detailed_transactions': False,
        'charts': False
    }

    class Config:
        json_schema_extra = {
            "example": {
                "reportType": "comprehensive",
                "format": "pdf",
                "includeSections": {
                    "financial_summary": True,
                    "budget_allocation": True,
                    "funds_expenditure": True,
                    "category_breakdown": True,
                    "detailed_transactions": False,
                    "charts": False
                }
            }
        }