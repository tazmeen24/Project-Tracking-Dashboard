from sqlalchemy import Column, Integer, String
from app.database import Base

class FundingAgency(Base):
    __tablename__ = "funding_agencies"

    agency_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    address = Column(String(500), nullable=True)
