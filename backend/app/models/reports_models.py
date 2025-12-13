# backend/app/models/report.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
from pydantic import BaseModel
from typing import Dict

class ReportLog(Base):
    __tablename__ = "report_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    report_type = Column(String(50), nullable=False)  # 'comprehensive', 'summary'
    format = Column(String(10), nullable=False)  # 'pdf', 'excel'
    filename = Column(String(255), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    file_size = Column(Integer, nullable=True)  # in bytes
    included_sections = Column(String(500), nullable=True)  # JSON string

class ReportGenerationRequest(BaseModel):
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