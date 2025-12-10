# backend/app/services/excel_service.py
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime
import tempfile
from typing import Dict, Any

class ExcelReportGenerator:
    """Handles Excel report generation"""
    
    @staticmethod
    def format_currency(amount: float) -> float:
        """Return amount in Lakhs"""
        if amount is None:
            return 0.0
        return round(amount / 100000, 2)
    
    @staticmethod
    def format_date(date_value) -> str:
        """Format date to DD-MMM-YYYY"""
        if not date_value:
            return ""
        try:
            if isinstance(date_value, str):
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            else:
                dt = date_value
            return dt.strftime("%d-%b-%Y")
        except:
            return str(date_value)
    
    @staticmethod
    def generate_excel(project_data: Dict[str, Any], include_sections: Dict[str, bool]) -> str:
        """Generate Excel report and return file path"""
        
        wb = Workbook()
        
        # Remove default sheet
        if 'Sheet' in wb.sheetnames:
            wb.remove(wb['Sheet'])
        
        # Create sheets based on included sections
        if include_sections.get('financial_summary', True):
            ExcelReportGenerator._create_summary_sheet(wb, project_data)
        
        if include_sections.get('budget_allocation', True):
            ExcelReportGenerator._create_budget_sheet(wb, project_data)
        
        if include_sections.get('funds_expenditure', True):
            ExcelReportGenerator._create_funds_sheet(wb, project_data)
        
        if include_sections.get('detailed_transactions', False):
            ExcelReportGenerator._create_transaction_sheets(wb, project_data)
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx', dir='/tmp')
        temp_path = temp_file.name
        temp_file.close()
        
        wb.save(temp_path)
        return temp_path
    
    @staticmethod
    def _create_summary_sheet(wb: Workbook, data: Dict[str, Any]):
        """Create Summary sheet"""
        
        ws = wb.create_sheet("Summary", 0)
        project = data.get('project', {})
        summary = data.get('financial_summary', {})
        
        # Title
        ws['A1'] = "PROJECT FINANCIAL REPORT"
        ws['A1'].font = Font(size=16, bold=True)
        ws.merge_cells('A1:D1')
        
        # Project Information
        row = 3
        ws[f'A{row}'] = "Project:"
        ws[f'B{row}'] = project.get('title', 'N/A')
        ws[f'A{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Project ID:"
        ws[f'B{row}'] = project.get('project_id', 'N/A')
        ws[f'A{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Principal Investigator:"
        ws[f'B{row}'] = project.get('pi_name', 'N/A')
        ws[f'A{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Department:"
        ws[f'B{row}'] = project.get('department', 'N/A')
        ws[f'A{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Duration:"
        ws[f'B{row}'] = f"{ExcelReportGenerator.format_date(project.get('start_date'))} to {ExcelReportGenerator.format_date(project.get('end_date'))}"
        ws[f'A{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Report Generated:"
        ws[f'B{row}'] = datetime.now().strftime("%d-%b-%Y %I:%M %p")
        ws[f'A{row}'].font = Font(bold=True)
        
        # Financial Summary
        row += 3
        ws[f'A{row}'] = "FINANCIAL SUMMARY"
        ws[f'A{row}'].font = Font(size=14, bold=True)
        ws.merge_cells(f'A{row}:D{row}')
        
        # Budget Overview
        row += 2
        ws[f'A{row}'] = "Budget Overview"
        ws[f'A{row}'].font = Font(bold=True, size=12)
        ws[f'A{row}'].fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
        ws.merge_cells(f'A{row}:B{row}')
        
        row += 1
        ws[f'A{row}'] = "Approved Budget (Lakhs):"
        ws[f'B{row}'] = ExcelReportGenerator.format_currency(summary.get('total_budget', 0))
        ws[f'B{row}'].number_format = '₹#,##0.00'
        
        row += 1
        ws[f'A{row}'] = "Committed (Lakhs):"
        ws[f'B{row}'] = ExcelReportGenerator.format_currency(summary.get('total_committed', 0))
        ws[f'B{row}'].number_format = '₹#,##0.00'
        
        row += 1
        ws[f'A{row}'] = "Balance (Lakhs):"
        ws[f'B{row}'] = ExcelReportGenerator.format_currency(summary.get('budget_balance', 0))
        ws[f'B{row}'].number_format = '₹#,##0.00'
        ws[f'A{row}'].font = Font(bold=True)
        ws[f'B{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Utilization (%):"
        ws[f'B{row}'] = round(summary.get('budget_utilization', 0), 2)
        ws[f'B{row}'].number_format = '0.00"%"'
        
        # Funds Overview
        row += 2
        ws[f'A{row}'] = "Funds Overview"
        ws[f'A{row}'].font = Font(bold=True, size=12)
        ws[f'A{row}'].fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
        ws.merge_cells(f'A{row}:B{row}')
        
        row += 1
        ws[f'A{row}'] = "Funds Received (Lakhs):"
        ws[f'B{row}'] = ExcelReportGenerator.format_currency(summary.get('total_funds', 0))
        ws[f'B{row}'].number_format = '₹#,##0.00'
        
        row += 1
        ws[f'A{row}'] = "Expenditure (Lakhs):"
        ws[f'B{row}'] = ExcelReportGenerator.format_currency(summary.get('total_spent', 0))
        ws[f'B{row}'].number_format = '₹#,##0.00'
        
        row += 1
        ws[f'A{row}'] = "Balance (Lakhs):"
        ws[f'B{row}'] = ExcelReportGenerator.format_currency(summary.get('funds_balance', 0))
        ws[f'B{row}'].number_format = '₹#,##0.00'
        ws[f'A{row}'].font = Font(bold=True)
        ws[f'B{row}'].font = Font(bold=True)
        
        row += 1
        ws[f'A{row}'] = "Utilization (%):"
        ws[f'B{row}'] = round(summary.get('funds_utilization', 0), 2)
        ws[f'B{row}'].number_format = '0.00"%"'
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 20
    
    @staticmethod
    def _create_budget_sheet(wb: Workbook, data: Dict[str, Any]):
        """Create Budget Allocation sheet"""
        
        ws = wb.create_sheet("Budget Allocation")
        budget_data = data.get('budget_allocation', [])
        
        # Title
        ws['A1'] = "BUDGET ALLOCATION BY CATEGORY"
        ws['A1'].font = Font(size=14, bold=True)
        ws.merge_cells('A1:E1')
        
        # Headers
        headers = ['Category', 'Approved Budget (Lakhs)', 'Committed (Lakhs)', 'Balance (Lakhs)', 'Utilization (%)']
        header_row = 3
        
        # Style for headers
        header_fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
        header_font = Font(bold=True)
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=header_row, column=col)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center')
        
        # Data rows
        row = header_row + 1
        total_approved = 0
        total_committed = 0
        total_balance = 0
        
        for item in budget_data:
            approved = ExcelReportGenerator.format_currency(item.get('approved_budget', 0))
            committed = ExcelReportGenerator.format_currency(item.get('committed_amount', 0))
            balance = ExcelReportGenerator.format_currency(item.get('balance', 0))
            utilization = round(item.get('utilization_percentage', 0), 2)
            
            total_approved += approved
            total_committed += committed
            total_balance += balance
            
            ws[f'A{row}'] = item.get('category', 'N/A')
            ws[f'B{row}'] = approved
            ws[f'C{row}'] = committed
            ws[f'D{row}'] = balance
            ws[f'E{row}'] = utilization
            
            # Formatting
            for col in range(1, 6):
                cell = ws.cell(row=row, column=col)
                cell.border = thin_border
            
            ws[f'B{row}'].number_format = '₹#,##0.00'
            ws[f'C{row}'].number_format = '₹#,##0.00'
            ws[f'D{row}'].number_format = '₹#,##0.00'
            ws[f'E{row}'].number_format = '0.00"%"'
            
            row += 1
        
        # Total row
        ws[f'A{row}'] = "TOTAL"
        ws[f'B{row}'] = total_approved
        ws[f'C{row}'] = total_committed
        ws[f'D{row}'] = total_balance
        ws[f'E{row}'] = round((total_committed / total_approved * 100) if total_approved > 0 else 0, 2)
        
        # Style total row
        total_fill = PatternFill(start_color="E5E7EB", end_color="E5E7EB", fill_type="solid")
        for col in range(1, 6):
            cell = ws.cell(row=row, column=col)
            cell.font = Font(bold=True)
            cell.fill = total_fill
            cell.border = thin_border
        
        ws[f'B{row}'].number_format = '₹#,##0.00'
        ws[f'C{row}'].number_format = '₹#,##0.00'
        ws[f'D{row}'].number_format = '₹#,##0.00'
        ws[f'E{row}'].number_format = '0.00"%"'
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 25
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 20
        ws.column_dimensions['E'].width = 18
    
    @staticmethod
    def _create_funds_sheet(wb: Workbook, data: Dict[str, Any]):
        """Create Funds & Expenditure sheet"""
        
        ws = wb.create_sheet("Funds & Expenditure")
        funds_data = data.get('funds_expenditure', [])
        
        # Title
        ws['A1'] = "FUNDS RECEIVED & EXPENDITURE BY CATEGORY"
        ws['A1'].font = Font(size=14, bold=True)
        ws.merge_cells('A1:E1')
        
        # Headers
        headers = ['Category', 'Funds Received (Lakhs)', 'Spent (Lakhs)', 'Balance (Lakhs)', 'Utilization (%)']
        header_row = 3
        
        # Style for headers
        header_fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
        header_font = Font(bold=True)
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=header_row, column=col)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center')
        
        # Data rows
        row = header_row + 1
        total_received = 0
        total_spent = 0
        total_balance = 0
        
        for item in funds_data:
            received = ExcelReportGenerator.format_currency(item.get('funds_received', 0))
            spent = ExcelReportGenerator.format_currency(item.get('spent', 0))
            balance = ExcelReportGenerator.format_currency(item.get('balance', 0))
            utilization = round((spent / received * 100) if received > 0 else 0, 2)
            
            total_received += received
            total_spent += spent
            total_balance += balance
            
            ws[f'A{row}'] = item.get('category', 'N/A')
            ws[f'B{row}'] = received
            ws[f'C{row}'] = spent
            ws[f'D{row}'] = balance
            ws[f'E{row}'] = utilization
            
            # Formatting
            for col in range(1, 6):
                cell = ws.cell(row=row, column=col)
                cell.border = thin_border
            
            ws[f'B{row}'].number_format = '₹#,##0.00'
            ws[f'C{row}'].number_format = '₹#,##0.00'
            ws[f'D{row}'].number_format = '₹#,##0.00'
            ws[f'E{row}'].number_format = '0.00"%"'
            
            row += 1
        
        # Total row
        ws[f'A{row}'] = "TOTAL"
        ws[f'B{row}'] = total_received
        ws[f'C{row}'] = total_spent
        ws[f'D{row}'] = total_balance
        ws[f'E{row}'] = round((total_spent / total_received * 100) if total_received > 0 else 0, 2)
        
        # Style total row
        total_fill = PatternFill(start_color="E5E7EB", end_color="E5E7EB", fill_type="solid")
        for col in range(1, 6):
            cell = ws.cell(row=row, column=col)
            cell.font = Font(bold=True)
            cell.fill = total_fill
            cell.border = thin_border
        
        ws[f'B{row}'].number_format = '₹#,##0.00'
        ws[f'C{row}'].number_format = '₹#,##0.00'
        ws[f'D{row}'].number_format = '₹#,##0.00'
        ws[f'E{row}'].number_format = '0.00"%"'
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 25
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 20
        ws.column_dimensions['E'].width = 18
    
    @staticmethod
    def _create_transaction_sheets(wb: Workbook, data: Dict[str, Any]):
        """Create detailed transaction sheets for each category"""
        
        categories = data.get('categories', {})
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Manpower
        if categories.get('manpower'):
            ws = wb.create_sheet("Manpower Details")
            ws['A1'] = "MANPOWER DETAILS"
            ws['A1'].font = Font(size=14, bold=True)
            ws.merge_cells('A1:E1')
            
            headers = ['Name', 'Designation', 'Salary (Lakhs)', 'From Date', 'To Date']
            for col, header in enumerate(headers, start=1):
                cell = ws.cell(row=3, column=col)
                cell.value = header
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
                cell.border = thin_border
            
            row = 4
            total = 0
            for item in categories['manpower']:
                salary = ExcelReportGenerator.format_currency(item.get('salary', 0))
                total += salary
                
                ws[f'A{row}'] = item.get('name', 'N/A')
                ws[f'B{row}'] = item.get('designation', 'N/A')
                ws[f'C{row}'] = salary
                ws[f'D{row}'] = ExcelReportGenerator.format_date(item.get('from_date'))
                ws[f'E{row}'] = ExcelReportGenerator.format_date(item.get('to_date'))
                
                for col in range(1, 6):
                    ws.cell(row=row, column=col).border = thin_border
                ws[f'C{row}'].number_format = '₹#,##0.00'
                
                row += 1
            
            # Total
            ws[f'A{row}'] = "TOTAL"
            ws[f'C{row}'] = total
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'C{row}'].font = Font(bold=True)
            ws[f'C{row}'].number_format = '₹#,##0.00'
            
            ws.column_dimensions['A'].width = 25
            ws.column_dimensions['B'].width = 25
            ws.column_dimensions['C'].width = 20
            ws.column_dimensions['D'].width = 15
            ws.column_dimensions['E'].width = 15
        
        # Equipment
        if categories.get('equipment'):
            ws = wb.create_sheet("Equipment Details")
            ws['A1'] = "EQUIPMENT DETAILS"
            ws['A1'].font = Font(size=14, bold=True)
            ws.merge_cells('A1:D1')
            
            headers = ['Item Name', 'Cost (Lakhs)', 'Purchase Date', 'Vendor']
            for col, header in enumerate(headers, start=1):
                cell = ws.cell(row=3, column=col)
                cell.value = header
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
                cell.border = thin_border
            
            row = 4
            total = 0
            for item in categories['equipment']:
                cost = ExcelReportGenerator.format_currency(item.get('cost', 0))
                total += cost
                
                ws[f'A{row}'] = item.get('item_name', 'N/A')
                ws[f'B{row}'] = cost
                ws[f'C{row}'] = ExcelReportGenerator.format_date(item.get('purchase_date'))
                ws[f'D{row}'] = item.get('vendor', 'N/A')
                
                for col in range(1, 5):
                    ws.cell(row=row, column=col).border = thin_border
                ws[f'B{row}'].number_format = '₹#,##0.00'
                
                row += 1
            
            # Total
            ws[f'A{row}'] = "TOTAL"
            ws[f'B{row}'] = total
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'B{row}'].font = Font(bold=True)
            ws[f'B{row}'].number_format = '₹#,##0.00'
            
            ws.column_dimensions['A'].width = 30
            ws.column_dimensions['B'].width = 20
            ws.column_dimensions['C'].width = 18
            ws.column_dimensions['D'].width = 25
        
        # Consumables
        if categories.get('consumables'):
            ws = wb.create_sheet("Consumables Details")
            ws['A1'] = "CONSUMABLES DETAILS"
            ws['A1'].font = Font(size=14, bold=True)
            ws.merge_cells('A1:D1')
            
            headers = ['Item Name', 'Amount (Lakhs)', 'Purchase Date', 'Vendor']
            for col, header in enumerate(headers, start=1):
                cell = ws.cell(row=3, column=col)
                cell.value = header
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
                cell.border = thin_border
            
            row = 4
            total = 0
            for item in categories['consumables']:
                amount = ExcelReportGenerator.format_currency(item.get('amount', 0))
                total += amount
                
                ws[f'A{row}'] = item.get('item_name', 'N/A')
                ws[f'B{row}'] = amount
                ws[f'C{row}'] = ExcelReportGenerator.format_date(item.get('purchase_date'))
                ws[f'D{row}'] = item.get('vendor', 'N/A')
                
                for col in range(1, 5):
                    ws.cell(row=row, column=col).border = thin_border
                ws[f'B{row}'].number_format = '₹#,##0.00'
                
                row += 1
            
            # Total
            ws[f'A{row}'] = "TOTAL"
            ws[f'B{row}'] = total
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'B{row}'].font = Font(bold=True)
            ws[f'B{row}'].number_format = '₹#,##0.00'
            
            ws.column_dimensions['A'].width = 30
            ws.column_dimensions['B'].width = 20
            ws.column_dimensions['C'].width = 18
            ws.column_dimensions['D'].width = 25
        
        # Travel
        if categories.get('travel'):
            ws = wb.create_sheet("Travel Details")
            ws['A1'] = "TRAVEL DETAILS"
            ws['A1'].font = Font(size=14, bold=True)
            ws.merge_cells('A1:E1')
            
            headers = ['Traveler', 'Destination', 'Amount (Lakhs)', 'Date', 'Purpose']
            for col, header in enumerate(headers, start=1):
                cell = ws.cell(row=3, column=col)
                cell.value = header
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
                cell.border = thin_border
            
            row = 4
            total = 0
            for item in categories['travel']:
                amount = ExcelReportGenerator.format_currency(item.get('amount', 0))
                total += amount
                
                ws[f'A{row}'] = item.get('traveler_name', 'N/A')
                ws[f'B{row}'] = item.get('destination', 'N/A')
                ws[f'C{row}'] = amount
                ws[f'D{row}'] = ExcelReportGenerator.format_date(item.get('travel_date'))
                ws[f'E{row}'] = item.get('purpose', 'N/A')
                
                for col in range(1, 6):
                    ws.cell(row=row, column=col).border = thin_border
                ws[f'C{row}'].number_format = '₹#,##0.00'
                
                row += 1
            
            # Total
            ws[f'A{row}'] = "TOTAL"
            ws[f'C{row}'] = total
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'C{row}'].font = Font(bold=True)
            ws[f'C{row}'].number_format = '₹#,##0.00'
            
            ws.column_dimensions['A'].width = 25
            ws.column_dimensions['B'].width = 25
            ws.column_dimensions['C'].width = 20
            ws.column_dimensions['D'].width = 15
            ws.column_dimensions['E'].width = 30
        
        # Contingency
        if categories.get('contingency'):
            ws = wb.create_sheet("Contingency Details")
            ws['A1'] = "CONTINGENCY DETAILS"
            ws['A1'].font = Font(size=14, bold=True)
            ws.merge_cells('A1:C1')
            
            headers = ['Description', 'Amount (Lakhs)', 'Date']
            for col, header in enumerate(headers, start=1):
                cell = ws.cell(row=3, column=col)
                cell.value = header
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
                cell.border = thin_border
            
            row = 4
            total = 0
            for item in categories['contingency']:
                amount = ExcelReportGenerator.format_currency(item.get('amount', 0))
                total += amount
                
                ws[f'A{row}'] = item.get('description', 'N/A')
                ws[f'B{row}'] = amount
                ws[f'C{row}'] = ExcelReportGenerator.format_date(item.get('expense_date'))
                
                for col in range(1, 4):
                    ws.cell(row=row, column=col).border = thin_border
                ws[f'B{row}'].number_format = '₹#,##0.00'
                
                row += 1
            
            # Total
            ws[f'A{row}'] = "TOTAL"
            ws[f'B{row}'] = total
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'B{row}'].font = Font(bold=True)
            ws[f'B{row}'].number_format = '₹#,##0.00'
            
            ws.column_dimensions['A'].width = 40
            ws.column_dimensions['B'].width = 20
            ws.column_dimensions['C'].width = 15
        
        # Overhead
        if categories.get('overhead'):
            ws = wb.create_sheet("Overhead Details")
            ws['A1'] = "OVERHEAD DETAILS"
            ws['A1'].font = Font(size=14, bold=True)
            ws.merge_cells('A1:C1')
            
            headers = ['Description', 'Amount (Lakhs)', 'Date']
            for col, header in enumerate(headers, start=1):
                cell = ws.cell(row=3, column=col)
                cell.value = header
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")
                cell.border = thin_border
            
            row = 4
            total = 0
            for item in categories['overhead']:
                amount = ExcelReportGenerator.format_currency(item.get('amount', 0))
                total += amount
                
                ws[f'A{row}'] = item.get('description', 'N/A')
                ws[f'B{row}'] = amount
                ws[f'C{row}'] = ExcelReportGenerator.format_date(item.get('expense_date'))
                
                for col in range(1, 4):
                    ws.cell(row=row, column=col).border = thin_border
                ws[f'B{row}'].number_format = '₹#,##0.00'
                
                row += 1
            
            # Total
            ws[f'A{row}'] = "TOTAL"
            ws[f'B{row}'] = total
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'B{row}'].font = Font(bold=True)
            ws[f'B{row}'].number_format = '₹#,##0.00'
            
            ws.column_dimensions['A'].width = 40
            ws.column_dimensions['B'].width = 20
            ws.column_dimensions['C'].width = 15