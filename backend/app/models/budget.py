# app/models/budget.py
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from .project import ManpowerBreakdownItem, EquipmentBreakdownItem

class BudgetAllocationCreate(BaseModel):
    project_id: int
    head: str
    allocated_amount: float
    manpower_breakdown: Optional[List[ManpowerBreakdownItem]] = []
    equipment_breakdown: Optional[List[EquipmentBreakdownItem]] = []
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v

class FundsReceivedCreate(BaseModel):
    project_id: int
    head: str
    amount: float
    date_received: str
    remarks: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_received')
    @classmethod
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

class FundsReceivedUpdate(BaseModel):
    head: Optional[str] = None
    amount: Optional[float] = None
    date_received: Optional[str] = None
    remarks: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        if v is not None:
            valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead']
            if v not in valid_heads:
                raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_received')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v

class ManpowerFundsBreakdownCreate(BaseModel):
    fund_id: int
    project_id: int
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

class EquipmentFundsBreakdownCreate(BaseModel):
    fund_id: int
    project_id: int
    item_name: str
    quantity: int = 1
    unit_cost: float

    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v