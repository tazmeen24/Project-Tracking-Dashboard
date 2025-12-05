"""
Financial Summary Service
Business logic for financial summary calculations
Place in: backend/app/services/financial_summary_service.py
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from datetime import date


class FinancialSummaryService:
    """Service layer for financial summary operations"""
    
    @staticmethod
    def get_by_project(
        db: Session, 
        date_filter_func: Optional[str] = None,
        date_params: Optional[Dict] = None,
        project_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get financial summary by project with budget head breakdown
        
        Args:
            db: Database session
            date_filter_func: Name of SQL function for date filtering (None = current data)
            date_params: Parameters for the date filter function
            project_id: Optional project ID filter
            
        Returns:
            List of projects with nested budget head details
        """
        if date_filter_func and date_params:
            # Use date filter function
            param_names = list(date_params.keys())
            param_placeholders = ', '.join([f':{k}' for k in param_names])
            query = text(f"""
                SELECT * FROM {date_filter_func}({param_placeholders})
                WHERE (:project_id IS NULL OR project_id = :project_id)
                ORDER BY project_no, budget_head
            """)
            params = {**date_params, 'project_id': project_id}
            result = db.execute(query, params)
        else:
            # Use current view
            query = text("""
                SELECT * FROM vw_financial_summary_by_project
                WHERE (:project_id IS NULL OR project_id = :project_id)
                ORDER BY project_no, budget_head
            """)
            result = db.execute(query, {'project_id': project_id})
        
        rows = result.fetchall()
        
        # Group by project
        projects_dict = {}
        for row in rows:
            pid = row.project_id
            if pid not in projects_dict:
                projects_dict[pid] = {
                    "project_id": row.project_id,
                    "project_no": row.project_no,
                    "title": row.title,
                    "technical_group": row.technical_group,
                    "funding_agency": row.funding_agency,
                    "approved_budget": 0,
                    "funds_received": 0,
                    "expenditure": 0,
                    "budget_balance": 0,
                    "funds_balance": 0,
                    "budget_heads": []
                }
            
            # Add budget head detail
            projects_dict[pid]["budget_heads"].append({
                "name": row.budget_head,
                "approved_budget": float(row.approved_budget),
                "funds_received": float(row.funds_received),
                "expenditure": float(row.expenditure),
                "budget_balance": float(row.budget_balance),
                "funds_balance": float(row.funds_balance),
                "utilization_percentage": float(row.utilization_percentage)
            })
            
            # Accumulate project totals
            projects_dict[pid]["approved_budget"] += float(row.approved_budget)
            projects_dict[pid]["funds_received"] += float(row.funds_received)
            projects_dict[pid]["expenditure"] += float(row.expenditure)
            projects_dict[pid]["budget_balance"] += float(row.budget_balance)
            projects_dict[pid]["funds_balance"] += float(row.funds_balance)
        
        # Calculate utilization percentage for each project
        for project in projects_dict.values():
            if project["approved_budget"] > 0:
                project["utilization_percentage"] = (
                    project["expenditure"] / project["approved_budget"] * 100
                )
            else:
                project["utilization_percentage"] = 0.0
        
        return list(projects_dict.values())
    
    @staticmethod
    def get_by_budget_head(
        db: Session,
        date_filter_func: Optional[str] = None,
        date_params: Optional[Dict] = None,
        project_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get financial summary aggregated by budget head"""
        
        if date_filter_func and date_params:
            param_names = list(date_params.keys())
            param_placeholders = ', '.join([f':{k}' for k in param_names])
            query = text(f"""
                SELECT 
                    budget_head,
                    COUNT(DISTINCT project_id) as project_count,
                    SUM(approved_budget) as total_approved,
                    SUM(funds_received) as total_funds_received,
                    SUM(expenditure) as total_expenditure,
                    SUM(budget_balance) as budget_balance,
                    SUM(funds_balance) as funds_balance,
                    CASE 
                        WHEN SUM(approved_budget) > 0 
                        THEN (SUM(expenditure) / SUM(approved_budget) * 100)
                        ELSE 0 
                    END as utilization_percentage
                FROM {date_filter_func}({param_placeholders})
                WHERE (:project_id IS NULL OR project_id = :project_id)
                GROUP BY budget_head
                ORDER BY budget_head
            """)
            params = {**date_params, 'project_id': project_id}
            result = db.execute(query, params)
        else:
            query = text("""
                SELECT * FROM vw_financial_summary_by_budget_head
                ORDER BY budget_head
            """)
            result = db.execute(query)
        
        return [dict(row._mapping) for row in result.fetchall()]
    
    @staticmethod
    def get_by_technical_group(
        db: Session,
        date_filter_func: Optional[str] = None,
        date_params: Optional[Dict] = None,
        project_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get financial summary grouped by technical group"""
        
        if date_filter_func and date_params:
            param_names = list(date_params.keys())
            param_placeholders = ', '.join([f':{k}' for k in param_names])
            query = text(f"""
                WITH project_totals AS (
                    SELECT 
                        project_id,
                        technical_group,
                        SUM(approved_budget) as total_approved_budget,
                        SUM(funds_received) as total_funds_received,
                        SUM(expenditure) as total_expenditure,
                        SUM(budget_balance) as total_budget_balance,
                        SUM(funds_balance) as total_funds_balance
                    FROM {date_filter_func}({param_placeholders})
                    WHERE (:project_id IS NULL OR project_id = :project_id)
                    GROUP BY project_id, technical_group
                )
                SELECT 
                    COALESCE(technical_group, 'Unassigned') as group_name,
                    COUNT(DISTINCT project_id) as project_count,
                    SUM(total_approved_budget) as total_approved,
                    SUM(total_funds_received) as total_funds_received,
                    SUM(total_expenditure) as total_expenditure,
                    SUM(total_budget_balance) as budget_balance,
                    SUM(total_funds_balance) as funds_balance,
                    CASE 
                        WHEN SUM(total_approved_budget) > 0 
                        THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
                        ELSE 0 
                    END as utilization_percentage
                FROM project_totals
                GROUP BY technical_group
                ORDER BY group_name
            """)
            params = {**date_params, 'project_id': project_id}
            result = db.execute(query, params)
        else:
            query = text("""
                SELECT * FROM vw_financial_summary_by_technical_group
                ORDER BY group_name
            """)
            result = db.execute(query)
        
        return [dict(row._mapping) for row in result.fetchall()]
    
    @staticmethod
    def get_by_funding_agency(
        db: Session,
        date_filter_func: Optional[str] = None,
        date_params: Optional[Dict] = None,
        project_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get financial summary grouped by funding agency"""
        
        if date_filter_func and date_params:
            param_names = list(date_params.keys())
            param_placeholders = ', '.join([f':{k}' for k in param_names])
            query = text(f"""
                WITH project_totals AS (
                    SELECT 
                        project_id,
                        funding_agency,
                        SUM(approved_budget) as total_approved_budget,
                        SUM(funds_received) as total_funds_received,
                        SUM(expenditure) as total_expenditure,
                        SUM(budget_balance) as total_budget_balance,
                        SUM(funds_balance) as total_funds_balance
                    FROM {date_filter_func}({param_placeholders})
                    WHERE (:project_id IS NULL OR project_id = :project_id)
                    GROUP BY project_id, funding_agency
                )
                SELECT 
                    COALESCE(funding_agency, 'Unassigned') as agency_name,
                    COUNT(DISTINCT project_id) as project_count,
                    SUM(total_approved_budget) as total_approved,
                    SUM(total_funds_received) as total_funds_received,
                    SUM(total_expenditure) as total_expenditure,
                    SUM(total_budget_balance) as budget_balance,
                    SUM(total_funds_balance) as funds_balance,
                    CASE 
                        WHEN SUM(total_approved_budget) > 0 
                        THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
                        ELSE 0 
                    END as utilization_percentage
                FROM project_totals
                GROUP BY funding_agency
                ORDER BY agency_name
            """)
            params = {**date_params, 'project_id': project_id}
            result = db.execute(query, params)
        else:
            query = text("""
                SELECT * FROM vw_financial_summary_by_funding_agency
                ORDER BY agency_name
            """)
            result = db.execute(query)
        
        return [dict(row._mapping) for row in result.fetchall()]
    
    @staticmethod
    def get_grand_totals(
        db: Session,
        date_filter_func: Optional[str] = None,
        date_params: Optional[Dict] = None,
        project_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get system-wide grand totals"""
        
        if date_filter_func and date_params:
            param_names = list(date_params.keys())
            param_placeholders = ', '.join([f':{k}' for k in param_names])
            query = text(f"""
                WITH project_totals AS (
                    SELECT 
                        project_id,
                        SUM(approved_budget) as total_approved_budget,
                        SUM(funds_received) as total_funds_received,
                        SUM(expenditure) as total_expenditure,
                        SUM(budget_balance) as total_budget_balance,
                        SUM(funds_balance) as total_funds_balance
                    FROM {date_filter_func}({param_placeholders})
                    WHERE (:project_id IS NULL OR project_id = :project_id)
                    GROUP BY project_id
                )
                SELECT 
                    COUNT(DISTINCT project_id) as total_projects,
                    SUM(total_approved_budget) as total_approved_budget,
                    SUM(total_funds_received) as total_funds_received,
                    SUM(total_expenditure) as total_expenditure,
                    SUM(total_budget_balance) as budget_balance,
                    SUM(total_funds_balance) as funds_balance,
                    CASE 
                        WHEN SUM(total_approved_budget) > 0 
                        THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
                        ELSE 0 
                    END as overall_utilization
                FROM project_totals
            """)
            params = {**date_params, 'project_id': project_id}
            result = db.execute(query, params)
        else:
            query = text("""
                SELECT * FROM vw_financial_summary_grand_totals
            """)
            result = db.execute(query)
        
        row = result.fetchone()
        if row:
            return dict(row._mapping)
        else:
            return {
                "total_projects": 0,
                "total_approved_budget": 0,
                "total_funds_received": 0,
                "total_expenditure": 0,
                "budget_balance": 0,
                "funds_balance": 0,
                "overall_utilization": 0
            }