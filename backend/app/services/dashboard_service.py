"""
Dashboard Service
Handles all business logic related to dashboard analytics and reporting
"""

from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from datetime import datetime, date, timedelta
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor


class DashboardService:
    """Service class for dashboard analytics and reporting operations"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    def get_overview_stats(self) -> dict:
        """
        Get overview statistics for the dashboard
        
        Returns:
            Dictionary containing overall statistics
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get total projects
            cur.execute("SELECT COUNT(*) as total FROM projects")
            total_projects = cur.fetchone()['total']
            
            # Get active projects
            cur.execute("""
                SELECT COUNT(*) as total FROM projects 
                WHERE end_date IS NULL OR end_date >= CURRENT_DATE
            """)
            active_projects = cur.fetchone()['total']
            
            # Get completed projects
            cur.execute("""
                SELECT COUNT(*) as total FROM projects 
                WHERE end_date IS NOT NULL AND end_date < CURRENT_DATE
            """)
            completed_projects = cur.fetchone()['total']
            
            # Get total budget allocated
            cur.execute("""
                SELECT COALESCE(SUM(allocated_amount), 0) as total 
                FROM budget_allocations
            """)
            total_budget = float(cur.fetchone()['total'])
            
            # Get total funds received
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM funds_received
            """)
            total_funds = float(cur.fetchone()['total'])
            
            # Get total expenditure
            cur.execute("""
                SELECT COALESCE(SUM(total_cost), 0) as total 
                FROM expenditures
            """)
            total_expenditure = float(cur.fetchone()['total'])
            
            # Calculate overall utilization
            utilization = round((total_expenditure / total_funds * 100) if total_funds > 0 else 0, 2)
            
            return {
                "projects": {
                    "total": total_projects,
                    "active": active_projects,
                    "completed": completed_projects
                },
                "financials": {
                    "total_budget_allocated": total_budget,
                    "total_funds_received": total_funds,
                    "total_expenditure": total_expenditure,
                    "available_balance": total_funds - total_expenditure,
                    "overall_utilization_percentage": utilization
                }
            }
    
    def get_project_wise_summary(self, status_filter: Optional[str] = None) -> List[dict]:
        """
        Get project-wise financial summary
        
        Args:
            status_filter: Filter by project status (active, completed, all)
            
        Returns:
            List of project summaries
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    p.alias,
                    p.start_date,
                    p.end_date,
                    fa.name as funding_agency,
                    tg.name as technical_group,
                    COALESCE(SUM(ba.allocated_amount), 0) as total_allocated,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent,
                    CASE 
                        WHEN p.end_date IS NULL OR p.end_date >= CURRENT_DATE 
                        THEN 'Active'
                        ELSE 'Completed'
                    END as status
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN budget_allocations ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
            """
            
            # Apply status filter
            if status_filter == 'active':
                query += " WHERE p.end_date IS NULL OR p.end_date >= CURRENT_DATE"
            elif status_filter == 'completed':
                query += " WHERE p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE"
            
            query += """
                GROUP BY 
                    p.project_id, p.project_no, p.title, p.alias, 
                    p.start_date, p.end_date, fa.name, tg.name
                ORDER BY p.created_at DESC
            """
            
            cur.execute(query)
            projects = cur.fetchall()
            
            # Calculate additional metrics
            result = []
            for project in projects:
                project_dict = dict(project)
                total_received = float(project_dict['total_received'])
                total_spent = float(project_dict['total_spent'])
                
                project_dict['available_balance'] = total_received - total_spent
                project_dict['utilization_percentage'] = round(
                    (total_spent / total_received * 100) if total_received > 0 else 0, 2
                )
                result.append(project_dict)
            
            return result
    
    def get_head_wise_summary(self, project_id: Optional[int] = None) -> List[dict]:
        """
        Get head-wise budget summary
        
        Args:
            project_id: Optional project ID to filter by
            
        Returns:
            List of head-wise summaries
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    ba.head,
                    COUNT(DISTINCT ba.project_id) as project_count,
                    COALESCE(SUM(ba.allocated_amount), 0) as total_allocated,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent
                FROM budget_allocations ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id 
                    AND ba.head = fr.head
                LEFT JOIN expenditures e ON ba.project_id = e.project_id 
                    AND ba.head = e.head
            """
            
            params = []
            if project_id:
                query += " WHERE ba.project_id = %s"
                params.append(project_id)
            
            query += " GROUP BY ba.head ORDER BY total_allocated DESC"
            
            cur.execute(query, params)
            heads = cur.fetchall()
            
            # Calculate additional metrics
            result = []
            for head in heads:
                head_dict = dict(head)
                total_received = float(head_dict['total_received'])
                total_spent = float(head_dict['total_spent'])
                
                head_dict['available_balance'] = total_received - total_spent
                head_dict['utilization_percentage'] = round(
                    (total_spent / total_received * 100) if total_received > 0 else 0, 2
                )
                result.append(head_dict)
            
            return result
    
    def get_funding_agency_summary(self) -> List[dict]:
        """
        Get summary grouped by funding agency
        
        Returns:
            List of funding agency summaries
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    fa.agency_id,
                    fa.name as agency_name,
                    fa.agency_type,
                    COUNT(DISTINCT p.project_id) as project_count,
                    COALESCE(SUM(ba.allocated_amount), 0) as total_allocated,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent
                FROM funding_agencies fa
                LEFT JOIN projects p ON fa.agency_id = p.funding_agency_id
                LEFT JOIN budget_allocations ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
                GROUP BY fa.agency_id, fa.name, fa.agency_type
                HAVING COUNT(DISTINCT p.project_id) > 0
                ORDER BY total_allocated DESC
            """)
            
            agencies = cur.fetchall()
            
            # Calculate additional metrics
            result = []
            for agency in agencies:
                agency_dict = dict(agency)
                total_received = float(agency_dict['total_received'])
                total_spent = float(agency_dict['total_spent'])
                
                agency_dict['available_balance'] = total_received - total_spent
                agency_dict['utilization_percentage'] = round(
                    (total_spent / total_received * 100) if total_received > 0 else 0, 2
                )
                result.append(agency_dict)
            
            return result
    
    def get_technical_group_summary(self) -> List[dict]:
        """
        Get summary grouped by technical group
        
        Returns:
            List of technical group summaries
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    tg.group_id,
                    tg.name as group_name,
                    COUNT(DISTINCT p.project_id) as project_count,
                    COALESCE(SUM(ba.allocated_amount), 0) as total_allocated,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent
                FROM technical_groups tg
                LEFT JOIN projects p ON tg.group_id = p.technical_group_id
                LEFT JOIN budget_allocations ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
                GROUP BY tg.group_id, tg.name
                HAVING COUNT(DISTINCT p.project_id) > 0
                ORDER BY total_allocated DESC
            """)
            
            groups = cur.fetchall()
            
            # Calculate additional metrics
            result = []
            for group in groups:
                group_dict = dict(group)
                total_received = float(group_dict['total_received'])
                total_spent = float(group_dict['total_spent'])
                
                group_dict['available_balance'] = total_received - total_spent
                group_dict['utilization_percentage'] = round(
                    (total_spent / total_received * 100) if total_received > 0 else 0, 2
                )
                result.append(group_dict)
            
            return result
    
    def get_monthly_expenditure_trend(self, project_id: Optional[int] = None,
                                     months: int = 12) -> List[dict]:
        """
        Get monthly expenditure trend
        
        Args:
            project_id: Optional project ID to filter by
            months: Number of months to include (default: 12)
            
        Returns:
            List of monthly expenditure data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    TO_CHAR(e.transaction_date, 'YYYY-MM') as month,
                    e.head,
                    COALESCE(SUM(e.total_cost), 0) as total_spent
                FROM expenditures e
                WHERE e.transaction_date >= CURRENT_DATE - INTERVAL '%s months'
            """
            
            params = [months]
            if project_id:
                query += " AND e.project_id = %s"
                params.append(project_id)
            
            query += """
                GROUP BY TO_CHAR(e.transaction_date, 'YYYY-MM'), e.head
                ORDER BY month DESC, e.head
            """
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_budget_utilization_chart_data(self, project_id: Optional[int] = None) -> dict:
        """
        Get data for budget utilization chart
        
        Args:
            project_id: Optional project ID to filter by
            
        Returns:
            Chart data with labels and datasets
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    ba.head as label,
                    COALESCE(SUM(ba.allocated_amount), 0) as allocated,
                    COALESCE(SUM(fr.amount), 0) as received,
                    COALESCE(SUM(e.total_cost), 0) as spent
                FROM budget_allocations ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id 
                    AND ba.head = fr.head
                LEFT JOIN expenditures e ON ba.project_id = e.project_id 
                    AND ba.head = e.head
            """
            
            params = []
            if project_id:
                query += " WHERE ba.project_id = %s"
                params.append(project_id)
            
            query += " GROUP BY ba.head ORDER BY ba.head"
            
            cur.execute(query, params)
            data = cur.fetchall()
            
            labels = []
            allocated = []
            received = []
            spent = []
            
            for row in data:
                labels.append(row['label'])
                allocated.append(float(row['allocated']))
                received.append(float(row['received']))
                spent.append(float(row['spent']))
            
            return {
                "labels": labels,
                "datasets": [
                    {
                        "label": "Allocated",
                        "data": allocated
                    },
                    {
                        "label": "Received",
                        "data": received
                    },
                    {
                        "label": "Spent",
                        "data": spent
                    }
                ]
            }
    
    def get_project_timeline_data(self, project_id: int) -> dict:
        """
        Get timeline data for a specific project
        
        Args:
            project_id: Project ID
            
        Returns:
            Timeline data with milestones and expenditures
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get project details
            cur.execute("""
                SELECT 
                    project_id,
                    project_no,
                    title,
                    start_date,
                    end_date
                FROM projects
                WHERE project_id = %s
            """, (project_id,))
            
            project = cur.fetchone()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Get funds received timeline
            cur.execute("""
                SELECT 
                    date_received as date,
                    'Funds Received' as event_type,
                    head,
                    amount,
                    remarks
                FROM funds_received
                WHERE project_id = %s
                ORDER BY date_received
            """, (project_id,))
            
            funds_timeline = [dict(row) for row in cur.fetchall()]
            
            # Get expenditure timeline
            cur.execute("""
                SELECT 
                    transaction_date as date,
                    'Expenditure' as event_type,
                    head,
                    total_cost as amount,
                    description as remarks
                FROM expenditures
                WHERE project_id = %s
                ORDER BY transaction_date
            """, (project_id,))
            
            expenditure_timeline = [dict(row) for row in cur.fetchall()]
            
            # Combine and sort timelines
            all_events = funds_timeline + expenditure_timeline
            all_events.sort(key=lambda x: x['date'] if x['date'] else date.min)
            
            return {
                "project": dict(project),
                "timeline": all_events
            }
    
    def get_manpower_utilization_report(self, project_id: Optional[int] = None) -> List[dict]:
        """
        Get manpower utilization report
        
        Args:
            project_id: Optional project ID to filter by
            
        Returns:
            List of manpower utilization data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    mab.role,
                    COALESCE(SUM(mab.num_personnel), 0) as approved_posts,
                    COALESCE(COUNT(DISTINCT m.manpower_id), 0) as filled_posts,
                    COALESCE(SUM(mab.salary_per_month * mab.months * mab.num_personnel), 0) as allocated_budget,
                    COALESCE(SUM(m.salary_per_month * 
                        CASE 
                            WHEN m.date_of_leaving IS NULL 
                            THEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, m.date_of_joining))
                            ELSE EXTRACT(MONTH FROM AGE(m.date_of_leaving, m.date_of_joining))
                        END * m.num_personnel
                    ), 0) as spent_budget
                FROM projects p
                LEFT JOIN manpower_allocation_breakdown mab ON p.project_id = mab.project_id
                LEFT JOIN manpower m ON p.project_id = m.project_id AND mab.role = m.role
            """
            
            params = []
            if project_id:
                query += " WHERE p.project_id = %s"
                params.append(project_id)
            
            query += """
                GROUP BY p.project_id, p.project_no, p.title, mab.role
                HAVING COALESCE(SUM(mab.num_personnel), 0) > 0
                ORDER BY p.project_no, mab.role
            """
            
            cur.execute(query, params)
            data = cur.fetchall()
            
            result = []
            for row in data:
                row_dict = dict(row)
                approved = int(row_dict['approved_posts'])
                filled = int(row_dict['filled_posts'])
                
                row_dict['vacant_posts'] = approved - filled
                row_dict['fill_percentage'] = round((filled / approved * 100) if approved > 0 else 0, 2)
                result.append(row_dict)
            
            return result
    
    def get_equipment_utilization_report(self, project_id: Optional[int] = None) -> List[dict]:
        """
        Get equipment utilization report
        
        Args:
            project_id: Optional project ID to filter by
            
        Returns:
            List of equipment utilization data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    eab.item_name,
                    COALESCE(SUM(eab.quantity), 0) as approved_quantity,
                    COALESCE(SUM(e.quantity), 0) as purchased_quantity,
                    COALESCE(SUM(eab.quantity * eab.unit_cost), 0) as allocated_budget,
                    COALESCE(SUM(e.quantity * e.unit_cost), 0) as spent_budget
                FROM projects p
                LEFT JOIN equipment_allocation_breakdown eab ON p.project_id = eab.project_id
                LEFT JOIN equipment e ON p.project_id = e.project_id 
                    AND eab.item_name = e.name
            """
            
            params = []
            if project_id:
                query += " WHERE p.project_id = %s"
                params.append(project_id)
            
            query += """
                GROUP BY p.project_id, p.project_no, p.title, eab.item_name
                HAVING COALESCE(SUM(eab.quantity), 0) > 0
                ORDER BY p.project_no, eab.item_name
            """
            
            cur.execute(query, params)
            data = cur.fetchall()
            
            result = []
            for row in data:
                row_dict = dict(row)
                approved = int(row_dict['approved_quantity'])
                purchased = int(row_dict['purchased_quantity'])
                
                row_dict['remaining_quantity'] = approved - purchased
                row_dict['procurement_percentage'] = round(
                    (purchased / approved * 100) if approved > 0 else 0, 2
                )
                result.append(row_dict)
            
            return result
    
    def get_alerts_and_notifications(self) -> dict:
        """
        Get alerts and notifications for the dashboard
        
        Returns:
            Dictionary containing various alerts
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            alerts = {
                "overbudget_projects": [],
                "low_balance_projects": [],
                "expiring_projects": [],
                "underutilized_funds": []
            }
            
            # Projects exceeding budget
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent
                FROM projects p
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
                GROUP BY p.project_id, p.project_no, p.title
                HAVING COALESCE(SUM(e.total_cost), 0) > COALESCE(SUM(fr.amount), 0)
            """)
            
            alerts['overbudget_projects'] = [dict(row) for row in cur.fetchall()]
            
            # Projects with low balance (< 10% remaining)
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent,
                    COALESCE(SUM(fr.amount), 0) - COALESCE(SUM(e.total_cost), 0) as balance
                FROM projects p
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
                WHERE p.end_date IS NULL OR p.end_date >= CURRENT_DATE
                GROUP BY p.project_id, p.project_no, p.title
                HAVING 
                    COALESCE(SUM(fr.amount), 0) > 0 AND
                    (COALESCE(SUM(fr.amount), 0) - COALESCE(SUM(e.total_cost), 0)) / 
                    COALESCE(SUM(fr.amount), 1) < 0.1
            """)
            
            alerts['low_balance_projects'] = [dict(row) for row in cur.fetchall()]
            
            # Projects expiring in next 30 days
            cur.execute("""
                SELECT 
                    project_id,
                    project_no,
                    title,
                    end_date,
                    end_date - CURRENT_DATE as days_remaining
                FROM projects
                WHERE end_date IS NOT NULL 
                    AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                ORDER BY end_date
            """)
            
            alerts['expiring_projects'] = [dict(row) for row in cur.fetchall()]
            
            # Projects with underutilized funds (< 50% spent with < 3 months remaining)
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    p.end_date,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent,
                    ROUND((COALESCE(SUM(e.total_cost), 0) / COALESCE(SUM(fr.amount), 1) * 100)::numeric, 2) as utilization_percentage
                FROM projects p
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
                WHERE p.end_date IS NOT NULL 
                    AND p.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
                GROUP BY p.project_id, p.project_no, p.title, p.end_date
                HAVING 
                    COALESCE(SUM(fr.amount), 0) > 0 AND
                    (COALESCE(SUM(e.total_cost), 0) / COALESCE(SUM(fr.amount), 1)) < 0.5
            """)
            
            alerts['underutilized_funds'] = [dict(row) for row in cur.fetchall()]
            
            return alerts