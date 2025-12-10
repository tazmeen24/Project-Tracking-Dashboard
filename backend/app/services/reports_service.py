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
            SELECT p.*, u.name as pi_name
            FROM projects p
            LEFT JOIN users u ON p.pi_id = u.id
            WHERE p.id = %s
        """, (project_id,))
        project = cursor.fetchone()
        
        if not project:
            cursor.close()
            raise ValueError(f"Project {project_id} not found")
        
        # Get financial summary
        financial_summary = self._get_financial_summary(cursor, project_id)
        
        # Get budget allocation by category
        budget_allocation = self._get_budget_allocation(cursor, project_id)
        
        # Get funds and expenditure by category
        funds_expenditure = self._get_funds_expenditure(cursor, project_id)
        
        # Get detailed category data
        categories = self._get_category_details(cursor, project_id)
        
        cursor.close()
        
        return {
            'project': dict(project),
            'financial_summary': financial_summary,
            'budget_allocation': budget_allocation,
            'funds_expenditure': funds_expenditure,
            'categories': categories
        }
    
    def _get_financial_summary(self, cursor, project_id: int) -> Dict[str, Any]:
        """Get overall financial summary"""
        
        cursor.execute("""
            SELECT 
                COALESCE(SUM(approved_budget), 0) as total_budget,
                COALESCE(SUM(committed_amount), 0) as total_committed
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
        
        # Calculate total expenditure from all categories
        cursor.execute("""
            SELECT 
                COALESCE((SELECT SUM(salary) FROM manpower WHERE project_id = %s), 0) +
                COALESCE((SELECT SUM(cost) FROM equipment WHERE project_id = %s), 0) +
                COALESCE((SELECT SUM(amount) FROM consumables WHERE project_id = %s), 0) +
                COALESCE((SELECT SUM(amount) FROM travel WHERE project_id = %s), 0) +
                COALESCE((SELECT SUM(amount) FROM contingency WHERE project_id = %s), 0) +
                COALESCE((SELECT SUM(amount) FROM overhead WHERE project_id = %s), 0) as total_spent
        """, (project_id, project_id, project_id, project_id, project_id, project_id))
        spent_data = cursor.fetchone()
        
        total_budget = float(budget_data['total_budget'] or 0)
        total_committed = float(budget_data['total_committed'] or 0)
        total_funds = float(funds_data['total_funds'] or 0)
        total_spent = float(spent_data['total_spent'] or 0)
        
        budget_balance = total_budget - total_committed
        funds_balance = total_funds - total_spent
        
        budget_utilization = (total_committed / total_budget * 100) if total_budget > 0 else 0
        funds_utilization = (total_spent / total_funds * 100) if total_funds > 0 else 0
        
        return {
            'total_budget': total_budget,
            'total_committed': total_committed,
            'budget_balance': budget_balance,
            'budget_utilization': budget_utilization,
            'total_funds': total_funds,
            'total_spent': total_spent,
            'funds_balance': funds_balance,
            'funds_utilization': funds_utilization
        }
    
    def _get_budget_allocation(self, cursor, project_id: int) -> list:
        """Get budget allocation by category"""
        
        cursor.execute("""
            SELECT 
                category,
                approved_budget,
                committed_amount,
                (approved_budget - committed_amount) as balance,
                CASE 
                    WHEN approved_budget > 0 THEN (committed_amount / approved_budget * 100)
                    ELSE 0 
                END as utilization_percentage
            FROM budget_allocation
            WHERE project_id = %s
            ORDER BY 
                CASE category
                    WHEN 'Manpower' THEN 1
                    WHEN 'Equipment' THEN 2
                    WHEN 'Consumables' THEN 3
                    WHEN 'Travel' THEN 4
                    WHEN 'Contingency' THEN 5
                    WHEN 'Overhead' THEN 6
                    ELSE 7
                END
        """, (project_id,))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def _get_funds_expenditure(self, cursor, project_id: int) -> list:
        """Get funds received and expenditure by category"""
        
        cursor.execute("""
            SELECT 
                ba.category,
                COALESCE(fr.amount, 0) as funds_received,
                CASE ba.category
                    WHEN 'Manpower' THEN COALESCE((SELECT SUM(salary) FROM manpower WHERE project_id = ba.project_id), 0)
                    WHEN 'Equipment' THEN COALESCE((SELECT SUM(cost) FROM equipment WHERE project_id = ba.project_id), 0)
                    WHEN 'Consumables' THEN COALESCE((SELECT SUM(amount) FROM consumables WHERE project_id = ba.project_id), 0)
                    WHEN 'Travel' THEN COALESCE((SELECT SUM(amount) FROM travel WHERE project_id = ba.project_id), 0)
                    WHEN 'Contingency' THEN COALESCE((SELECT SUM(amount) FROM contingency WHERE project_id = ba.project_id), 0)
                    WHEN 'Overhead' THEN COALESCE((SELECT SUM(amount) FROM overhead WHERE project_id = ba.project_id), 0)
                    ELSE 0
                END as spent,
                COALESCE(fr.amount, 0) - CASE ba.category
                    WHEN 'Manpower' THEN COALESCE((SELECT SUM(salary) FROM manpower WHERE project_id = ba.project_id), 0)
                    WHEN 'Equipment' THEN COALESCE((SELECT SUM(cost) FROM equipment WHERE project_id = ba.project_id), 0)
                    WHEN 'Consumables' THEN COALESCE((SELECT SUM(amount) FROM consumables WHERE project_id = ba.project_id), 0)
                    WHEN 'Travel' THEN COALESCE((SELECT SUM(amount) FROM travel WHERE project_id = ba.project_id), 0)
                    WHEN 'Contingency' THEN COALESCE((SELECT SUM(amount) FROM contingency WHERE project_id = ba.project_id), 0)
                    WHEN 'Overhead' THEN COALESCE((SELECT SUM(amount) FROM overhead WHERE project_id = ba.project_id), 0)
                    ELSE 0
                END as balance
            FROM budget_allocation ba
            LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.category = fr.category
            WHERE ba.project_id = %s
            ORDER BY 
                CASE ba.category
                    WHEN 'Manpower' THEN 1
                    WHEN 'Equipment' THEN 2
                    WHEN 'Consumables' THEN 3
                    WHEN 'Travel' THEN 4
                    WHEN 'Contingency' THEN 5
                    WHEN 'Overhead' THEN 6
                    ELSE 7
                END
        """, (project_id,))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def _get_category_details(self, cursor, project_id: int) -> Dict[str, list]:
        """Get detailed transaction data for all categories"""
        
        categories = {}
        
        # Manpower
        cursor.execute("""
            SELECT name, designation, salary, from_date, to_date
            FROM manpower
            WHERE project_id = %s
            ORDER BY from_date DESC
        """, (project_id,))
        categories['manpower'] = [dict(row) for row in cursor.fetchall()]
        
        # Equipment
        cursor.execute("""
            SELECT item_name, cost, purchase_date, vendor
            FROM equipment
            WHERE project_id = %s
            ORDER BY purchase_date DESC
        """, (project_id,))
        categories['equipment'] = [dict(row) for row in cursor.fetchall()]
        
        # Consumables
        cursor.execute("""
            SELECT item_name, amount, purchase_date, vendor
            FROM consumables
            WHERE project_id = %s
            ORDER BY purchase_date DESC
        """, (project_id,))
        categories['consumables'] = [dict(row) for row in cursor.fetchall()]
        
        # Travel
        cursor.execute("""
            SELECT traveler_name, destination, amount, travel_date, purpose
            FROM travel
            WHERE project_id = %s
            ORDER BY travel_date DESC
        """, (project_id,))
        categories['travel'] = [dict(row) for row in cursor.fetchall()]
        
        # Contingency
        cursor.execute("""
            SELECT description, amount, expense_date
            FROM contingency
            WHERE project_id = %s
            ORDER BY expense_date DESC
        """, (project_id,))
        categories['contingency'] = [dict(row) for row in cursor.fetchall()]
        
        # Overhead
        cursor.execute("""
            SELECT description, amount, expense_date
            FROM overhead
            WHERE project_id = %s
            ORDER BY expense_date DESC
        """, (project_id,))
        categories['overhead'] = [dict(row) for row in cursor.fetchall()]
        
        return categories
    
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
        """Format currency in Indian Lakhs format"""
        if amount is None or amount == 0:
            return "₹0.00 L"
        lakhs = amount / 100000
        return f"₹{lakhs:,.2f} L"
    
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
        
        # Start HTML with embedded CSS
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Project Report - {project.get('project_id', '')}</title>
            <style>
                {PDFReportGenerator._get_css()}
            </style>
        </head>
        <body>
            <!-- Page 1: Cover & Summary -->
            <div class="page">
                <div class="header-section">
                    <h1 class="report-title">PROJECT FINANCIAL REPORT</h1>
                    <div class="project-info">
                        <p><strong>Project:</strong> {project.get('title', 'N/A')}</p>
                        <p><strong>Project ID:</strong> {project.get('project_id', 'N/A')}</p>
                        <p><strong>Principal Investigator:</strong> {project.get('pi_name', 'N/A')}</p>
                        <p><strong>Department:</strong> {project.get('department', 'N/A')}</p>
                        <p><strong>Duration:</strong> {PDFReportGenerator.format_date(project.get('start_date'))} to {PDFReportGenerator.format_date(project.get('end_date'))}</p>
                        <p><strong>Report Generated:</strong> {datetime.now().strftime("%d-%b-%Y %I:%M %p")}</p>
                    </div>
                </div>
        """
        
        # Financial Summary Section
        if sections.get('financial_summary', True):
            html += PDFReportGenerator._build_financial_summary(financial_summary)
        
        html += "</div>"  # Close page 1
        
        # Page 2: Budget Allocation
        if sections.get('budget_allocation', True) and budget_allocation:
            html += '<pdf:nextpage />'
            html += '<div class="page">'
            html += PDFReportGenerator._build_budget_allocation_table(budget_allocation)
            html += '</div>'
        
        # Page 3: Funds & Expenditure
        if sections.get('funds_expenditure', True) and funds_expenditure:
            html += '<pdf:nextpage />'
            html += '<div class="page">'
            html += PDFReportGenerator._build_funds_expenditure_table(funds_expenditure)
            html += '</div>'
        
        # Detailed Category Breakdown
        if sections.get('category_breakdown', True):
            html += '<pdf:nextpage />'
            html += PDFReportGenerator._build_category_breakdown(budget_allocation, funds_expenditure)
        
        # Detailed Transactions
        if sections.get('detailed_transactions', False):
            html += PDFReportGenerator._build_detailed_transactions(categories)
        
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
    def _build_budget_allocation_table(budget_data: list) -> str:
        """Build budget allocation table"""
        
        rows = ""
        total_approved = 0
        total_committed = 0
        total_balance = 0
        
        for item in budget_data:
            approved = float(item.get('approved_budget', 0))
            committed = float(item.get('committed_amount', 0))
            balance = float(item.get('balance', 0))
            utilization = float(item.get('utilization_percentage', 0))
            
            total_approved += approved
            total_committed += committed
            total_balance += balance
            
            rows += f"""
            <tr>
                <td>{item.get('category', 'N/A')}</td>
                <td class="amount">{PDFReportGenerator.format_currency(approved)}</td>
                <td class="amount">{PDFReportGenerator.format_currency(committed)}</td>
                <td class="amount">{PDFReportGenerator.format_currency(balance)}</td>
                <td class="amount">{PDFReportGenerator.format_percentage(utilization)}</td>
            </tr>
            """
        
        return f"""
        <div class="section">
            <h2>BUDGET ALLOCATION BY CATEGORY</h2>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Approved Budget</th>
                        <th>Committed</th>
                        <th>Balance</th>
                        <th>Utilization %</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_currency(total_approved)}</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_currency(total_committed)}</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_currency(total_balance)}</strong></td>
                        <td class="amount"><strong>{PDFReportGenerator.format_percentage((total_committed/total_approved*100) if total_approved > 0 else 0)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        """
    
    @staticmethod
    def _build_funds_expenditure_table(funds_data: list) -> str:
        """Build funds and expenditure table"""
        
        rows = ""
        total_received = 0
        total_spent = 0
        total_balance = 0
        
        for item in funds_data:
            received = float(item.get('funds_received', 0))
            spent = float(item.get('spent', 0))
            balance = float(item.get('balance', 0))
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
        
        html = '<div class="page"><div class="section"><h2>CATEGORY-WISE BREAKDOWN SUMMARY</h2>'
        
        for i, budget_item in enumerate(budget_data):
            category = budget_item.get('category', 'N/A')
            funds_item = funds_data[i] if i < len(funds_data) else {}
            
            html += f"""
            <div class="category-summary">
                <h3>{category}</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 48%; vertical-align: top;">
                            <p><strong>Budget:</strong></p>
                            <p>Approved: {PDFReportGenerator.format_currency(budget_item.get('approved_budget', 0))}</p>
                            <p>Committed: {PDFReportGenerator.format_currency(budget_item.get('committed_amount', 0))}</p>
                            <p>Balance: {PDFReportGenerator.format_currency(budget_item.get('balance', 0))}</p>
                        </td>
                        <td style="width: 4%;"></td>
                        <td style="width: 48%; vertical-align: top;">
                            <p><strong>Funds & Expenditure:</strong></p>
                            <p>Received: {PDFReportGenerator.format_currency(funds_item.get('funds_received', 0))}</p>
                            <p>Spent: {PDFReportGenerator.format_currency(funds_item.get('spent', 0))}</p>
                            <p>Balance: {PDFReportGenerator.format_currency(funds_item.get('balance', 0))}</p>
                        </td>
                    </tr>
                </table>
            </div>
            """
        
        html += '</div></div>'
        return html
    
    @staticmethod
    def _build_detailed_transactions(categories: Dict[str, list]) -> str:
        """Build detailed transaction tables for each category"""
        
        html = ""
        
        # Manpower
        if categories.get('manpower'):
            html += '<pdf:nextpage /><div class="page"><div class="section"><h2>MANPOWER DETAILS</h2>'
            html += '<table class="data-table"><thead><tr><th>Name</th><th>Designation</th><th>Salary</th><th>From Date</th><th>To Date</th></tr></thead><tbody>'
            
            total = 0
            for item in categories['manpower']:
                salary = float(item.get('salary', 0))
                total += salary
                html += f"""
                <tr>
                    <td>{item.get('name', 'N/A')}</td>
                    <td>{item.get('designation', 'N/A')}</td>
                    <td class="amount">{PDFReportGenerator.format_currency(salary)}</td>
                    <td>{PDFReportGenerator.format_date(item.get('from_date'))}</td>
                    <td>{PDFReportGenerator.format_date(item.get('to_date'))}</td>
                </tr>
                """
            
            html += f"""
                <tr class="total-row">
                    <td colspan="2"><strong>Total Manpower</strong></td>
                    <td class="amount" colspan="3"><strong>{PDFReportGenerator.format_currency(total)}</strong></td>
                </tr>
            """
            html += '</tbody></table></div></div>'
        
        # Equipment
        if categories.get('equipment'):
            html += '<pdf:nextpage /><div class="page"><div class="section"><h2>EQUIPMENT DETAILS</h2>'
            html += '<table class="data-table"><thead><tr><th>Item Name</th><th>Cost</th><th>Purchase Date</th><th>Vendor</th></tr></thead><tbody>'
            
            total = 0
            for item in categories['equipment']:
                cost = float(item.get('cost', 0))
                total += cost
                html += f"""
                <tr>
                    <td>{item.get('item_name', 'N/A')}</td>
                    <td class="amount">{PDFReportGenerator.format_currency(cost)}</td>
                    <td>{PDFReportGenerator.format_date(item.get('purchase_date'))}</td>
                    <td>{item.get('vendor', 'N/A')}</td>
                </tr>
                """
            
            html += f"""
                <tr class="total-row">
                    <td><strong>Total Equipment</strong></td>
                    <td class="amount" colspan="3"><strong>{PDFReportGenerator.format_currency(total)}</strong></td>
                </tr>
            """
            html += '</tbody></table></div></div>'
        
        # Similar blocks for other categories (Consumables, Travel, Contingency, Overhead)
        # ... (continuing with same pattern)
        
        return html
    
    @staticmethod
    def _get_css() -> str:
        """Return CSS styling for the PDF"""
        
        return """
        @page {
            size: A4;
            margin: 2.54cm;
        }
        
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
            color: #1a1a1a;
        }
        
        .page {
            page-break-after: always;
        }
        
        .header-section {
            margin-bottom: 30pt;
        }
        
        .report-title {
            font-size: 20pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20pt;
            color: #000000;
        }
        
        .project-info {
            background-color: #f8f9fa;
            padding: 15pt;
            border-radius: 4pt;
        }
        
        .project-info p {
            margin: 6pt 0;
            font-size: 11pt;
        }
        
        .section {
            margin-top: 20pt;
        }
        
        h2 {
            font-size: 14pt;
            font-weight: bold;
            color: #000000;
            margin-bottom: 12pt;
            border-bottom: 2pt solid #1e40af;
            padding-bottom: 4pt;
        }
        
        h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #000000;
            margin: 10pt 0 6pt 0;
        }
        
        .summary-grid {
            width: 100%;
            margin-top: 15pt;
            border-collapse: collapse;
        }
        
        .summary-box {
            background-color: #f8f9fa;
            padding: 15pt;
            border-radius: 4pt;
            border: 1pt solid #d1d5db;
        }
        
        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .summary-table td {
            padding: 6pt 8pt;
            font-size: 11pt;
        }
        
        .summary-table .amount {
            text-align: right;
            font-weight: bold;
        }
        
        .summary-table .total-row {
            border-top: 1pt solid #666666;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10pt;
        }
        
        .data-table thead {
            background-color: #f0f0f0;
        }
        
        .data-table th {
            padding: 8pt;
            text-align: left;
            font-weight: bold;
            font-size: 11pt;
            border: 1pt solid #cccccc;
        }
        
        .data-table td {
            padding: 8pt;
            font-size: 10pt;
            border: 1pt solid #d1d5db;
        }
        
        .data-table tbody tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        .data-table .amount {
            text-align: right;
        }
        
        .data-table .total-row {
            background-color: #e5e7eb;
            font-weight: bold;
        }
        
        .category-summary {
            margin-bottom: 20pt;
            padding: 12pt;
            background-color: #f8f9fa;
            border-left: 3pt solid #1e40af;
        }
        
        .category-summary p {
            margin: 4pt 0;
            font-size: 10pt;
        }
        """