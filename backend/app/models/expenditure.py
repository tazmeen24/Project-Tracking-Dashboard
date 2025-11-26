# app/models/expenditure.py
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class ManpowerCreate(BaseModel):
    project_id: int
    role: str
    salary_per_month: float
    months: int
    date_incurred: Optional[str] = None
    num_personnel: int = 1
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v

class ManpowerUpdate(BaseModel):
    role: Optional[str] = None
    salary_per_month: Optional[float] = None
    months: Optional[int] = None
    date_incurred: Optional[str] = None
    num_personnel: Optional[int] = None
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Must be a positive number')
        return v

class EquipmentCreate(BaseModel):
    project_id: int
    name: str
    purchase_date: Optional[str] = None
    quantity: int = 1
    unit_cost: float
    
    @field_validator('purchase_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    purchase_date: Optional[str] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    
    @field_validator('purchase_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Must be a positive number')
        return v

class BudgetExpenditureCreate(BaseModel):
    project_id: int
    head: str
    amount: float
    date_incurred: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class BudgetExpenditureUpdate(BaseModel):
    head: Optional[str] = None
    amount: Optional[float] = None
    date_incurred: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        if v is not None:
            valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
            if v not in valid_heads:
                raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_positive_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Amount must be positive')
        return v