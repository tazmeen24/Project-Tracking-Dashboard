# backend/app/services/reports_service.py
from xhtml2pdf import pisa
from datetime import datetime
import os
import tempfile
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from io import BytesIO

class ReportService:
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    def get_project_report_data(self, project_id: int) -> Dict[str, Any]:
        """Fetch all data needed for project report"""
        
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        
        # Get project basic info
        cursor.execute("""
            SELECT 
                p.*,
                i.principal_investigator as pi_name,
                i.pi_email,
                i.pi_mobile,
                i.co_investigator,
                i.co_email,
                i.co_mobile,
                fa.name as funding_agency_name,
                tg.name as technical_group_name
            FROM projects p
            LEFT JOIN investigators i ON p.project_id = i.project_id
            LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
            LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
            WHERE p.project_id = %s
        """, (project_id,))
        project = cursor.fetchone()
        
        if not project:
            cursor.close()
            raise ValueError(f"Project {project_id} not found")
        
        # Get financial summary
        financial_summary = self._get_financial_summary(cursor, project_id)
        
        # Get budget allocation by category  
        budget_allocation = self._get_budget_allocation(cursor, project_id)
        
        # Get funds and expenditure by category (aggregated)
        funds_expenditure = self._get_funds_expenditure(cursor, project_id)
        
        # Get detailed funds received with breakdowns
        funds_received = self._get_funds_received_with_breakdowns(cursor, project_id)
        
        # Get detailed expenditures
        expenditures = self._get_expenditures_detailed(cursor, project_id)
        
        # Get detailed category data
        categories = self._get_category_details(cursor, project_id)
        
        cursor.close()
        
        return {
            'project': dict(project),
            'financial_summary': financial_summary,
            'budget_allocation': budget_allocation,
            'funds_expenditure': funds_expenditure,
            'funds_received': funds_received,
            'expenditures': expenditures,
            'categories': categories
        }
    
    def _get_financial_summary(self, cursor, project_id: int) -> Dict[str, Any]:
        """Get overall financial summary"""
        
        cursor.execute("""
            SELECT 
                COALESCE(SUM(allocated_amount), 0) as total_budget
            FROM budget_allocation
            WHERE project_id = %s
        """, (project_id,))
        budget_data = cursor.fetchone()
        
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total_funds
            FROM funds_received
            WHERE project_id = %s
        """, (project_id,))
        funds_data = cursor.fetchone()
        
        # Calculate total expenditure from all sources
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_spent), 0) as total_spent
            FROM (
                -- Manpower expenditures
                SELECT SUM(total_cost) as total_spent
                FROM manpower
                WHERE project_id = %s
                
                UNION ALL
                
                -- Equipment expenditures
                SELECT SUM(total_cost) as total_spent
                FROM equipment
                WHERE project_id = %s
                
                UNION ALL
                
                -- Other expenditures
                SELECT SUM(amount) as total_spent
                FROM budget_expenditure
                WHERE project_id = %s
            ) all_expenditures
        """, (project_id, project_id, project_id))
        spent_data = cursor.fetchone()
        
        total_budget = float(budget_data['total_budget'] or 0)
        total_funds = float(funds_data['total_funds'] or 0)
        total_spent = float(spent_data['total_spent'] or 0)
        
        budget_balance = total_budget - total_spent
        funds_balance = total_funds - total_spent
        
        budget_utilization = (total_spent / total_budget * 100) if total_budget > 0 else 0
        funds_utilization = (total_spent / total_funds * 100) if total_funds > 0 else 0
        
        return {
            'total_budget': total_budget,
            'total_committed': total_spent,  # Using spent as committed
            'budget_balance': budget_balance,
            'budget_utilization': budget_utilization,
            'total_funds': total_funds,
            'total_spent': total_spent,
            'funds_balance': funds_balance,
            'funds_utilization': funds_utilization
        }
    
    def _get_budget_allocation(self, cursor, project_id: int) -> list:
        """Get budget allocation by category with total expenditures"""
        
        cursor.execute("""
            SELECT 
                ba.head as category,
                ba.allocated_amount as approved_budget,
                COALESCE(total_exp.total_spent, 0) as committed_amount,
                (ba.allocated_amount - COALESCE(total_exp.total_spent, 0)) as balance,
                CASE 
                    WHEN ba.allocated_amount > 0 THEN (COALESCE(total_exp.total_spent, 0) / ba.allocated_amount * 100)
                    ELSE 0 
                END as utilization_percentage
            FROM budget_allocation ba
            LEFT JOIN (
                SELECT head, SUM(total_spent) as total_spent
                FROM (
                    -- Manpower expenditures
                    SELECT 'manpower' as head, SUM(total_cost) as total_spent
                    FROM manpower
                    WHERE project_id = %s
                    
                    UNION ALL
                    
                    -- Equipment expenditures
                    SELECT 'equipment' as head, SUM(total_cost) as total_spent
                    FROM equipment
                    WHERE project_id = %s
                    
                    UNION ALL
                    
                    -- Other expenditures from budget_expenditure
                    SELECT head, SUM(amount) as total_spent
                    FROM budget_expenditure
                    WHERE project_id = %s
                    GROUP BY head
                ) all_exp
                GROUP BY head
            ) total_exp ON ba.head = total_exp.head
            WHERE ba.project_id = %s
            ORDER BY 
                CASE ba.head
                    WHEN 'manpower' THEN 1
                    WHEN 'equipment' THEN 2
                    WHEN 'consumables' THEN 3
                    WHEN 'travel & training' THEN 4
                    WHEN 'contingency' THEN 5
                    WHEN 'overhead' THEN 6
                    ELSE 7
                END
        """, (project_id, project_id, project_id, project_id))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def _get_funds_expenditure(self, cursor, project_id: int) -> list:
        """Get funds received and expenditure by category"""
        
        cursor.execute("""
            SELECT 
                ba.head as category,
                COALESCE(fr_sum.total_received, 0) as funds_received,
                COALESCE(total_exp.total_spent, 0) as spent,
                (COALESCE(fr_sum.total_received, 0) - COALESCE(total_exp.total_spent, 0)) as balance
            FROM budget_allocation ba
            LEFT JOIN (
                SELECT head, SUM(amount) as total_received
                FROM funds_received
                WHERE project_id = %s
                GROUP BY head
            ) fr_sum ON ba.head = fr_sum.head
            LEFT JOIN (
                SELECT head, SUM(total_spent) as total_spent
                FROM (
                    -- Manpower expenditures
                    SELECT 'manpower' as head, SUM(total_cost) as total_spent
                    FROM manpower
                    WHERE project_id = %s
                    
                    UNION ALL
                    
                    -- Equipment expenditures
                    SELECT 'equipment' as head, SUM(total_cost) as total_spent
                    FROM equipment
                    WHERE project_id = %s
                    
                    UNION ALL
                    
                    -- Other expenditures
                    SELECT head, SUM(amount) as total_spent
                    FROM budget_expenditure
                    WHERE project_id = %s
                    GROUP BY head
                ) all_exp
                GROUP BY head
            ) total_exp ON ba.head = total_exp.head
            WHERE ba.project_id = %s
            ORDER BY 
                CASE ba.head
                    WHEN 'manpower' THEN 1
                    WHEN 'equipment' THEN 2
                    WHEN 'consumables' THEN 3
                    WHEN 'travel & training' THEN 4
                    WHEN 'contingency' THEN 5
                    WHEN 'overhead' THEN 6
                    ELSE 7
                END
        """, (project_id, project_id, project_id, project_id, project_id))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def _get_category_details(self, cursor, project_id: int) -> Dict[str, list]:
        """Get detailed transaction data for all categories"""
        
        categories = {}
        
        # Get all expenditures from budget_expenditure table
        cursor.execute("""
            SELECT 
                head as category,
                description,
                amount,
                date_incurred
            FROM budget_expenditure
            WHERE project_id = %s
            ORDER BY head, date_incurred DESC
        """, (project_id,))
        
        budget_expenditures = cursor.fetchall()
        
        # Get manpower data
        cursor.execute("""
            SELECT 
                role as description,
                total_cost as amount,
                date_incurred
            FROM manpower
            WHERE project_id = %s
            ORDER BY date_incurred DESC
        """, (project_id,))
        
        manpower_data = cursor.fetchall()
        if manpower_data:
            categories['manpower'] = [dict(row) for row in manpower_data]
        
        # Get equipment data
        cursor.execute("""
            SELECT 
                name as description,
                total_cost as amount,
                purchase_date as date_incurred
            FROM equipment
            WHERE project_id = %s
            ORDER BY purchase_date DESC
        """, (project_id,))
        
        equipment_data = cursor.fetchall()
        if equipment_data:
            categories['equipment'] = [dict(row) for row in equipment_data]
        
        # Group budget_expenditure by head
        for exp in budget_expenditures:
            category = exp['category']
            if category not in categories:
                categories[category] = []
            categories[category].append(dict(exp))
        
        return categories
    
    def _get_funds_received_with_breakdowns(self, cursor, project_id: int) -> Dict[str, list]:
        """Get all funds received with detailed breakdowns for manpower and equipment"""
        
        funds_by_head = {
            'manpower': [],
            'equipment': [],
            'consumables': [],
            'travel & training': [],
            'contingency': [],
            'overhead': []
        }
        
        # Get manpower funds with breakdown
        cursor.execute("""
            SELECT 
                fr.fund_id,
                fr.head,
                fr.amount,
                fr.date_received,
                mfb.role,
                mfb.salary_per_month,
                mfb.months,
                mfb.num_personnel
            FROM funds_received fr
            JOIN manpower_funds_breakdown mfb ON fr.fund_id = mfb.fund_id
            WHERE fr.project_id = %s AND fr.head = 'manpower'
            ORDER BY fr.date_received DESC
        """, (project_id,))
        
        for row in cursor.fetchall():
            funds_by_head['manpower'].append({
                'fund_id': row['fund_id'],
                'head': row['head'],
                'amount': float(row['amount']),
                'date_received': row['date_received'],
                'breakdown': {
                    'role': row['role'],
                    'salary_per_month': float(row['salary_per_month']),
                    'months': row['months'],
                    'num_personnel': row['num_personnel']
                }
            })
        
        # Get equipment funds with breakdown
        cursor.execute("""
            SELECT 
                fr.fund_id,
                fr.head,
                fr.amount,
                fr.date_received,
                efb.item_name,
                efb.quantity,
                efb.unit_cost
            FROM funds_received fr
            JOIN equipment_funds_breakdown efb ON fr.fund_id = efb.fund_id
            WHERE fr.project_id = %s AND fr.head = 'equipment'
            ORDER BY fr.date_received DESC
        """, (project_id,))
        
        for row in cursor.fetchall():
            funds_by_head['equipment'].append({
                'fund_id': row['fund_id'],
                'head': row['head'],
                'amount': float(row['amount']),
                'date_received': row['date_received'],
                'breakdown': {
                    'item_name': row['item_name'],
                    'quantity': row['quantity'],
                    'unit_cost': float(row['unit_cost'])
                }
            })
        
        # Get other heads (no breakdown)
        cursor.execute("""
            SELECT 
                fund_id,
                head,
                amount,
                date_received,
                remarks
            FROM funds_received
            WHERE project_id = %s AND head NOT IN ('manpower', 'equipment')
            ORDER BY head, date_received DESC
        """, (project_id,))
        
        for row in cursor.fetchall():
            head = row['head']
            if head in funds_by_head:
                funds_by_head[head].append({
                    'fund_id': row['fund_id'],
                    'head': head,
                    'amount': float(row['amount']),
                    'date_received': row['date_received'],
                    'remarks': row['remarks']
                })
        
        return funds_by_head
    
    def _get_expenditures_detailed(self, cursor, project_id: int) -> Dict[str, list]:
        """Get all expenditures with full details"""
        
        expenditures = {
            'manpower': [],
            'equipment': [],
            'consumables': [],
            'travel & training': [],
            'contingency': [],
            'overhead': []
        }
        
        # Get manpower expenditures
        cursor.execute("""
            SELECT 
                date_incurred,
                role,
                salary_per_month,
                months,
                num_personnel,
                total_cost
            FROM manpower
            WHERE project_id = %s
            ORDER BY date_incurred DESC
        """, (project_id,))
        
        for row in cursor.fetchall():
            expenditures['manpower'].append({
                'date_incurred': row['date_incurred'],
                'role': row['role'],
                'salary_per_month': float(row['salary_per_month']),
                'months': row['months'],
                'num_personnel': row['num_personnel'],
                'total_cost': float(row['total_cost'])
            })
        
        # Get equipment expenditures
        cursor.execute("""
            SELECT 
                purchase_date,
                name,
                quantity,
                unit_cost,
                total_cost
            FROM equipment
            WHERE project_id = %s
            ORDER BY purchase_date DESC
        """, (project_id,))
        
        for row in cursor.fetchall():
            expenditures['equipment'].append({
                'purchase_date': row['purchase_date'],
                'name': row['name'],
                'quantity': row['quantity'],
                'unit_cost': float(row['unit_cost']),
                'total_cost': float(row['total_cost'])
            })
        
        # Get other expenditures from budget_expenditure
        cursor.execute("""
            SELECT 
                head,
                amount,
                date_incurred,
                description
            FROM budget_expenditure
            WHERE project_id = %s
            ORDER BY head, date_incurred DESC
        """, (project_id,))
        
        for row in cursor.fetchall():
            head = row['head']
            if head in expenditures:
                expenditures[head].append({
                    'head': head,
                    'amount': float(row['amount']),
                    'date_incurred': row['date_incurred'],
                    'description': row['description']
                })
        
        return expenditures
    
    def log_report_generation(self, project_id: int, report_type: str, format: str, 
                            filename: str, file_size: int, user_id: Optional[int] = None,
                            included_sections: Optional[Dict] = None):
        """Log report generation to database"""
        
        cursor = self.conn.cursor()
        
        sections_json = json.dumps(included_sections) if included_sections else None
        
        cursor.execute("""
            INSERT INTO report_logs 
            (project_id, report_type, format, filename, generated_by, file_size, included_sections)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (project_id, report_type, format, filename, user_id, file_size, sections_json))
        
        self.conn.commit()
        cursor.close()


class PDFReportGenerator:
    """Handles PDF generation using xhtml2pdf"""
    
    @staticmethod
    def format_currency(amount: float) -> str:
        """Format currency in Indian Rupees with full numbers"""
        if amount is None or amount == 0:
            return "Rs. 0.00"
        # Format with Indian comma style: 1,00,000 instead of 100,000
        s = f"{amount:,.2f}"
        # Convert to Indian numbering system
        parts = s.split('.')
        integer_part = parts[0].replace(',', '')
        if len(integer_part) > 3:
            last_three = integer_part[-3:]
            rest = integer_part[:-3]
            # Add commas every 2 digits for rest
            rest_formatted = ''
            for i, digit in enumerate(reversed(rest)):
                if i > 0 and i % 2 == 0:
                    rest_formatted = ',' + rest_formatted
                rest_formatted = digit + rest_formatted
            integer_part = rest_formatted + ',' + last_three
        result = f"Rs. {integer_part}.{parts[1]}"
        return result
    
    @staticmethod
    def format_percentage(value: float) -> str:
        """Format percentage with 2 decimal places"""
        if value is None:
            return "0.00%"
        return f"{value:.2f}%"
    
    @staticmethod
    def format_date(date_value) -> str:
        """Format date to DD-MMM-YYYY"""
        if not date_value:
            return "N/A"
        try:
            if isinstance(date_value, str):
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            else:
                dt = date_value
            return dt.strftime("%d-%b-%Y")
        except:
            return str(date_value)
    
    @staticmethod
    def format_date_simple(date_value) -> str:
        """Format date to D/M/YYYY"""
        if not date_value:
            return "N/A"
        try:
            if isinstance(date_value, str):
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            else:
                dt = date_value
            return dt.strftime("%-d/%-m/%Y") if hasattr(dt, 'strftime') else dt.strftime("%d/%m/%Y").lstrip('0').replace('/0', '/')
        except:
            return str(date_value)
    
    @staticmethod
    def generate_pdf(project_data: Dict[str, Any], include_sections: Dict[str, bool]) -> str:
        """Generate PDF report and return file path"""
        
        html_content = PDFReportGenerator._build_html(project_data, include_sections)
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', dir=tempfile.gettempdir())
        temp_path = temp_file.name
        temp_file.close()
        
        # Generate PDF
        with open(temp_path, 'w+b') as output_file:
            pisa_status = pisa.CreatePDF(
                html_content.encode('utf-8'),
                dest=output_file,
                encoding='utf-8'
            )
        
        if pisa_status.err:
            raise Exception(f"PDF generation error: {pisa_status.err}")
        
        return temp_path
    
    @staticmethod
    def _build_html(data: Dict[str, Any], sections: Dict[str, bool]) -> str:
        """Build complete HTML for report"""
        
        project = data.get('project', {})
        financial_summary = data.get('financial_summary', {})
        budget_allocation = data.get('budget_allocation', [])
        funds_expenditure = data.get('funds_expenditure', [])
        categories = data.get('categories', {})
        
        # Calculate duration in months
        try:
            from dateutil import relativedelta
            start = project.get('start_date')
            end = project.get('end_date')
            duration_months = 'N/A'
            if start and end:
                if isinstance(start, str):
                    start = datetime.fromisoformat(start.replace('Z', '+00:00'))
                if isinstance(end, str):
                    end = datetime.fromisoformat(end.replace('Z', '+00:00'))
                delta = end - start
                duration_months = int(delta.days / 30)
        except:
            duration_months = 'N/A'
        
        # Format dates simply
        def fmt_date(d):
            if not d: return 'N/A'
            try:
                if isinstance(d, str):
                    dt = datetime.fromisoformat(d.replace('Z', '+00:00'))
                else:
                    dt = d
                return dt.strftime("%d/%m/%Y")
            except:
                return str(d)
        
        # Start HTML with embedded CSS
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Project Report - {project.get('project_no', '')}</title>
            <style>
                {PDFReportGenerator._get_css()}
            </style>
        </head>
        <body>
            <h1 class="main-title">PROJECT FINANCIAL REPORT</h1>
            
            <!-- Project Information Section -->
            <div class="info-section">
                <h2>Project Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="width: 35%; padding: 3px 5px;">Project ID</td><td style="width: 3%; padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{project.get('project_no', 'N/A')}</td></tr>
                    <tr><td style="padding: 3px 5px;">Project Category</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{project.get('project_category', 'N/A')}</td></tr>
                    <tr><td style="padding: 3px 5px;">Project Type</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{project.get('project_type', 'N/A')}</td></tr>
                    <tr><td style="padding: 3px 5px;">PFMS ID</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{project.get('pfms_id', 'N/A')}</td></tr>
                    <tr><td style="padding: 3px 5px;">Technical Group</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{project.get('technical_group_name', 'N/A')}</td></tr>
                    <tr><td style="padding: 3px 5px;">Start & End Date</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{fmt_date(project.get('start_date'))} - {fmt_date(project.get('end_date'))}</td></tr>
                    <tr><td style="padding: 3px 5px;">Duration</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{duration_months} months</td></tr>
                </table>
            </div>
            
            <!-- Funding Agency Section -->
            <div class="info-section">
                <h2>Funding Agency</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="width: 35%; padding: 3px 5px;">Agency Name</td><td style="width: 3%; padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">{project.get('funding_agency_name', 'N/A')}</td></tr>
                    <tr><td style="padding: 3px 5px;">Contact Person</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Designation</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Email</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Mobile No.</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Sanctioned No.</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Scheme</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">CNA Sub Agency</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Bank Name</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                    <tr><td style="padding: 3px 5px;">Bank Account No.</td><td style="padding: 3px 5px; text-align: center;">:</td><td style="padding: 3px 5px;">N/A</td></tr>
                </table>
            </div>
            
            <!-- Investigators Section -->
            <div class="info-section">
                <h2>Investigators</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                    <tr style="background-color: #f0f0f0; font-weight: bold;">
                        <td style="border: 1px solid #000; padding: 6px; width: 25%;">Role</td>
                        <td style="border: 1px solid #000; padding: 6px; width: 25%;">Name</td>
                        <td style="border: 1px solid #000; padding: 6px; width: 30%;">Email</td>
                        <td style="border: 1px solid #000; padding: 6px; width: 20%;">Mobile</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px;">Principal Investigator</td>
                        <td style="border: 1px solid #000; padding: 6px;">{project.get('pi_name', 'N/A')}</td>
                        <td style="border: 1px solid #000; padding: 6px;">{project.get('pi_email', 'N/A')}</td>
                        <td style="border: 1px solid #000; padding: 6px;">{project.get('pi_mobile', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px;">Co-Pi</td>
                        <td style="border: 1px solid #000; padding: 6px;">{project.get('co_investigator', 'N/A')}</td>
                        <td style="border: 1px solid #000; padding: 6px;">{project.get('co_email', 'N/A')}</td>
                        <td style="border: 1px solid #000; padding: 6px;">{project.get('co_mobile', 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            <pdf:nextpage />
            
            <!-- Budget Allocation Section -->
            {PDFReportGenerator._build_budget_table_simple(budget_allocation, funds_expenditure)}
            
            <!-- Manpower & Equipment Breakdown -->
            {PDFReportGenerator._build_allocation_breakdowns_from_db(project)}
            
            <pdf:nextpage />
            
            <!-- Funds Received Section -->
            {PDFReportGenerator._build_funds_received_breakdown(data.get('funds_received', {}))}
            
            <pdf:nextpage />
            
            <!-- Expenditure Section -->
            {PDFReportGenerator._build_expenditure_breakdown(data.get('expenditures', {}))}
        """
        
        html += """
        </body>
        </html>
        """
        
        return html
    
    @staticmethod
    def _build_financial_summary(summary: Dict[str, Any]) -> str:
        """Build financial summary section"""
        
        return f"""
        <div class="section">
            <h2>FINANCIAL SUMMARY</h2>
            
            <table class="summary-grid">
                <tr>
                    <td style="width: 48%; vertical-align: top;">
                        <div class="summary-box">
                            <h3>Budget Overview</h3>
                            <table class="summary-table">
                                <tr>
                                    <td>Approved Budget:</td>
                                    <td class="amount">{PDFReportGenerator.format_currency(summary.get('total_budget', 0))}</td>
                                </tr>
                                <tr>
                                    <td>Committed:</td>
                                    <td class="amount">{PDFReportGenerator.format_currency(summary.get('total_committed', 0))}</td>
                                </tr>
                                <tr class="total-row">
                                    <td><strong>Balance:</strong></td>
                                    <td class="amount"><strong>{PDFReportGenerator.format_currency(summary.get('budget_balance', 0))}</strong></td>
                                </tr>
                                <tr>
                                    <td>Utilization:</td>
                                    <td class="amount">{PDFReportGenerator.format_percentage(summary.get('budget_utilization', 0))}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                    <td style="width: 4%;"></td>
                    <td style="width: 48%; vertical-align: top;">
                        <div class="summary-box">
                            <h3>Funds Overview</h3>
                            <table class="summary-table">
                                <tr>
                                    <td>Funds Received:</td>
                                    <td class="amount">{PDFReportGenerator.format_currency(summary.get('total_funds', 0))}</td>
                                </tr>
                                <tr>
                                    <td>Expenditure:</td>
                                    <td class="amount">{PDFReportGenerator.format_currency(summary.get('total_spent', 0))}</td>
                                </tr>
                                <tr class="total-row">
                                    <td><strong>Balance:</strong></td>
                                    <td class="amount"><strong>{PDFReportGenerator.format_currency(summary.get('funds_balance', 0))}</strong></td>
                                </tr>
                                <tr>
                                    <td>Utilization:</td>
                                    <td class="amount">{PDFReportGenerator.format_percentage(summary.get('funds_utilization', 0))}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
        """
    
    @staticmethod
    def _build_budget_table_simple(budget_data: list, funds_data: list) -> str:
        """Build simple budget allocation table"""
        
        if not budget_data or len(budget_data) == 0:
            return "<p>No budget data available.</p>"
        
        rows = ""
        for i, item in enumerate(budget_data):
            funds_item = funds_data[i] if i < len(funds_data) else {}
            
            allocated = float(item.get('approved_budget', 0) or 0)
            received = float(funds_item.get('funds_received', 0) or 0)
            spent = float(funds_item.get('spent', 0) or 0)
            balance = received - spent
            
            category = str(item.get('category', 'N/A')).title().replace('_', ' ')
            
            rows += f"""
            <tr>
                <td>{category}</td>
                <td style="text-align: right;">{PDFReportGenerator.format_currency(allocated)}</td>
                <td style="text-align: right;">{PDFReportGenerator.format_currency(received)}</td>
                <td style="text-align: right;">{PDFReportGenerator.format_currency(spent)}</td>
                <td style="text-align: right;">{PDFReportGenerator.format_currency(balance)}</td>
            </tr>
            """
        
        return f"""
        <div class="section">
            <h2>Budget Allocation By Head</h2>
            <table class="simple-table">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">HEAD</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">ALLOCATED</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">RECEIVED</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">EXPENDITURE</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">BALANCE</td>
                </tr>
                {rows}
            </table>
        </div>
        """
    
    @staticmethod
    def _build_allocation_breakdowns_from_db(project_data) -> str:
        """Build manpower and equipment allocation breakdown tables from data"""
        from app.database import get_db_connection
        
        project_id = project_data.get('project_id')
        if not project_id:
            return ""
        
        html = ""
        conn = None
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get manpower breakdown
            cursor.execute("""
                SELECT role, salary_per_month, months, num_personnel,
                       (salary_per_month * months * num_personnel) as total
                FROM manpower_allocation_breakdown
                WHERE project_id = %s
                ORDER BY role
            """, (project_id,))
            
            manpower_rows = cursor.fetchall()
            
            if manpower_rows and len(manpower_rows) > 0:
                manpower_html = ""
                for row in manpower_rows:
                    manpower_html += f"""
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px;">{row[0]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[1]))}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[2]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[3]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[4]))}</td>
                    </tr>
                    """
                
                html += f"""
                <div class="section">
                    <h2>Manpower Allocation Breakdown</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                        <tr style="background-color: #f0f0f0; font-weight: bold;">
                            <td style="border: 1px solid #000; padding: 6px;">ROLE</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">SALARY/MONTH</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">MONTHS</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">PERSONNEL</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL</td>
                        </tr>
                        {manpower_html}
                    </table>
                </div>
                """
            
            # Get equipment breakdown
            cursor.execute("""
                SELECT item_name, quantity, unit_cost,
                       (quantity * unit_cost) as total
                FROM equipment_allocation_breakdown
                WHERE project_id = %s
                ORDER BY item_name
            """, (project_id,))
            
            equipment_rows = cursor.fetchall()
            
            if equipment_rows and len(equipment_rows) > 0:
                equipment_html = ""
                for row in equipment_rows:
                    equipment_html += f"""
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px;">{row[0]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[1]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[2]))}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[3]))}</td>
                    </tr>
                    """
                
                html += f"""
                <div class="section">
                    <h2>Equipment Allocation Breakdown</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                        <tr style="background-color: #f0f0f0; font-weight: bold;">
                            <td style="border: 1px solid #000; padding: 6px;">ITEM</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">QUANTITY</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">UNIT COST</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL</td>
                        </tr>
                        {equipment_html}
                    </table>
                </div>
                """
            
            cursor.close()
            
        except Exception as e:
            print(f"Error fetching breakdown data: {e}")
        finally:
            if conn:
                conn.close()
        
        return html
        """Build manpower and equipment allocation breakdown tables from database"""
        from app.database import get_db_connection
        
        if not project_id:
            return ""
        
        html = ""
        conn = None
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get manpower breakdown
            cursor.execute("""
                SELECT role, salary_per_month, months, num_personnel,
                       (salary_per_month * months * num_personnel) as total
                FROM manpower_allocation_breakdown
                WHERE project_id = %s
                ORDER BY role
            """, (project_id,))
            
            manpower_rows = cursor.fetchall()
            
            if manpower_rows and len(manpower_rows) > 0:
                manpower_html = ""
                for row in manpower_rows:
                    manpower_html += f"""
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px;">{row[0]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[1]))}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[2]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[3]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[4]))}</td>
                    </tr>
                    """
                
                html += f"""
                <div class="section">
                    <h2>Manpower Allocation Breakdown</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                        <tr style="background-color: #f0f0f0; font-weight: bold;">
                            <td style="border: 1px solid #000; padding: 6px;">ROLE</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">SALARY/MONTH</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">MONTHS</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">PERSONNEL</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL</td>
                        </tr>
                        {manpower_html}
                    </table>
                </div>
                """
            
            # Get equipment breakdown
            cursor.execute("""
                SELECT item_name, quantity, unit_cost,
                       (quantity * unit_cost) as total
                FROM equipment_allocation_breakdown
                WHERE project_id = %s
                ORDER BY item_name
            """, (project_id,))
            
            equipment_rows = cursor.fetchall()
            
            if equipment_rows and len(equipment_rows) > 0:
                equipment_html = ""
                for row in equipment_rows:
                    equipment_html += f"""
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px;">{row[0]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[1]}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[2]))}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[3]))}</td>
                    </tr>
                    """
                
                html += f"""
                <div class="section">
                    <h2>Equipment Allocation Breakdown</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                        <tr style="background-color: #f0f0f0; font-weight: bold;">
                            <td style="border: 1px solid #000; padding: 6px;">ITEM</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">QUANTITY</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">UNIT COST</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL</td>
                        </tr>
                        {equipment_html}
                    </table>
                </div>
                """
            
            # Add page break before Funds Received section
            html += '<pdf:nextpage />'
            
            # FUNDS RECEIVED SECTION
            html += PDFReportGenerator._build_funds_received_breakdown(cursor, project_id)
            
            # Add page break before Expenditure section
            html += '<pdf:nextpage />'
            
            # EXPENDITURE SECTION
            html += PDFReportGenerator._build_expenditure_breakdown(cursor, project_id)
            
            cursor.close()
            
        except Exception as e:
            print(f"Error fetching breakdown data: {e}")
        finally:
            if conn:
                conn.close()
        
        return html
    
    @staticmethod
    def _build_funds_received_breakdown(data: Dict[str, list]) -> str:
        """Build detailed Funds Received section with breakdowns"""
        
        html = '<div class="section"><h2>Funds Received</h2>'
        
        grand_total = 0
        
        # Manpower Funds
        manpower_funds = data.get('manpower', [])
        
        if manpower_funds and len(manpower_funds) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Manpower</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Role</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Salary/Month</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Months</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Personnel</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Total</td>
                </tr>
            '''
            
            manpower_subtotal = 0
            for fund in manpower_funds:
                date_str = PDFReportGenerator.format_date(fund['date_received'])
                breakdown = fund.get('breakdown', {})
                amount = fund['amount']
                manpower_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{breakdown.get('role', 'N/A')}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(breakdown.get('salary_per_month', 0))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{breakdown.get('months', 0)}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{breakdown.get('num_personnel', 0)}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="5" style="border: 1px solid #000; padding: 6px;">Subtotal (Manpower)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(manpower_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += manpower_subtotal
        
        # Equipment Funds
        equipment_funds = data.get('equipment', [])
        
        if equipment_funds and len(equipment_funds) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Equipment</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Item</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Quantity</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Unit Cost</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Total</td>
                </tr>
            '''
            
            equipment_subtotal = 0
            for fund in equipment_funds:
                date_str = PDFReportGenerator.format_date(fund['date_received'])
                breakdown = fund.get('breakdown', {})
                amount = fund['amount']
                equipment_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{breakdown.get('item_name', 'N/A')}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{breakdown.get('quantity', 0)}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(breakdown.get('unit_cost', 0))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #000; padding: 6px;">Subtotal (Equipment)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(equipment_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += equipment_subtotal
        
        # Other budget heads (Consumables, Travel, Contingency, Overhead)
        for head in ['consumables', 'travel & training', 'contingency', 'overhead']:
            items = data.get(head, [])
            if items and len(items) > 0:
                head_total = sum(item['amount'] for item in items)
                display_name = head.title().replace('&', 'and')
                
                html += f'''
                <h3 style="margin-top: 10pt; margin-bottom: 5pt;">{display_name}</h3>
                <p style="padding-left: 15pt; margin: 5pt 0;">{PDFReportGenerator.format_currency(head_total)}</p>
                '''
                grand_total += head_total
        
        # Grand Total
        html += f'''
        <div style="margin-top: 15pt; padding: 10pt; background-color: #f0f0f0; border: 2px solid #000;">
            <p style="margin: 0; font-size: 12pt; font-weight: bold;">Total Funds Received</p>
            <p style="margin: 5pt 0 0 0; font-size: 11pt;">Across all budget heads</p>
            <p style="margin: 5pt 0 0 0; font-size: 14pt; font-weight: bold;">{PDFReportGenerator.format_currency(grand_total)}</p>
        </div>
        '''
        
        html += '</div>'
        return html
        """Build detailed Funds Received section with breakdowns"""
        
        html = '<div class="section"><h2>Funds Received</h2>'
        
        grand_total = 0
        
        # Manpower Funds
        cursor.execute("""
            SELECT mfb.date_received, mfb.role, mfb.salary_per_month, 
                   mfb.months, mfb.num_personnel, mfb.amount,
                   fr.date_received as fund_date
            FROM manpower_funds_breakdown mfb
            JOIN funds_received fr ON mfb.fund_id = fr.fund_id
            WHERE mfb.project_id = %s
            ORDER BY fr.date_received DESC
        """, (project_id,))
        
        manpower_funds = cursor.fetchall()
        
        if manpower_funds and len(manpower_funds) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Manpower</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Role</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Salary/Month</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Months</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Personnel</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Total</td>
                </tr>
            '''
            
            manpower_subtotal = 0
            for row in manpower_funds:
                date_str = PDFReportGenerator.format_date(row[0]) if row[0] else 'N/A'
                amount = float(row[5])
                manpower_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{row[1]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[2]))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[3]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[4]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="5" style="border: 1px solid #000; padding: 6px;">Subtotal (Manpower)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(manpower_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += manpower_subtotal
        
        # Equipment Funds
        cursor.execute("""
            SELECT efb.date_received, efb.item_name, efb.quantity, 
                   efb.unit_cost, efb.amount,
                   fr.date_received as fund_date
            FROM equipment_funds_breakdown efb
            JOIN funds_received fr ON efb.fund_id = fr.fund_id
            WHERE efb.project_id = %s
            ORDER BY fr.date_received DESC
        """, (project_id,))
        
        equipment_funds = cursor.fetchall()
        
        if equipment_funds and len(equipment_funds) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Equipment</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Item</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Quantity</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Unit Cost</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Total</td>
                </tr>
            '''
            
            equipment_subtotal = 0
            for row in equipment_funds:
                date_str = PDFReportGenerator.format_date(row[0]) if row[0] else 'N/A'
                amount = float(row[4])
                equipment_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{row[1]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[2]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[3]))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #000; padding: 6px;">Subtotal (Equipment)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(equipment_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += equipment_subtotal
        
        # Other budget heads (Consumables, Travel, Contingency, Overhead)
        cursor.execute("""
            SELECT head, SUM(amount) as total_amount
            FROM funds_received
            WHERE project_id = %s 
            AND head NOT IN ('manpower', 'equipment')
            GROUP BY head
            ORDER BY head
        """, (project_id,))
        
        other_funds = cursor.fetchall()
        
        for row in other_funds:
            head = row[0].title().replace('_', ' ')
            amount = float(row[1])
            grand_total += amount
            
            html += f'''
            <h3 style="margin-top: 10pt; margin-bottom: 5pt;">{head}</h3>
            <p style="padding-left: 15pt; margin: 5pt 0;">{PDFReportGenerator.format_currency(amount)}</p>
            '''
        
        # Grand Total
        html += f'''
        <div style="margin-top: 15pt; padding: 10pt; background-color: #f0f0f0; border: 2px solid #000;">
            <p style="margin: 0; font-size: 12pt; font-weight: bold;">Total Funds Received</p>
            <p style="margin: 5pt 0 0 0; font-size: 11pt;">Across all budget heads</p>
            <p style="margin: 5pt 0 0 0; font-size: 14pt; font-weight: bold;">{PDFReportGenerator.format_currency(grand_total)}</p>
        </div>
        '''
        
        html += '</div>'
        return html
    
    @staticmethod
    def _build_expenditure_breakdown(data: Dict[str, list]) -> str:
        """Build detailed Expenditure section with breakdowns"""
        
        html = '<div class="section"><h2>Expenditure</h2>'
        
        grand_total = 0
        
        # Manpower Expenditure
        manpower_exp = data.get('manpower', [])
        
        if manpower_exp and len(manpower_exp) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Manpower Expenditure</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Role</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Salary/Month</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Months</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Personnel</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Amount Spent</td>
                </tr>
            '''
            
            manpower_subtotal = 0
            for exp in manpower_exp:
                date_str = PDFReportGenerator.format_date(exp.get('date_incurred'))
                amount = exp['total_cost']
                manpower_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{exp.get('role', 'N/A')}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(exp.get('salary_per_month', 0))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{exp.get('months', 0)}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{exp.get('num_personnel', 0)}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="5" style="border: 1px solid #000; padding: 6px;">Subtotal (Manpower)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(manpower_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += manpower_subtotal
        
        # Equipment Expenditure
        equipment_exp = data.get('equipment', [])
        
        if equipment_exp and len(equipment_exp) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Equipment Expenditure</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Item</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Quantity</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Unit Cost</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Amount Spent</td>
                </tr>
            '''
            
            equipment_subtotal = 0
            for exp in equipment_exp:
                date_str = PDFReportGenerator.format_date(exp.get('purchase_date'))
                amount = exp['total_cost']
                equipment_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{exp.get('name', 'N/A')}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{exp.get('quantity', 0)}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(exp.get('unit_cost', 0))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #000; padding: 6px;">Subtotal (Equipment)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(equipment_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += equipment_subtotal
        
        # Other expenditures (from budget_expenditure table)
        for head in ['consumables', 'travel & training', 'contingency', 'overhead']:
            items = data.get(head, [])
            if items and len(items) > 0:
                head_total = sum(item['amount'] for item in items)
                display_name = head.title().replace('&', 'and') + ' Expenditure'
                
                html += f'''
                <h3 style="margin-top: 10pt; margin-bottom: 5pt;">{display_name}</h3>
                <p style="padding-left: 15pt; margin: 5pt 0;">{PDFReportGenerator.format_currency(head_total)}</p>
                '''
                grand_total += head_total
        
        # Grand Total
        html += f'''
        <div style="margin-top: 15pt; padding: 10pt; background-color: #f0f0f0; border: 2px solid #000;">
            <p style="margin: 0; font-size: 12pt; font-weight: bold;">Total Expenditure</p>
            <p style="margin: 5pt 0 0 0; font-size: 11pt;">Across all budget heads</p>
            <p style="margin: 5pt 0 0 0; font-size: 14pt; font-weight: bold;">{PDFReportGenerator.format_currency(grand_total)}</p>
        </div>
        '''
        
        html += '</div>'
        return html
        """Build detailed Expenditure section with breakdowns"""
        
        html = '<div class="section"><h2>Expenditure</h2>'
        
        grand_total = 0
        
        # Manpower Expenditure
        cursor.execute("""
            SELECT date_incurred, role, salary_per_month, months, 
                   num_personnel, total_cost
            FROM manpower
            WHERE project_id = %s
            ORDER BY date_incurred DESC
        """, (project_id,))
        
        manpower_exp = cursor.fetchall()
        
        if manpower_exp and len(manpower_exp) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Manpower Expenditure</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Role</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Salary/Month</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Months</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Personnel</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Amount Spent</td>
                </tr>
            '''
            
            manpower_subtotal = 0
            for row in manpower_exp:
                date_str = PDFReportGenerator.format_date(row[0]) if row[0] else 'N/A'
                amount = float(row[5])
                manpower_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{row[1]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[2]))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[3]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[4]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="5" style="border: 1px solid #000; padding: 6px;">Subtotal (Manpower)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(manpower_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += manpower_subtotal
        
        # Equipment Expenditure
        cursor.execute("""
            SELECT purchase_date, name, quantity, unit_cost, total_cost
            FROM equipment
            WHERE project_id = %s
            ORDER BY purchase_date DESC
        """, (project_id,))
        
        equipment_exp = cursor.fetchall()
        
        if equipment_exp and len(equipment_exp) > 0:
            html += '<h3 style="margin-top: 10pt; margin-bottom: 5pt;">Equipment Expenditure</h3>'
            html += '''
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #000; padding: 6px;">Date</td>
                    <td style="border: 1px solid #000; padding: 6px;">Item</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">Quantity</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Unit Cost</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">Amount Spent</td>
                </tr>
            '''
            
            equipment_subtotal = 0
            for row in equipment_exp:
                date_str = PDFReportGenerator.format_date(row[0]) if row[0] else 'N/A'
                amount = float(row[4])
                equipment_subtotal += amount
                
                html += f'''
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">{date_str}</td>
                    <td style="border: 1px solid #000; padding: 6px;">{row[1]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">{row[2]}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(float(row[3]))}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(amount)}</td>
                </tr>
                '''
            
            html += f'''
                <tr style="background-color: #e8e8e8; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #000; padding: 6px;">Subtotal (Equipment)</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">{PDFReportGenerator.format_currency(equipment_subtotal)}</td>
                </tr>
            </table>
            '''
            grand_total += equipment_subtotal
        
        # Other expenditures (from budget_expenditure table)
        cursor.execute("""
            SELECT head, SUM(amount) as total_amount
            FROM budget_expenditure
            WHERE project_id = %s
            GROUP BY head
            ORDER BY head
        """, (project_id,))
        
        other_exp = cursor.fetchall()
        
        for row in other_exp:
            head = row[0].title().replace('_', ' ')
            amount = float(row[1])
            grand_total += amount
            
            html += f'''
            <h3 style="margin-top: 10pt; margin-bottom: 5pt;">{head} Expenditure</h3>
            <p style="padding-left: 15pt; margin: 5pt 0;">{PDFReportGenerator.format_currency(amount)}</p>
            '''
        
        # Grand Total
        html += f'''
        <div style="margin-top: 15pt; padding: 10pt; background-color: #f0f0f0; border: 2px solid #000;">
            <p style="margin: 0; font-size: 12pt; font-weight: bold;">Total Expenditure</p>
            <p style="margin: 5pt 0 0 0; font-size: 11pt;">Across all budget heads</p>
            <p style="margin: 5pt 0 0 0; font-size: 14pt; font-weight: bold;">{PDFReportGenerator.format_currency(grand_total)}</p>
        </div>
        '''
        
        html += '</div>'
        return html
    
    @staticmethod
    def _build_funds_expenditure_table(funds_data: list) -> str:
        """Build funds and expenditure table"""
        
        if not funds_data or len(funds_data) == 0:
            return """
            <div class="section">
                <h2>FUNDS RECEIVED & EXPENDITURE BY CATEGORY</h2>
                <p>No funds or expenditure data available.</p>
            </div>
            """
        
        rows = ""
        total_received = 0
        total_spent = 0
        total_balance = 0
        
        for item in funds_data:
            received = float(item.get('funds_received', 0) or 0)
            spent = float(item.get('spent', 0) or 0)
            balance = float(item.get('balance', 0) or 0)
            utilization = (spent / received * 100) if received > 0 else 0
            
            total_received += received
            total_spent += spent
            total_balance += balance
            
            rows += f"""
            <tr>
                <td>{item.get('category', 'N/A')}</td>
                <td class="amount">{PDFReportGenerator.format_currency(received)}</td>
                <td class="amount">{PDFReportGenerator.format_currency(spent)}</td>
                <td class="amount">{PDFReportGenerator.format_currency(balance)}</td>
                <td class="amount">{PDFReportGenerator.format_percentage(utilization)}</td>
            </tr>
            """
        
        return f"""
        <div class="section">
            <h2>FUNDS RECEIVED & EXPENDITURE BY CATEGORY</h2>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Funds Received</th>
                        <th>Spent</th>
                        <th>Balance</th>
                        <th>Utilization %</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_currency(total_received)}</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_currency(total_spent)}</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_currency(total_balance)}</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_percentage((total_spent/total_received*100) if total_received > 0 else 0)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        """
    
    @staticmethod
    def _build_category_breakdown(budget_data: list, funds_data: list) -> str:
        """Build category-wise breakdown summary"""
        
        if not budget_data or len(budget_data) == 0:
            return """
            <div class="section">
                <h2>CATEGORY-WISE BREAKDOWN SUMMARY</h2>
                <p>No category breakdown data available.</p>
            </div>
            """
        
        html = '<div class="section"><h2>CATEGORY-WISE BREAKDOWN SUMMARY</h2>'
        
        for i, budget_item in enumerate(budget_data):
            category = budget_item.get('category', 'N/A')
            funds_item = funds_data[i] if i < len(funds_data) else {}
            
            html += f"""
            <div class="category-summary">
                <h3>{category}</h3>
                <p><strong>Budget - Approved:</strong> {PDFReportGenerator.format_currency(budget_item.get('approved_budget', 0) or 0)} | 
                <strong>Committed:</strong> {PDFReportGenerator.format_currency(budget_item.get('committed_amount', 0) or 0)} | 
                <strong>Balance:</strong> {PDFReportGenerator.format_currency(budget_item.get('balance', 0) or 0)}</p>
                <p><strong>Funds - Received:</strong> {PDFReportGenerator.format_currency(funds_item.get('funds_received', 0) or 0)} | 
                <strong>Spent:</strong> {PDFReportGenerator.format_currency(funds_item.get('spent', 0) or 0)} | 
                <strong>Balance:</strong> {PDFReportGenerator.format_currency(funds_item.get('balance', 0) or 0)}</p>
            </div>
            """
        
        html += '</div>'
        return html
    
    @staticmethod
    def _build_detailed_transactions(categories: Dict[str, list]) -> str:
        """Build detailed transaction tables for each category"""
        
        html = ""
        
        # Iterate through all categories
        for category_name, items in categories.items():
            if items and len(items) > 0:
                # Capitalize category name for display
                display_name = category_name.upper().replace('_', ' ').replace('&', 'AND')
                
                html += f'<div class="section"><h2>{display_name} DETAILS</h2>'
                html += '<table class="data-table"><thead><tr><th>Description</th><th>Amount</th><th>Date</th></tr></thead><tbody>'
                
                total = 0
                for item in items:
                    amount = float(item.get('amount', 0))
                    total += amount
                    html += f"""
                    <tr>
                        <td>{item.get('description', 'N/A')}</td>
                        <td class="amount">{PDFReportGenerator.format_currency(amount)}</td>
                        <td>{PDFReportGenerator.format_date(item.get('date_incurred'))}</td>
                    </tr>
                    """
                
                html += f"""
                    <tr class="total-row">
                        <td><strong>Total {display_name}</strong></td>
                        <td class="amount" colspan="2"><strong>{PDFReportGenerator.format_currency(total)}</strong></td>
                    </tr>
                """
                html += '</tbody></table></div>'
        
        return html
    
    @staticmethod
    def _get_css() -> str:
        """Return CSS styling for the PDF"""
        
        return """
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000000;
        }
        
        .main-title {
            font-size: 18pt;
            font-weight: bold;
            text-align: center;
            margin: 0 0 20pt 0;
            padding-bottom: 10pt;
            border-bottom: 2pt solid #000000;
        }
        
        .info-section {
            margin-bottom: 15pt;
        }
        
        .info-section h2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 0 0 8pt 0;
            padding: 4pt 0;
            border-bottom: 1pt solid #000000;
        }
        
        .info-section p {
            margin: 4pt 0;
            padding-left: 10pt;
        }
        
        .section {
            margin-top: 15pt;
            margin-bottom: 15pt;
        }
        
        .section h2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 0 0 8pt 0;
            padding: 4pt 0;
            border-bottom: 1pt solid #000000;
        }
        
        .simple-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8pt;
        }
        
        .simple-table td {
            border: 1px solid #000;
            padding: 6pt 8pt;
            font-size: 9pt;
        }
        """