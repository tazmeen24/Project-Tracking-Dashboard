# backend/app/services/uc_generator_pdf.py
"""
Utilization Certificate (UC) PDF Generator
Generates GFR 12-A format UC as PDF using ReportLab
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import tempfile
from typing import Dict, Any, List


class UCPDFGenerator:
    """Generate UC in PDF format (GFR 12-A)"""
    
    @staticmethod
    def generate(uc_data: Dict[str, Any]) -> str:
        """
        Generate UC as PDF document
        
        Args:
            uc_data: Complete UC data dictionary
            
        Returns:
            Path to generated PDF file
        """
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_path = temp_file.name
        temp_file.close()
        
        # Create PDF
        doc = SimpleDocTemplate(
            temp_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build content
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            textColor=colors.black,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            spaceAfter=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )
        
        # Page 1: Main Certificate
        UCPDFGenerator._add_page1_certificate(story, uc_data, title_style, heading_style, normal_style)
        
        story.append(PageBreak())
        
        # Page 2: Certifications
        UCPDFGenerator._add_page2_certifications(story, uc_data, title_style, normal_style)
        
        story.append(PageBreak())
        
        # Page 3: Statement of Expenditure
        UCPDFGenerator._add_page3_soe(story, uc_data, title_style, heading_style, normal_style)
        
        # Build PDF
        doc.build(story)
        
        return temp_path
    
    @staticmethod
    def _add_page1_certificate(story: List, data: Dict[str, Any], 
                               title_style, heading_style, normal_style):
        """Add Page 1 - Main UC Certificate"""
        
        project = data['project']
        grants = data['grants_received']
        expenditure = data['expenditure']
        
        # Title
        story.append(Paragraph('GFR 12-A', title_style))
        story.append(Paragraph('{{See Rule 238 (1)}}S', heading_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Main heading
        story.append(Paragraph('FORM OF UTILIZATION CERTIFICATE (UC)', heading_style))
        
        # Period
        period_text = (
            f'UTILIZATION CERTIFICATE FOR THE PERIOD '
            f'({data["period_from"].strftime("%d.%m.%Y")} to '
            f'{data["period_to"].strftime("%d.%m.%Y")})'
        )
        story.append(Paragraph(period_text, heading_style))
        
        # Grant type
        grant_type_text = (
            'in respect of Recurring<br/>'
            'GRANTS-IN-AID/SALARIES/General Component/Recurring / Non-Recurring<br/>'
            'Creation of CAPITAL ASSESTS'
        )
        story.append(Paragraph(grant_type_text, heading_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Project details
        details = [
            f"1. Name of the Scheme: {project.get('scheme', 'R & D in IT Group')}",
            f"2. Title of the Project: {project.get('title', 'N/A')}",
            f"3. Institute Name: {project.get('technical_group_name', 'N/A')}",
            f"4. Name of Principal Investigator (PI): Dr. {project.get('pi_name', 'N/A')}",
            f"5. Sanction Order No & Date: {project.get('sanctioned_number', 'N/A')}",
            f"6. Whether recurring or non-recurring grants: Recurring & Non-Recurring",
        ]
        
        for detail in details:
            story.append(Paragraph(detail, normal_style))
        
        story.append(Spacer(1, 0.2*inch))
        
        # Grants position table
        story.append(Paragraph(
            '7. Grants position of the beginning of the financial year:',
            normal_style
        ))
        
        grants_table = UCPDFGenerator._create_grants_position_table(data)
        story.append(grants_table)
        
        story.append(Spacer(1, 0.2*inch))
        
        # Component breakdown - USING EXPENDITURE
        story.append(Paragraph('Component wise utilization of grants:', normal_style))
        
        component_table = UCPDFGenerator._create_component_breakdown_table(expenditure)
        story.append(component_table)
        
        story.append(Spacer(1, 0.2*inch))
        
        # Closing details
        story.append(Paragraph('Details of grants position at the end of the year:', normal_style))
        closing_details = [
            f"(i) Cash in Hand/Bank: Rs. {UCPDFGenerator._format_currency(data['closing_balance'])}",
            f"(ii) Refunds, if any: Rs. {UCPDFGenerator._format_currency(data['closing_balance'])}-",
            "(iii) Balance (Carry forward to next financial year): Rs. 0/-"
        ]
        
        for detail in closing_details:
            story.append(Paragraph(detail, normal_style))
        
        # Signatures - Only designations
        story.append(Spacer(1, 0.4*inch))
        sig_table = UCPDFGenerator._create_signature_table()
        story.append(sig_table)
    
    @staticmethod
    def _add_page2_certifications(story: List, data: Dict[str, Any],
                                  title_style, normal_style):
        """Add Page 2 - Certification Statements"""
        
        story.append(Paragraph('GFR 12-A', title_style))
        story.append(Spacer(1, 0.2*inch))
        
        intro = (
            'Certified that I have satisfied myself that the conditions on which grants were '
            'sanctioned have been duly fulfilled/are being fulfilled and that I have exercised '
            'following checks to see that the money has been actually utilized for the purpose '
            'which it was sanctioned:'
        )
        story.append(Paragraph(intro, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        certifications = [
            '(i) The main accounts and other subsidiary accounts and registers...',
            '(ii) There exist internal controls for safeguarding of public funds...',
            '(iii) To the best of our knowledge and belief...',
            '(iv) The responsibilities among the key functionaries...',
            '(v) The benefits were extended to the intended beneficiaries...',
            '(vi) The expenditure on various components of the scheme...',
            '(vii) It has been ensured that the physical and financial performance...',
            '(viii) The utilization of the fund resulted in outcomes...',
            '(ix) Details of various schemes executed by the agency...'
        ]
        
        for cert in certifications:
            story.append(Paragraph(cert, normal_style))
            story.append(Spacer(1, 0.1*inch))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Date and place
        today = datetime.now()
        story.append(Paragraph(f'Date: {today.strftime("%d.%m.%Y")}', normal_style))
        story.append(Paragraph('Place: Chennai', normal_style))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Signatures
        sig_table = UCPDFGenerator._create_signature_table()
        story.append(sig_table)
    
    @staticmethod
    def _add_page3_soe(story: List, data: Dict[str, Any],
                      title_style, heading_style, normal_style):
        """Add Page 3 - Statement of Expenditure"""
        
        project = data['project']
        expenditure = data['expenditure']
        budget = data.get('budget', {})
        
        story.append(Paragraph('STATEMENT OF EXPENDITURE (SoE)', title_style))
        
        period_text = (
            f'for the period of {data["period_from"].strftime("%d.%m.%Y")} to '
            f'{data["period_to"].strftime("%d.%m.%Y")}'
        )
        story.append(Paragraph(period_text, heading_style))
        
        grant_type = (
            'in respect of Recurring GRANTS-IN-AID/SALARIES/General Component/Recurring /'
            'Non-Recurring Creation of CAPITAL ASSESTS'
        )
        story.append(Paragraph(grant_type, heading_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Project details table
        details_data = [
            ['1. Sanction Letter No:', 'No.4(4)/2021-ITEA', '6. Grant Received:'],
            ['2. Total Project Cost:', f'Rs. {sum(budget.values()):,.2f}', '1st Payment: Rs. 88,01,000/-'],
            ['3. Sanctioned/Revised:', 'Rs. /-', '2nd Payment: Rs. 12,50,000/-'],
            ['4. Date of Commencement:', str(project.get('start_date', 'N/A')), '3rd Payment: Rs. 19,18,071/-'],
            ['', '', '4th Payment: Rs. 21,60,000/-'],
            ['5. Statement of Expenditure', '', f'Total: Rs. {data["grants_received"]["total"]:,.2f}'],
            ['', '', 'Interest: Rs. 0/-']  # Added Interest row
        ]
        
        details_table = Table(details_data, colWidths=[2*inch, 2.5*inch, 2*inch])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(details_table)
        story.append(Spacer(1, 0.2*inch))
        
        # SOE Table
        soe_table = UCPDFGenerator._create_soe_table(expenditure, budget)
        story.append(soe_table)
        
        story.append(Spacer(1, 0.3*inch))
        
        # Footer
        story.append(Paragraph(f'Funds released so far: Rs. {data["grants_received"]["total"]:,.2f}/-', normal_style))
        story.append(Paragraph(f'Date of start: {project.get("start_date", "N/A")}', normal_style))
        story.append(Paragraph(f'Expected completion: {project.get("end_date", "N/A")}', normal_style))
        
        # Signatures
        story.append(Spacer(1, 0.3*inch))
        sig_table = UCPDFGenerator._create_signature_table()
        story.append(sig_table)
    
    @staticmethod
    def _create_grants_position_table(data: Dict[str, Any]) -> Table:
        """Create grants position table - properly sized for PDF"""
        
        grants = data['grants_received']
        expenditure = data['expenditure']
        opening = data['opening_balance']
        project = data['project']
        total_available = opening + grants['total']
        
        # Simplified structure - 3 rows with proper widths
        table_data = [
            # Row 1: Headers
            [
                'Unspent Balances',
                'Interest Earned',
                'Interest Deposited',
                'Sanction no.',
                'Date',
                'Amount',
                'Total Available',
                'Expenditure',
                'Closing Balance'
            ],
            # Row 2: Column numbers
            ['1', '2', '3', '4(i)', '4(ii)', '4(iii)', '5', '6', '7'],
            # Row 3: Data
            [
                UCPDFGenerator._format_currency(opening).replace('Rs. ', ''),
                '0.00',
                '0.00',
                str(project.get('sanctioned_number', 'N/A')),
                str(project.get('start_date', 'N/A')),
                UCPDFGenerator._format_currency(grants['total']).replace('Rs. ', ''),
                UCPDFGenerator._format_currency(total_available).replace('Rs. ', ''),
                UCPDFGenerator._format_currency(expenditure['total']).replace('Rs. ', ''),
                UCPDFGenerator._format_currency(data['closing_balance']).replace('Rs. ', '')
            ]
        ]
        
        # Proper column widths - total should be ~7 inches for A4
        col_widths = [
            0.7*inch,   # Unspent
            0.6*inch,   # Interest Earned
            0.7*inch,   # Interest Deposited
            0.7*inch,   # Sanction no
            0.8*inch,   # Date
            0.9*inch,   # Amount
            0.8*inch,   # Total Available
            0.8*inch,   # Expenditure
            0.8*inch    # Closing
        ]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            # Font
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            
            # Headers bold
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            
            # Background colors
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('BACKGROUND', (0, 1), (-1, 1), colors.whitesmoke),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            
            # Alignment
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Word wrap
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
        
        return table
    
    @staticmethod
    def _create_component_breakdown_table(expenditure: Dict[str, Any]) -> Table:
        """Create component breakdown table using EXPENDITURE data"""
        
        # Calculate component-wise expenditure
        # General = Consumables + Travels + Contingencies + Overheads
        general_exp = (
            expenditure['by_head'].get('consumables', 0) +
            expenditure['by_head'].get('travels', 0) +
            expenditure['by_head'].get('contingencies', 0) +
            expenditure['by_head'].get('overheads', 0)
        )
        
        # Salary = Salaries (Recurring)
        salary_exp = expenditure['by_head'].get('salaries', 0)
        
        # Capital Assets = Equipment (Non-Recurring)
        capital_exp = expenditure['by_head'].get('equipment', 0)
        
        total_exp = general_exp + salary_exp + capital_exp
        
        table_data = [
            ['Grant-in-aid-General', 'Grant-in-aid-Salary', 
             'Grant-in-aid-Capital Assets', 'Total'],
            [
                UCPDFGenerator._format_currency(general_exp),
                UCPDFGenerator._format_currency(salary_exp),
                UCPDFGenerator._format_currency(capital_exp),
                UCPDFGenerator._format_currency(total_exp)
            ]
        ]
        
        table = Table(table_data, colWidths=[1.5*inch] * 4)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        
        return table
    
    @staticmethod
    def _create_soe_table(expenditure: Dict[str, Any], budget: Dict[str, float]) -> Table:
        """Create Statement of Expenditure table"""
        
        table_data = [
            ['SI.NO.', 'HEAD OF EXPENDITURE', 'Approved Budget', 
             'Expenditure Incurred', 'Total Expenditure']
        ]
        
        heads = [
            ('1', 'Equipment', 'equipment'),
            ('2', 'Salaries', 'salaries'),
            ('3', 'Consumables', 'consumables'),
            ('4', 'Travels', 'travels'),
            ('5', 'Contingencies', 'contingencies'),
            ('6', 'Overheads', 'overheads')
        ]
        
        total_budget = 0
        total_exp = 0
        
        for num, label, key in heads:
            budget_amt = budget.get(key, 0)
            exp_amt = expenditure['by_head'].get(key, 0)
            
            table_data.append([
                num,
                label,
                UCPDFGenerator._format_currency(budget_amt),
                UCPDFGenerator._format_currency(exp_amt),
                UCPDFGenerator._format_currency(exp_amt)
            ])
            
            total_budget += budget_amt
            total_exp += exp_amt
        
        # Total row
        table_data.append([
            '',
            'Total',
            UCPDFGenerator._format_currency(total_budget),
            UCPDFGenerator._format_currency(total_exp),
            UCPDFGenerator._format_currency(total_exp)
        ])
        
        table = Table(table_data, colWidths=[0.5*inch, 2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ]))
        
        return table
    
    @staticmethod
    def _create_signature_table() -> Table:
        """Create signature table with designations only"""
        
        table_data = [[
            'Signature with Seal:\nChief Administrative and\nAccounts Officer',
            'Signature with Seal:\nHead of Organization',
            'Signature of PI:\nPrincipal Investigator'
        ]]
        
        table = Table(table_data, colWidths=[2.2*inch] * 3)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        
        return table
    
    @staticmethod
    def _format_currency(amount: float) -> str:
        """Format currency"""
        return f"{amount:,.2f}"