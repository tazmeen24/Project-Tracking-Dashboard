"""
Services Package
Contains all business logic services for the Project Tracking Dashboard
"""

from .project_service import ProjectService
from .expenditure_service import ExpenditureService
from .auth_service import AuthService
from .dashboard_service import DashboardService
from .funds_service import FundsService

__all__ = [
    'ProjectService',
    'ExpenditureService',
    'AuthService',
    'DashboardService',
    'FundsService',
]

__version__ = '1.0.0'