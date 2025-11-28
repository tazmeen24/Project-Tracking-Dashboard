# app/models/funding_agency.py
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class FundingAgencyDetailsCreate(BaseModel):
    """Model for creating funding agency details"""
    agency_id: int
    contact_person: str
    designation: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    sanctioned_number: Optional[str] = None
    scheme: Optional[str] = None
    cna_sub_agency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    
    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and v:
            # Remove spaces and special characters for validation
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 10:
                raise ValueError('Mobile number must be at least 10 digits')
        return v
    
    @field_validator('contact_person')
    @classmethod
    def validate_contact_person(cls, v):
        if not v or not v.strip():
            raise ValueError('Contact person is required')
        return v.strip()

class FundingAgencyDetailsUpdate(BaseModel):
    """Model for updating funding agency details"""
    contact_person: Optional[str] = None
    designation: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    sanctioned_number: Optional[str] = None
    scheme: Optional[str] = None
    cna_sub_agency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    
    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and v:
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 10:
                raise ValueError('Mobile number must be at least 10 digits')
        return v
    
    @field_validator('contact_person')
    @classmethod
    def validate_contact_person(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Contact person cannot be empty')
        return v.strip() if v else v

class FundingAgencyDetailsResponse(BaseModel):
    """Model for funding agency details response"""
    id: int
    agency_id: int
    contact_person: str
    designation: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    sanctioned_number: Optional[str] = None
    scheme: Optional[str] = None
    cna_sub_agency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class FundingAgencyCreate(BaseModel):
    """Model for creating a funding agency (basic info)"""
    name: str
    description: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Agency name is required')
        return v.strip()

class FundingAgencyUpdate(BaseModel):
    """Model for updating a funding agency"""
    name: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Agency name cannot be empty')
        return v.strip() if v else v

class FundingAgencyResponse(BaseModel):
    """Model for funding agency response"""
    agency_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class FundingAgencyFullResponse(BaseModel):
    """Model for complete funding agency response with details"""
    agency_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    details: Optional[FundingAgencyDetailsResponse] = None
    
    class Config:
        from_attributes = True