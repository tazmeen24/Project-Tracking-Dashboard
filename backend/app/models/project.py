# app/models/project.py
from pydantic import BaseModel, field_validator, EmailStr, model_validator
from typing import Optional, List, Literal
from datetime import datetime

class ManpowerBreakdownItem(BaseModel):
    role: str
    salary_per_month: float
    months: int
    num_personnel: int = 1
    
    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v

class EquipmentBreakdownItem(BaseModel):
    item_name: str
    quantity: int
    unit_cost: float
    
    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v
    
class InvestigatorCreate(BaseModel):
    """Model for creating investigator details"""
    project_id: int
    principal_investigator: str
    pi_email: EmailStr
    pi_mobile: str
    co_investigator: Optional[str] = None
    co_email: Optional[EmailStr] = None
    co_mobile: Optional[str] = None
    
    @field_validator('pi_mobile', 'co_mobile')
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and v:
            # Remove spaces and special characters for validation
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 10:
                raise ValueError('Mobile number must be at least 10 digits')
        return v

class InvestigatorUpdate(BaseModel):
    """Model for updating investigator details"""
    principal_investigator: Optional[str] = None
    pi_email: Optional[EmailStr] = None
    pi_mobile: Optional[str] = None
    co_investigator: Optional[str] = None
    co_email: Optional[EmailStr] = None
    co_mobile: Optional[str] = None
    
    @field_validator('pi_mobile', 'co_mobile')
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and v:
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 10:
                raise ValueError('Mobile number must be at least 10 digits')
        return v

class InvestigatorResponse(BaseModel):
    """Model for investigator response"""
    id: int
    project_id: int
    principal_investigator: str
    pi_email: str
    pi_mobile: str
    co_investigator: Optional[str] = None
    co_email: Optional[str] = None
    co_mobile: Optional[str] = None
    created_at: datetime

class ProjectCreate(BaseModel):
    project_no: str
    title: str
    alias: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    funding_agency_id: int
    technical_group_id: int
    
    # New fields for project categorization
    project_category: Literal['sponsored', 'non-sponsored']
    project_type: Literal['PFMS', 'NON-PFMS', 'contract-research']
    PFMS_id: Optional[str] = None
    
    # Investigator details
    principal_investigator: str
    pi_email: EmailStr
    pi_mobile: str
    co_investigator: Optional[str] = None
    co_email: Optional[EmailStr] = None
    co_mobile: Optional[str] = None
    
    # Budget allocations
    manpower_allocation: Optional[float] = 0.0
    equipment_allocation: Optional[float] = 0.0
    consumables_allocation: Optional[float] = 0.0
    contingency_allocation: Optional[float] = 0.0
    travel_training_allocation: Optional[float] = 0.0
    overhead_allocation: Optional[float] = 0.0
    
    # Breakdowns
    manpower_breakdown: Optional[List[ManpowerBreakdownItem]] = []
    equipment_breakdown: Optional[List[EquipmentBreakdownItem]] = []
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('manpower_allocation', 'equipment_allocation', 'consumables_allocation',
                 'contingency_allocation', 'travel_training_allocation', 'overhead_allocation')
    @classmethod
    def validate_allocation_amounts(cls, v):
        if v is not None and v < 0:
            raise ValueError('Allocation amounts must be non-negative')
        return v
    
    @field_validator('pi_mobile', 'co_mobile')
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and v:
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 10:
                raise ValueError('Mobile number must be at least 10 digits')
        return v
    
    @model_validator(mode='after')
    def validate_project_category_type_relation(self):
        """Validate project_category and project_type relationship"""
        if self.project_category == 'sponsored':
            if self.project_type not in ['PFMS', 'NON-PFMS']:
                raise ValueError(
                    "When project_category is 'sponsored', project_type must be either 'PFMS' or 'NON-PFMS'"
                )
        elif self.project_category == 'non-sponsored':
            if self.project_type != 'contract-research':
                raise ValueError(
                    "When project_category is 'non-sponsored', project_type must be 'contract-research'"
                )
        return self
    
    @model_validator(mode='after')
    def validate_PFMS_identifier(self):
        """Validate that PFMS_id is provided when project_type is 'PFMS'"""
        if self.project_category == 'sponsored' and self.project_type == 'PFMS':
            if not self.PFMS_id or self.PFMS_id.strip() == '':
                raise ValueError(
                    "PFMS_id is required when project_category is 'sponsored' and project_type is 'PFMS'"
                )
        return self

class ProjectUpdate(BaseModel):
    """Model for updating project details"""
    project_no: Optional[str] = None
    title: Optional[str] = None
    alias: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    funding_agency_id: Optional[int] = None
    technical_group_id: Optional[int] = None
    project_category: Optional[Literal['sponsored', 'non-sponsored']] = None
    project_type: Optional[Literal['PFMS', 'NON-PFMS', 'contract-research']] = None
    PFMS_id: Optional[str] = None
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @model_validator(mode='after')
    def validate_project_category_type_relation(self):
        """Validate project_category and project_type relationship if both are provided"""
        if self.project_category and self.project_type:
            if self.project_category == 'sponsored':
                if self.project_type not in ['PFMS', 'NON-PFMS']:
                    raise ValueError(
                        "When project_category is 'sponsored', project_type must be either 'PFMS' or 'NON-PFMS'"
                    )
            elif self.project_category == 'non-sponsored':
                if self.project_type != 'contract-research':
                    raise ValueError(
                        "When project_category is 'non-sponsored', project_type must be 'contract-research'"
                    )
        return self
    
    @model_validator(mode='after')
    def validate_PFMS_identifier(self):
        """Validate PFMS_id requirements when updating"""
        if self.project_type == 'PFMS' and self.project_category == 'sponsored':
            if self.PFMS_id is not None and self.PFMS_id.strip() == '':
                raise ValueError(
                    "PFMS_id cannot be empty when project_type is 'PFMS' and project_category is 'sponsored'"
                )
        return self

class ProjectResponse(BaseModel):
    """Model for project response"""
    project_id: int
    project_no: str
    title: str
    alias: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    funding_agency_id: int
    technical_group_id: int
    project_category: str
    project_type: str
    PFMS_id: Optional[str] = None
    created_at: datetime

class TechnicalGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None