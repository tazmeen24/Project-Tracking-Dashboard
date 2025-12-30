from sqlalchemy import Column, Integer, String
from app.database import Base

class TechnicalGroup(Base):
    __tablename__ = "technical_groups"

    group_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(String(255), nullable=False, unique=True)
