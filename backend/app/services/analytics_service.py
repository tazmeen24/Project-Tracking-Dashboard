"""
Analytics Services for Research Project Management System
Complete: Phase 1 + Phase 2 features merged into one service
Business logic and database queries for all analytics
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
import calendar


class AnalyticsService:
    """Complete analytics service with all features"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    # ========================================================================
    # PHASE 1 - CORE ANALYTICS
    # ========================================================================
    
    def get_portfolio_health(self) -> Dict[str, Any]:
        """Get overall portfolio health metrics"""
        cursor = self.conn.cursor()
        
        query = """
        WITH project_budgets AS (
            SELECT 
                p.project_id,
                COALESCE(SUM(ba.allocated_amount), 0) as total_budget
            FROM projects p
            LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
            GROUP BY p.project_id
        ),
        project_funds AS (
            SELECT 
                project_id,
                COALESCE(SUM(amount), 0) as total_funds
            FROM funds_received
            GROUP BY project_id
        ),
        project_expenditure AS (
            SELECT 
                project_id,
                COALESCE(SUM(cost), 0) as total_exp
            FROM (
                SELECT project_id, total_cost as cost FROM manpower
                UNION ALL
                SELECT project_id, total_cost FROM equipment
                UNION ALL
                SELECT project_id, amount FROM budget_expenditure
            ) all_exp
            GROUP BY project_id
        )
        SELECT 
            COUNT(DISTINCT pb.project_id) as total_projects,
            COALESCE(SUM(pb.total_budget), 0) as total_budget,
            COALESCE(SUM(pf.total_funds), 0) as total_funds,
            COALESCE(SUM(pe.total_exp), 0) as total_expenditure,
            CASE 
                WHEN SUM(pb.total_budget) > 0 
                THEN (SUM(COALESCE(pf.total_funds, 0)) * 100.0 / SUM(pb.total_budget))
                ELSE 0 
            END as funds_vs_budget_pct,
            (SUM(COALESCE(pf.total_funds, 0)) - SUM(COALESCE(pe.total_exp, 0))) as funds_balance,
            (SUM(pb.total_budget) - SUM(COALESCE(pe.total_exp, 0))) as budget_balance
        FROM project_budgets pb
        LEFT JOIN project_funds pf ON pb.project_id = pf.project_id
        LEFT JOIN project_expenditure pe ON pb.project_id = pe.project_id;
        """
        
        try:
            cursor.execute(query)
            row = cursor.fetchone()
            cursor.close()
            
            if row:
                return {
                    "total_projects": int(row[0]) if row[0] else 0,
                    "total_budget_value": float(row[1]) if row[1] else 0.0,
                    "total_funds_received": float(row[2]) if row[2] else 0.0,
                    "total_expenditure": float(row[3]) if row[3] else 0.0,
                    "funds_vs_budget_percentage": float(row[4]) if row[4] else 0.0,
                    "current_funds_balance": float(row[5]) if row[5] else 0.0,
                    "current_budget_balance": float(row[6]) if row[6] else 0.0
                }
        except Exception as e:
            cursor.close()
            print(f"Error in get_portfolio_health: {e}")
            import traceback
            traceback.print_exc()
        
        return {
            "total_projects": 0,
            "total_budget_value": 0.0,
            "total_funds_received": 0.0,
            "total_expenditure": 0.0,
            "funds_vs_budget_percentage": 0.0,
            "current_funds_balance": 0.0,
            "current_budget_balance": 0.0
        }
    
    def get_kpis(self) -> Dict[str, Any]:
        """Get Key Performance Indicators"""
        cursor = self.conn.cursor()
        
        # Budget Compliance Rate
        compliance_query = """
        WITH project_budgets AS (
            SELECT 
                p.project_id,
                COALESCE(SUM(ba.allocated_amount), 0) as total_budget,
                COALESCE((SELECT SUM(total_cost) FROM manpower WHERE project_id = p.project_id), 0) +
                COALESCE((SELECT SUM(total_cost) FROM equipment WHERE project_id = p.project_id), 0) +
                COALESCE((SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id), 0) as total_spent
            FROM projects p
            LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
            GROUP BY p.project_id
            HAVING COALESCE(SUM(ba.allocated_amount), 0) > 0
        )
        SELECT 
            COALESCE(
                COUNT(CASE WHEN total_spent <= total_budget THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
                0
            ) as compliance_rate
        FROM project_budgets;
        """
        
        try:
            cursor.execute(compliance_query)
            compliance = cursor.fetchone()
            budget_compliance_rate = float(compliance[0]) if compliance and compliance[0] is not None else 0.0
        except Exception as e:
            print(f"Error in compliance query: {e}")
            import traceback
            traceback.print_exc()
            budget_compliance_rate = 0.0
        
        # Funds Utilization Rate
        utilization_query = """
        WITH totals AS (
            SELECT 
                COALESCE(SUM(fr.amount), 0) as total_received,
                COALESCE((SELECT SUM(total_cost) FROM manpower), 0) +
                COALESCE((SELECT SUM(total_cost) FROM equipment), 0) +
                COALESCE((SELECT SUM(amount) FROM budget_expenditure), 0) as total_spent
            FROM funds_received fr
        )
        SELECT 
            CASE 
                WHEN total_received > 0 
                THEN (total_spent * 100.0 / total_received)
                ELSE 0 
            END as utilization_rate
        FROM totals;
        """
        
        try:
            cursor.execute(utilization_query)
            utilization = cursor.fetchone()
            funds_utilization_rate = float(utilization[0]) if utilization and utilization[0] is not None else 0.0
        except Exception as e:
            print(f"Error in utilization query: {e}")
            import traceback
            traceback.print_exc()
            funds_utilization_rate = 0.0
        
        # Average Time to First Funds - FIXED: Use AGE function instead of direct subtraction
        time_to_funds_query = """
        SELECT 
            AVG(EXTRACT(DAY FROM AGE(fr.date_received, p.start_date))) as avg_days
        FROM projects p
        INNER JOIN (
            SELECT project_id, MIN(date_received) as date_received
            FROM funds_received
            GROUP BY project_id
        ) fr ON p.project_id = fr.project_id
        WHERE p.start_date IS NOT NULL 
            AND fr.date_received IS NOT NULL;
        """
        
        try:
            cursor.execute(time_to_funds_query)
            time_result = cursor.fetchone()
            avg_time = time_result[0] if time_result and time_result[0] is not None else None
            avg_time_to_first_funds = float(avg_time) if avg_time is not None else None
        except Exception as e:
            print(f"Error in time to funds query: {e}")
            import traceback
            traceback.print_exc()
            avg_time_to_first_funds = None
        
        # Project Counts
        count_query = """
        SELECT 
            COUNT(CASE WHEN end_date IS NULL OR end_date > CURRENT_DATE THEN 1 END) as active_count,
            COUNT(CASE WHEN end_date IS NOT NULL AND end_date <= CURRENT_DATE THEN 1 END) as completed_count
        FROM projects;
        """
        
        try:
            cursor.execute(count_query)
            counts = cursor.fetchone()
            active_count = int(counts[0]) if counts and counts[0] is not None else 0
            completed_count = int(counts[1]) if counts and counts[1] is not None else 0
        except Exception as e:
            print(f"Error in counts query: {e}")
            import traceback
            traceback.print_exc()
            active_count = 0
            completed_count = 0
        
        cursor.close()
        
        return {
            "budget_compliance_rate": budget_compliance_rate,
            "funds_utilization_rate": funds_utilization_rate,
            "avg_time_to_first_funds": avg_time_to_first_funds,
            "active_projects_count": active_count,
            "completed_projects_count": completed_count
        }
    
    def get_cash_flow(self, months: int = 12) -> Dict[str, Any]:
        """Get cash flow data for specified months"""
        cursor = self.conn.cursor()
        
        end_date = datetime.now()
        start_date = end_date - relativedelta(months=months)
        
        query = """
        WITH date_series AS (
            SELECT generate_series(%s::date, %s::date, '1 month'::interval)::date as month_start
        ),
        monthly_funds AS (
            SELECT 
                DATE_TRUNC('month', date_received)::date as month_start,
                COALESCE(SUM(amount), 0) as funds_received
            FROM funds_received
            WHERE date_received IS NOT NULL
            GROUP BY DATE_TRUNC('month', date_received)::date
        ),
        monthly_expenditure AS (
            SELECT 
                DATE_TRUNC('month', expense_date)::date as month_start,
                COALESCE(SUM(cost), 0) as expenditure
            FROM (
                SELECT date_incurred as expense_date, total_cost as cost 
                FROM manpower 
                WHERE date_incurred IS NOT NULL
                UNION ALL
                SELECT purchase_date as expense_date, total_cost as cost 
                FROM equipment 
                WHERE purchase_date IS NOT NULL
                UNION ALL
                SELECT date_incurred as expense_date, amount as cost 
                FROM budget_expenditure 
                WHERE date_incurred IS NOT NULL
            ) all_exp
            GROUP BY DATE_TRUNC('month', expense_date)::date
        )
        SELECT 
            ds.month_start,
            COALESCE(mf.funds_received, 0) as funds_received,
            COALESCE(me.expenditure, 0) as expenditure
        FROM date_series ds
        LEFT JOIN monthly_funds mf ON ds.month_start = mf.month_start
        LEFT JOIN monthly_expenditure me ON ds.month_start = me.month_start
        ORDER BY ds.month_start;
        """
        
        try:
            cursor.execute(query, (start_date, end_date))
            rows = cursor.fetchall()
            cursor.close()
            
            data_points = []
            for row in rows:
                month_start = row[0]
                funds = float(row[1]) if row[1] else 0.0
                expenditure = float(row[2]) if row[2] else 0.0
                
                data_points.append({
                    "month": calendar.month_name[month_start.month],
                    "year": month_start.year,
                    "funds_received": funds,
                    "expenditure": expenditure,
                    "net_cash_flow": funds - expenditure
                })
            
            return {
                "data_points": data_points,
                "period": f"Last {months} months"
            }
        except Exception as e:
            cursor.close()
            print(f"Error in get_cash_flow: {e}")
            import traceback
            traceback.print_exc()
            return {
                "data_points": [],
                "period": f"Last {months} months"
            }
    
    def get_projects_at_risk(self, threshold: int = 20) -> List[Dict[str, Any]]:
        """Get projects with low funds balance"""
        cursor = self.conn.cursor()
        
        # FIXED: Changed to use principal_investigator column from investigators table
        query = """
        WITH project_budgets AS (
            SELECT 
                p.project_id,
                p.project_no,
                p.title,
                COALESCE(SUM(ba.allocated_amount), 0) as total_budget
            FROM projects p
            LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
            GROUP BY p.project_id, p.project_no, p.title
        ),
        project_funds AS (
            SELECT 
                project_id,
                COALESCE(SUM(amount), 0) as total_funds
            FROM funds_received
            GROUP BY project_id
        ),
        project_expenditure AS (
            SELECT 
                project_id,
                COALESCE(SUM(cost), 0) as total_exp
            FROM (
                SELECT project_id, total_cost as cost FROM manpower
                UNION ALL
                SELECT project_id, total_cost FROM equipment
                UNION ALL
                SELECT project_id, amount FROM budget_expenditure
            ) all_exp
            GROUP BY project_id
        )
        SELECT 
            pb.project_id,
            pb.project_no,
            pb.title,
            COALESCE(i.principal_investigator, 'N/A') as pi_name,
            pb.total_budget,
            COALESCE(pf.total_funds, 0) as total_funds,
            COALESCE(pe.total_exp, 0) as total_exp,
            (COALESCE(pf.total_funds, 0) - COALESCE(pe.total_exp, 0)) as funds_balance,
            (pb.total_budget - COALESCE(pe.total_exp, 0)) as budget_balance,
            CASE 
                WHEN pb.total_budget > 0 
                THEN ((COALESCE(pf.total_funds, 0) - COALESCE(pe.total_exp, 0)) * 100.0 / pb.total_budget)
                ELSE 0 
            END as funds_balance_pct
        FROM project_budgets pb
        LEFT JOIN project_funds pf ON pb.project_id = pf.project_id
        LEFT JOIN project_expenditure pe ON pb.project_id = pe.project_id
        LEFT JOIN investigators i ON pb.project_id = i.project_id
        WHERE pb.total_budget > 0 
            AND ((COALESCE(pf.total_funds, 0) - COALESCE(pe.total_exp, 0)) * 100.0 / pb.total_budget) < %s
        ORDER BY funds_balance_pct ASC;
        """
        
        try:
            cursor.execute(query, (threshold,))
            rows = cursor.fetchall()
            cursor.close()
            
            projects = []
            for row in rows:
                funds_pct = float(row[9]) if row[9] is not None else 0.0
                
                if funds_pct < 10:
                    risk_level = "high"
                elif funds_pct < 20:
                    risk_level = "medium"
                else:
                    risk_level = "low"
                
                projects.append({
                    "project_id": int(row[0]),
                    "project_code": str(row[1]),
                    "project_title": str(row[2]),
                    "pi_name": str(row[3]),
                    "funds_balance": float(row[7]) if row[7] is not None else 0.0,
                    "budget_balance": float(row[8]) if row[8] is not None else 0.0,
                    "funds_balance_percentage": funds_pct,
                    "risk_level": risk_level
                })
            
            return projects
            
        except Exception as e:
            cursor.close()
            print(f"Error in get_projects_at_risk: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_category_distribution(self) -> List[Dict[str, Any]]:
        """Get budget distribution across categories"""
        cursor = self.conn.cursor()
        
        query = """
        WITH category_budgets AS (
            SELECT 
                head as category,
                COALESCE(SUM(allocated_amount), 0) as total_budget
            FROM budget_allocation
            GROUP BY head
        ),
        category_spending AS (
            SELECT 
                'manpower' as category,
                COALESCE(SUM(total_cost), 0) as total_spent
            FROM manpower
            UNION ALL
            SELECT 
                'equipment',
                COALESCE(SUM(total_cost), 0)
            FROM equipment
            UNION ALL
            SELECT 
                head,
                COALESCE(SUM(amount), 0)
            FROM budget_expenditure
            GROUP BY head
        ),
        aggregated_spending AS (
            SELECT 
                category,
                SUM(total_spent) as total_spent
            FROM category_spending
            GROUP BY category
        ),
        total_budget_sum AS (
            SELECT SUM(total_budget) as grand_total FROM category_budgets
        )
        SELECT 
            COALESCE(cb.category, cs.category) as category,
            COALESCE(cb.total_budget, 0) as total_budget,
            COALESCE(cs.total_spent, 0) as total_spent,
            CASE 
                WHEN COALESCE(cb.total_budget, 0) > 0 
                THEN (COALESCE(cs.total_spent, 0) * 100.0 / cb.total_budget)
                ELSE 0 
            END as utilization_pct,
            CASE 
                WHEN tb.grand_total > 0 
                THEN (COALESCE(cb.total_budget, 0) * 100.0 / tb.grand_total)
                ELSE 0 
            END as pct_of_total
        FROM category_budgets cb
        FULL OUTER JOIN aggregated_spending cs ON cb.category = cs.category
        CROSS JOIN total_budget_sum tb
        ORDER BY total_budget DESC;
        """
        
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            
            categories = []
            for row in rows:
                categories.append({
                    "category": str(row[0]).title() if row[0] else "Unknown",
                    "total_budget": float(row[1]) if row[1] else 0.0,
                    "total_spent": float(row[2]) if row[2] else 0.0,
                    "utilization_percentage": float(row[3]) if row[3] else 0.0,
                    "percentage_of_total": float(row[4]) if row[4] else 0.0
                })
            
            return categories
            
        except Exception as e:
            cursor.close()
            print(f"Error in get_category_distribution: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    # ========================================================================
    # PHASE 2 - BURN RATE ANALYSIS
    # ========================================================================
    
    def get_burn_rate_analysis(self) -> List[Dict[str, Any]]:
        """
        Calculate burn rate for all projects
        Predicts when projects will run out of funds
        Note: Shows all projects regardless of end date
        """
        cursor = self.conn.cursor()
        
        query = """
        WITH project_budgets AS (
            SELECT 
                p.project_id,
                p.project_no,
                p.title,
                p.start_date,
                p.end_date,
                COALESCE(SUM(ba.allocated_amount), 0) as total_budget
            FROM projects p
            LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
            GROUP BY p.project_id, p.project_no, p.title, p.start_date, p.end_date
        ),
        project_funds AS (
            SELECT 
                project_id,
                COALESCE(SUM(amount), 0) as total_funds
            FROM funds_received
            GROUP BY project_id
        ),
        project_expenditure AS (
            SELECT 
                project_id,
                COALESCE(SUM(cost), 0) as total_exp
            FROM (
                SELECT project_id, total_cost as cost FROM manpower
                UNION ALL
                SELECT project_id, total_cost FROM equipment
                UNION ALL
                SELECT project_id, amount FROM budget_expenditure
            ) all_exp
            GROUP BY project_id
        ),
        recent_spending AS (
            SELECT 
                project_id,
                COALESCE(SUM(cost), 0) as recent_spending
            FROM (
                SELECT project_id, total_cost as cost, date_incurred as expense_date
                FROM manpower 
                WHERE date_incurred >= CURRENT_DATE - INTERVAL '3 months'
                UNION ALL
                SELECT project_id, total_cost, purchase_date
                FROM equipment 
                WHERE purchase_date >= CURRENT_DATE - INTERVAL '3 months'
                UNION ALL
                SELECT project_id, amount, date_incurred
                FROM budget_expenditure 
                WHERE date_incurred >= CURRENT_DATE - INTERVAL '3 months'
            ) recent_exp
            GROUP BY project_id
        ),
        project_age AS (
            SELECT 
                project_id,
                (CURRENT_DATE - start_date) as days_running
            FROM projects
            WHERE start_date IS NOT NULL
        )
        SELECT 
            pb.project_id,
            pb.project_no,
            pb.title,
            pb.start_date,
            pb.end_date,
            pb.total_budget,
            COALESCE(pf.total_funds, 0) as total_funds,
            COALESCE(pe.total_exp, 0) as total_expenditure,
            (COALESCE(pf.total_funds, 0) - COALESCE(pe.total_exp, 0)) as current_balance,
            COALESCE(rs.recent_spending, 0) as last_3_months_spending,
            COALESCE(pa.days_running, 0) as days_running,
            CASE 
                WHEN pa.days_running > 0 
                THEN (COALESCE(pe.total_exp, 0) / pa.days_running)
                ELSE 0 
            END as daily_burn_rate,
            CASE 
                WHEN rs.recent_spending > 0 
                THEN (rs.recent_spending / 90.0)
                ELSE 0 
            END as recent_daily_burn_rate,
            CASE 
                WHEN rs.recent_spending > 0 AND (COALESCE(pf.total_funds, 0) - COALESCE(pe.total_exp, 0)) > 0
                THEN ((COALESCE(pf.total_funds, 0) - COALESCE(pe.total_exp, 0)) / (rs.recent_spending / 90.0))
                ELSE NULL 
            END as runway_days
        FROM project_budgets pb
        LEFT JOIN project_funds pf ON pb.project_id = pf.project_id
        LEFT JOIN project_expenditure pe ON pb.project_id = pe.project_id
        LEFT JOIN recent_spending rs ON pb.project_id = rs.project_id
        LEFT JOIN project_age pa ON pb.project_id = pa.project_id
        WHERE pb.total_budget > 0
        ORDER BY runway_days ASC NULLS LAST;
        """
        
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            
            projects = []
            for row in rows:
                daily_burn = float(row[11]) if row[11] else 0.0
                recent_burn = float(row[12]) if row[12] else 0.0
                runway_days = float(row[13]) if row[13] else None
                
                depletion_date = None
                if runway_days:
                    depletion_date = (datetime.now() + timedelta(days=runway_days)).date()
                
                urgency = "low"
                if runway_days:
                    if runway_days < 30:
                        urgency = "critical"
                    elif runway_days < 90:
                        urgency = "high"
                    elif runway_days < 180:
                        urgency = "medium"
                
                projects.append({
                    "project_id": int(row[0]),
                    "project_code": str(row[1]),
                    "project_title": str(row[2]),
                    "start_date": str(row[3]) if row[3] else None,
                    "end_date": str(row[4]) if row[4] else None,
                    "total_budget": float(row[5]) if row[5] else 0.0,
                    "total_funds": float(row[6]) if row[6] else 0.0,
                    "total_expenditure": float(row[7]) if row[7] else 0.0,
                    "current_balance": float(row[8]) if row[8] else 0.0,
                    "last_3_months_spending": float(row[9]) if row[9] else 0.0,
                    "days_running": int(row[10]) if row[10] else 0,
                    "daily_burn_rate": daily_burn,
                    "recent_daily_burn_rate": recent_burn,
                    "monthly_burn_rate": recent_burn * 30,
                    "runway_days": int(runway_days) if runway_days else None,
                    "runway_months": round(runway_days / 30, 1) if runway_days else None,
                    "projected_depletion_date": str(depletion_date) if depletion_date else None,
                    "urgency": urgency
                })
            
            return projects
            
        except Exception as e:
            cursor.close()
            print(f"Error in get_burn_rate_analysis: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    # ========================================================================
    # PHASE 2 - BUDGET VARIANCE ANALYSIS
    # ========================================================================
    
    def get_budget_variance_analysis(self, project_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Analyze budget variance (planned vs actual spending)
        """
        cursor = self.conn.cursor()
        
        # Different filters for different tables
        project_budget_filter = "AND p.project_id = %s" if project_id else ""
        manpower_filter = "AND project_id = %s" if project_id else ""
        equipment_filter = "AND project_id = %s" if project_id else ""
        expenditure_filter = "AND project_id = %s" if project_id else ""
        
        # Build params tuple - one for each filter usage
        params = ()
        if project_id:
            params = (project_id, project_id, project_id, project_id)
        
        query = f"""
        WITH project_budgets AS (
            SELECT 
                p.project_id,
                p.project_no,
                p.title,
                ba.head as category,
                ba.allocated_amount as budgeted
            FROM projects p
            INNER JOIN budget_allocation ba ON p.project_id = ba.project_id
            WHERE 1=1 {project_budget_filter}
        ),
        category_spending AS (
            SELECT 
                project_id,
                'manpower' as category,
                COALESCE(SUM(total_cost), 0) as actual_spent
            FROM manpower
            WHERE 1=1 {manpower_filter}
            GROUP BY project_id
            
            UNION ALL
            
            SELECT 
                project_id,
                'equipment',
                COALESCE(SUM(total_cost), 0)
            FROM equipment
            WHERE 1=1 {equipment_filter}
            GROUP BY project_id
            
            UNION ALL
            
            SELECT 
                project_id,
                head,
                COALESCE(SUM(amount), 0)
            FROM budget_expenditure
            WHERE 1=1 {expenditure_filter}
            GROUP BY project_id, head
        ),
        aggregated_spending AS (
            SELECT 
                project_id,
                category,
                SUM(actual_spent) as actual_spent
            FROM category_spending
            GROUP BY project_id, category
        )
        SELECT 
            pb.project_id,
            pb.project_no,
            pb.title,
            pb.category,
            COALESCE(pb.budgeted, 0) as budgeted,
            COALESCE(cs.actual_spent, 0) as actual_spent,
            (COALESCE(cs.actual_spent, 0) - COALESCE(pb.budgeted, 0)) as variance,
            CASE 
                WHEN pb.budgeted > 0 
                THEN ((COALESCE(cs.actual_spent, 0) - pb.budgeted) * 100.0 / pb.budgeted)
                ELSE 0 
            END as variance_percentage,
            CASE 
                WHEN pb.budgeted > 0 
                THEN (COALESCE(cs.actual_spent, 0) * 100.0 / pb.budgeted)
                ELSE 0 
            END as utilization_percentage
        FROM project_budgets pb
        LEFT JOIN aggregated_spending cs 
            ON pb.project_id = cs.project_id 
            AND pb.category = cs.category
        ORDER BY pb.project_id, pb.category;
        """
        
        try:
            cursor.execute(query, params)
            rows = cursor.fetchall()
            cursor.close()
            
            if not rows:
                return {
                    "projects": [],
                    "summary": {
                        "total_budgeted": 0.0,
                        "total_spent": 0.0,
                        "total_variance": 0.0,
                        "variance_percentage": 0.0,
                        "projects_over_budget": 0,
                        "projects_under_budget": 0,
                        "projects_on_track": 0
                    }
                }
            
            projects_dict = {}
            for row in rows:
                proj_id = int(row[0])
                if proj_id not in projects_dict:
                    projects_dict[proj_id] = {
                        "project_id": proj_id,
                        "project_code": str(row[1]),
                        "project_title": str(row[2]),
                        "categories": [],
                        "total_budgeted": 0.0,
                        "total_spent": 0.0,
                        "total_variance": 0.0
                    }
                
                budgeted = float(row[4]) if row[4] else 0.0
                spent = float(row[5]) if row[5] else 0.0
                variance = float(row[6]) if row[6] else 0.0
                
                projects_dict[proj_id]["categories"].append({
                    "category": str(row[3]).title(),
                    "budgeted": budgeted,
                    "actual_spent": spent,
                    "variance": variance,
                    "variance_percentage": float(row[7]) if row[7] else 0.0,
                    "utilization_percentage": float(row[8]) if row[8] else 0.0,
                    "status": "over" if variance > 0 else "under" if variance < 0 else "on-track"
                })
                
                projects_dict[proj_id]["total_budgeted"] += budgeted
                projects_dict[proj_id]["total_spent"] += spent
                projects_dict[proj_id]["total_variance"] += variance
            
            total_budgeted = sum(p["total_budgeted"] for p in projects_dict.values())
            total_spent = sum(p["total_spent"] for p in projects_dict.values())
            total_variance = total_spent - total_budgeted
            
            projects_over = sum(1 for p in projects_dict.values() if p["total_variance"] > 0)
            projects_under = sum(1 for p in projects_dict.values() if p["total_variance"] < 0)
            
            return {
                "projects": list(projects_dict.values()),
                "summary": {
                    "total_budgeted": total_budgeted,
                    "total_spent": total_spent,
                    "total_variance": total_variance,
                    "variance_percentage": (total_variance * 100.0 / total_budgeted) if total_budgeted > 0 else 0.0,
                    "projects_over_budget": projects_over,
                    "projects_under_budget": projects_under,
                    "projects_on_track": len(projects_dict) - projects_over - projects_under
                }
            }
            
        except Exception as e:
            cursor.close()
            print(f"Error in get_budget_variance_analysis: {e}")
            import traceback
            traceback.print_exc()
            return {
                "projects": [],
                "summary": {
                    "total_budgeted": 0.0,
                    "total_spent": 0.0,
                    "total_variance": 0.0,
                    "variance_percentage": 0.0,
                    "projects_over_budget": 0,
                    "projects_under_budget": 0,
                    "projects_on_track": 0
                }
            }
    
    # ========================================================================
    # PHASE 2 - FINANCIAL YEAR COMPARISON
    # ========================================================================
    
    def get_financial_year_comparison(self, years: int = 3) -> Dict[str, Any]:
        """
        Compare financial metrics across multiple financial years
        Assumes April-March FY (Indian FY) - modify if needed
        """
        cursor = self.conn.cursor()
        
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        
        if current_month < 4:
            fy_start_year = current_year - 1
        else:
            fy_start_year = current_year
        
        query = """
        WITH financial_years AS (
            SELECT 
                generate_series(0, %s - 1) as fy_offset
        ),
        fy_dates AS (
            SELECT 
                fy_offset,
                (%s - fy_offset) as fy_year,
                make_date(%s - fy_offset, 4, 1) as fy_start,
                make_date(%s - fy_offset + 1, 3, 31) as fy_end
            FROM financial_years
        ),
        fy_projects AS (
            SELECT 
                fd.fy_year,
                COUNT(DISTINCT p.project_id) as total_projects,
                COUNT(DISTINCT CASE WHEN p.start_date BETWEEN fd.fy_start AND fd.fy_end THEN p.project_id END) as new_projects,
                COUNT(DISTINCT CASE WHEN p.end_date BETWEEN fd.fy_start AND fd.fy_end THEN p.project_id END) as completed_projects
            FROM fy_dates fd
            CROSS JOIN projects p
            WHERE p.start_date <= fd.fy_end
            GROUP BY fd.fy_year
        ),
        fy_budgets AS (
            SELECT 
                fd.fy_year,
                COALESCE(SUM(ba.allocated_amount), 0) as total_budget
            FROM fy_dates fd
            LEFT JOIN projects p ON p.start_date BETWEEN fd.fy_start AND fd.fy_end
            LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
            GROUP BY fd.fy_year
        ),
        fy_funds AS (
            SELECT 
                fd.fy_year,
                COALESCE(SUM(fr.amount), 0) as total_funds_received
            FROM fy_dates fd
            LEFT JOIN funds_received fr ON fr.date_received BETWEEN fd.fy_start AND fd.fy_end
            GROUP BY fd.fy_year
        ),
        fy_expenditure AS (
            SELECT 
                fd.fy_year,
                COALESCE(SUM(cost), 0) as total_expenditure
            FROM fy_dates fd
            LEFT JOIN (
                SELECT date_incurred as expense_date, total_cost as cost
                FROM manpower
                WHERE date_incurred IS NOT NULL
                UNION ALL
                SELECT purchase_date, total_cost
                FROM equipment
                WHERE purchase_date IS NOT NULL
                UNION ALL
                SELECT date_incurred, amount
                FROM budget_expenditure
                WHERE date_incurred IS NOT NULL
            ) all_exp ON all_exp.expense_date BETWEEN fd.fy_start AND fd.fy_end
            GROUP BY fd.fy_year
        )
        SELECT 
            fp.fy_year,
            fp.total_projects,
            fp.new_projects,
            fp.completed_projects,
            COALESCE(fb.total_budget, 0) as total_budget,
            COALESCE(ff.total_funds_received, 0) as total_funds_received,
            COALESCE(fe.total_expenditure, 0) as total_expenditure
        FROM fy_projects fp
        LEFT JOIN fy_budgets fb ON fp.fy_year = fb.fy_year
        LEFT JOIN fy_funds ff ON fp.fy_year = ff.fy_year
        LEFT JOIN fy_expenditure fe ON fp.fy_year = fe.fy_year
        ORDER BY fp.fy_year DESC;
        """
        
        try:
            cursor.execute(query, (years, fy_start_year, fy_start_year, fy_start_year))
            rows = cursor.fetchall()
            cursor.close()
            
            fy_data = []
            for row in rows:
                fy_data.append({
                    "financial_year": f"FY {row[0]}-{str(row[0] + 1)[-2:]}",
                    "fy_year": int(row[0]),
                    "total_projects": int(row[1]) if row[1] else 0,
                    "new_projects": int(row[2]) if row[2] else 0,
                    "completed_projects": int(row[3]) if row[3] else 0,
                    "total_budget": float(row[4]) if row[4] else 0.0,
                    "total_funds_received": float(row[5]) if row[5] else 0.0,
                    "total_expenditure": float(row[6]) if row[6] else 0.0,
                    "funds_utilization": (float(row[6]) * 100.0 / float(row[5])) if row[5] and float(row[5]) > 0 else 0.0
                })
            
            for i in range(len(fy_data) - 1):
                current = fy_data[i]
                previous = fy_data[i + 1]
                
                current["yoy_budget_growth"] = (
                    ((current["total_budget"] - previous["total_budget"]) * 100.0 / previous["total_budget"]) 
                    if previous["total_budget"] > 0 else 0.0
                )
                current["yoy_funds_growth"] = (
                    ((current["total_funds_received"] - previous["total_funds_received"]) * 100.0 / previous["total_funds_received"]) 
                    if previous["total_funds_received"] > 0 else 0.0
                )
                current["yoy_expenditure_growth"] = (
                    ((current["total_expenditure"] - previous["total_expenditure"]) * 100.0 / previous["total_expenditure"]) 
                    if previous["total_expenditure"] > 0 else 0.0
                )
            
            return {
                "financial_years": fy_data,
                "summary": {
                    "years_analyzed": len(fy_data),
                    "current_fy": fy_data[0] if fy_data else None,
                    "previous_fy": fy_data[1] if len(fy_data) > 1 else None
                }
            }
            
        except Exception as e:
            cursor.close()
            print(f"Error in get_financial_year_comparison: {e}")
            import traceback
            traceback.print_exc()
            return {
                "financial_years": [],
                "summary": {
                    "years_analyzed": 0,
                    "current_fy": None,
                    "previous_fy": None
                }
            }
    
    # ========================================================================
    # PHASE 2 - EXPORT DATA
    # ========================================================================
    
    def get_export_data(self, export_type: str = "summary") -> Dict[str, Any]:
        """Get data formatted for export to Excel/PDF"""
        
        if export_type == "summary":
            return self._get_summary_export_data()
        elif export_type == "variance":
            return self._get_variance_export_data()
        elif export_type == "burn_rate":
            return self._get_burn_rate_export_data()
        else:
            return {"error": "Invalid export type"}
    
    def _get_summary_export_data(self) -> Dict[str, Any]:
        """Get summary data for export"""
        cursor = self.conn.cursor()
        
        query = """
        SELECT 
            p.project_no,
            p.title,
            p.start_date,
            p.end_date,
            COALESCE(SUM(ba.allocated_amount), 0) as total_budget,
            COALESCE((SELECT SUM(amount) FROM funds_received WHERE project_id = p.project_id), 0) as total_funds,
            COALESCE(
                (SELECT SUM(total_cost) FROM manpower WHERE project_id = p.project_id) +
                (SELECT SUM(total_cost) FROM equipment WHERE project_id = p.project_id) +
                (SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id),
                0
            ) as total_expenditure,
            tg.name as technical_group,
            fa.name as funding_agency
        FROM projects p
        LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
        LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
        LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
        GROUP BY p.project_id, p.project_no, p.title, p.start_date, p.end_date, tg.name, fa.name
        ORDER BY p.project_no;
        """
        
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            
            projects = []
            for row in rows:
                budget = float(row[4]) if row[4] else 0.0
                funds = float(row[5]) if row[5] else 0.0
                expenditure = float(row[6]) if row[6] else 0.0
                
                projects.append({
                    "Project Code": str(row[0]),
                    "Project Title": str(row[1]),
                    "Start Date": str(row[2]) if row[2] else "",
                    "End Date": str(row[3]) if row[3] else "",
                    "Total Budget": budget,
                    "Funds Received": funds,
                    "Expenditure": expenditure,
                    "Funds Balance": funds - expenditure,
                    "Budget Balance": budget - expenditure,
                    "Funds Utilization %": (expenditure * 100.0 / funds) if funds > 0 else 0.0,
                    "Technical Group": str(row[7]) if row[7] else "",
                    "Funding Agency": str(row[8]) if row[8] else ""
                })
            
            return {
                "report_type": "Portfolio Summary",
                "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "data": projects,
                "totals": {
                    "Total Budget": sum(p["Total Budget"] for p in projects),
                    "Total Funds": sum(p["Funds Received"] for p in projects),
                    "Total Expenditure": sum(p["Expenditure"] for p in projects)
                }
            }
            
        except Exception as e:
            cursor.close()
            print(f"Error in _get_summary_export_data: {e}")
            return {"error": str(e)}
    
    def _get_variance_export_data(self) -> Dict[str, Any]:
        """Get variance analysis data for export"""
        variance_data = self.get_budget_variance_analysis()
        return {
            "report_type": "Budget Variance Analysis",
            "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data": variance_data
        }
    
    def _get_burn_rate_export_data(self) -> Dict[str, Any]:
        """Get burn rate data for export"""
        burn_rate_data = self.get_burn_rate_analysis()
        return {
            "report_type": "Burn Rate Analysis",
            "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data": burn_rate_data
        }
    
    # ========================================================================
    # PHASE 2 - SPENDING TRENDS
    # ========================================================================
    
    def get_spending_trends(self, months: int = 12) -> Dict[str, Any]:
        """Get spending trends with cumulative data"""
        cursor = self.conn.cursor()
        
        query = """
        WITH date_range AS (
            SELECT 
                DATE_TRUNC('month', generate_series(
                    CURRENT_DATE - INTERVAL '%s months',
                    CURRENT_DATE,
                    '1 month'::interval
                ))::date as period
        ),
        monthly_data AS (
            SELECT 
                DATE_TRUNC('month', date_received)::date as period,
                SUM(amount) as funds_received
            FROM funds_received
            WHERE date_received >= CURRENT_DATE - INTERVAL '%s months'
            GROUP BY DATE_TRUNC('month', date_received)::date
        ),
        monthly_spending AS (
            SELECT 
                DATE_TRUNC('month', expense_date)::date as period,
                SUM(cost) as expenditure
            FROM (
                SELECT date_incurred as expense_date, total_cost as cost
                FROM manpower WHERE date_incurred IS NOT NULL
                UNION ALL
                SELECT purchase_date, total_cost
                FROM equipment WHERE purchase_date IS NOT NULL
                UNION ALL
                SELECT date_incurred, amount
                FROM budget_expenditure WHERE date_incurred IS NOT NULL
            ) all_exp
            WHERE expense_date >= CURRENT_DATE - INTERVAL '%s months'
            GROUP BY DATE_TRUNC('month', expense_date)::date
        )
        SELECT 
            dr.period,
            COALESCE(md.funds_received, 0) as funds_received,
            COALESCE(ms.expenditure, 0) as expenditure
        FROM date_range dr
        LEFT JOIN monthly_data md ON dr.period = md.period
        LEFT JOIN monthly_spending ms ON dr.period = ms.period
        ORDER BY dr.period;
        """
        
        try:
            cursor.execute(query, (months, months, months))
            rows = cursor.fetchall()
            cursor.close()
            
            trends = []
            cumulative_funds = 0
            cumulative_exp = 0
            
            for row in rows:
                period_date = row[0]
                funds = float(row[1]) if row[1] else 0.0
                exp = float(row[2]) if row[2] else 0.0
                
                cumulative_funds += funds
                cumulative_exp += exp
                
                trends.append({
                    "period": period_date.strftime("%b %Y"),
                    "funds_received": funds,
                    "expenditure": exp,
                    "variance": funds - exp,
                    "cumulative_funds": cumulative_funds,
                    "cumulative_expenditure": cumulative_exp
                })
            
            return {
                "trends": trends,
                "period_type": "monthly",
                "months_analyzed": months
            }
            
        except Exception as e:
            cursor.close()
            print(f"Error in get_spending_trends: {e}")
            import traceback
            traceback.print_exc()
            return {
                "trends": [],
                "period_type": "monthly",
                "months_analyzed": months
            }