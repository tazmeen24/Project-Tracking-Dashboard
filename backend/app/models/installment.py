# backend/app/models/installment.py

from sqlalchemy import Column, Integer, String, Numeric, Date, Text, ForeignKey, DateTime, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ProjectInstallment(Base):
    __tablename__ = "project_installments"

    installment_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False, index=True)
    installment_number = Column(Integer, nullable=False)
    sanction_number = Column(Text, nullable=False)
    sanction_date = Column(Date, nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    date_received = Column(Date, nullable=False)
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="installments")
    funds = relationship("FundsReceived", back_populates="installment", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint('project_id', 'installment_number', name='unique_project_installment'),
        UniqueConstraint('project_id', 'sanction_number', name='unique_project_sanction'),
        CheckConstraint('total_amount > 0', name='installment_positive_amount'),
        CheckConstraint('installment_number > 0', name='positive_installment_number'),
    )

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'installment_id': self.installment_id,
            'project_id': self.project_id,
            'installment_number': self.installment_number,
            'sanction_number': self.sanction_number,
            'sanction_date': self.sanction_date.isoformat() if self.sanction_date else None,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'date_received': self.date_received.isoformat() if self.date_received else None,
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<ProjectInstallment(id={self.installment_id}, project_id={self.project_id}, number={self.installment_number})>"