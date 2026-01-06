# backend/app/services/uc_service.py
"""
Utilization Certificate (UC) Service
Handles UC data fetching, calculation, and generation logic
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal


class UCService:
    """Service for Utilization Certificate operations"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    def get_uc_data(self, project_id: int, financial_year: str) -> Dict[str, Any]:
        """
        Fetch complete UC data for a project and financial year
        
        Args:
            project_id: Project ID
            financial_year: Financial year in format '2024-25'
            
        Returns:
            Complete UC data dictionary
        """
        cursor = self.conn.cursor()
        
        # Parse financial year
        fy_start_year = int(financial_year.split('-')[0])
        period_from = date(fy_start_year, 4, 1)
        period_to = date(fy_start_year + 1, 3, 31)
        
        # Get project details
        project_data = self._get_project_details(cursor, project_id)
        
        # Get installments for this period
        installments = self._get_installments(cursor, project_id, period_from, period_to)
        
        # Get opening balance (from previous FY)
        opening_balance = self._calculate_opening_balance(cursor, project_id, period_from)
        
        # Get grants received in this FY
        grants_data = self._get_grants_received(cursor, project_id, period_from, period_to)
        
        # Get expenditure in this FY
        expenditure_data = self._get_expenditure(cursor, project_id, period_from, period_to)
        
        # Calculate closing balance
        total_grants = sum(grants_data.values())
        total_expenditure = expenditure_data['total']
        closing_balance = opening_balance + total_grants - total_expenditure
        
        # Get approved budget
        budget_data = self._get_approved_budget(cursor, project_id)
        
        cursor.close()
        
        return {
            'project': project_data,
            'financial_year': financial_year,
            'period_from': period_from,
            'period_to': period_to,
            'opening_balance': float(opening_balance),
            'installments': installments,
            'grants_received': {
                'general': float(grants_data.get('general', 0)),
                'salary': float(grants_data.get('salary', 0)),
                'capital_assets': float(grants_data.get('capital_assets', 0)),
                'total': float(total_grants),
                'interest_earned': 0.0  # Manual entry
            },
            'expenditure': {
                'by_head': expenditure_data['by_head'],
                'recurring': float(expenditure_data['recurring']),
                'non_recurring': float(expenditure_data['non_recurring']),
                'total': float(total_expenditure)
            },
            'budget': budget_data,
            'closing_balance': float(closing_balance)
        }
    
    def _get_project_details(self, cursor, project_id: int) -> Dict[str, Any]:
        """Get project basic information"""
        cursor.execute("""
            SELECT 
                p.project_id,
                p.project_no,
                p.title,
                p.alias,
                p.project_category,
                p.project_type,
                p.pfms_id,
                p.start_date,
                p.end_date,
                fa.name as funding_agency_name,
                fa.address as funding_agency_address,
                fad.contact_person,
                fad.designation,
                fad.email,
                fad.mobile,
                fad.sanctioned_number,
                fad.scheme,
                fad.cna_sub_agency,
                fad.bank_name,
                fad.bank_account_no,
                tg.name as technical_group_name,
                i.principal_investigator as pi_name,
                i.pi_email,
                i.pi_mobile
            FROM projects p
            LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
            LEFT JOIN funding_agency_details fad ON p.project_id = fad.project_id
            LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
            LEFT JOIN investigators i ON p.project_id = i.project_id
            WHERE p.project_id = %s
        """, (project_id,))
        
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Project {project_id} not found")
        
        # Get column names
        columns = [desc[0] for desc in cursor.description]
        return dict(zip(columns, row))
    
    def _get_installments(self, cursor, project_id: int, 
                         period_from: date, period_to: date) -> List[Dict[str, Any]]:
        """
        Get all installments received during the period.
        If no installments exist, aggregate from funds_received by date.
        """
        # Try to get installments from project_installments table
        cursor.execute("""
            SELECT 
                installment_number,
                sanction_number,
                sanction_date,
                total_amount,
                date_received,
                remarks
            FROM project_installments
            WHERE project_id = %s 
              AND date_received BETWEEN %s AND %s
            ORDER BY installment_number
        """, (project_id, period_from, period_to))
        
        rows = cursor.fetchall()
        
        # If installments exist, use them
        if rows:
            installments = []
            for row in rows:
                installments.append({
                    'installment_number': row[0],
                    'sanction_number': row[1],
                    'sanction_date': row[2],
                    'amount': float(row[3]),
                    'date_received': row[4],
                    'remarks': row[5]
                })
            return installments
        
        # FALLBACK: If no installments, aggregate from funds_received
        cursor.execute("""
            SELECT 
                ROW_NUMBER() OVER (ORDER BY date_received) as installment_number,
                'AUTO-' || TO_CHAR(date_received, 'YYYYMMDD') as sanction_number,
                date_received as sanction_date,
                SUM(amount) as total_amount,
                date_received,
                'Auto-generated from funds received' as remarks
            FROM funds_received
            WHERE project_id = %s 
              AND date_received BETWEEN %s AND %s
            GROUP BY date_received
            ORDER BY date_received
        """, (project_id, period_from, period_to))
        
        fallback_rows = cursor.fetchall()
        installments = []
        for row in fallback_rows:
            installments.append({
                'installment_number': row[0],
                'sanction_number': row[1],
                'sanction_date': row[2],
                'amount': float(row[3]),
                'date_received': row[4],
                'remarks': row[5]
            })
        
        return installments
    
    def _calculate_opening_balance(self, cursor, project_id: int, 
                                   period_from: date) -> Decimal:
        """
        Calculate opening balance (unspent from previous FY)
        Opening Balance = Total Grants Received (before period) - Total Expenditure (before period)
        Handles NULL dates gracefully by excluding them.
        """
        # Get total grants received before this FY
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total_grants
            FROM funds_received
            WHERE project_id = %s 
              AND date_received < %s
              AND date_received IS NOT NULL
        """, (project_id, period_from))
        total_grants_before = cursor.fetchone()[0] or Decimal('0')
        
        # Get total expenditure before this FY
        cursor.execute("""
            SELECT COALESCE(SUM(total_spent), 0) as total_exp
            FROM (
                -- Manpower with valid dates
                SELECT SUM(total_cost) as total_spent
                FROM manpower
                WHERE project_id = %s 
                  AND date_incurred IS NOT NULL
                  AND date_incurred < %s
                
                UNION ALL
                
                -- Equipment with valid dates
                SELECT SUM(total_cost) as total_spent
                FROM equipment
                WHERE project_id = %s 
                  AND purchase_date IS NOT NULL
                  AND purchase_date < %s
                
                UNION ALL
                
                -- Budget expenditure with valid dates
                SELECT SUM(amount) as total_spent
                FROM budget_expenditure
                WHERE project_id = %s 
                  AND date_incurred IS NOT NULL
                  AND date_incurred < %s
            ) all_exp
        """, (project_id, period_from, project_id, period_from, project_id, period_from))
        total_exp_before = cursor.fetchone()[0] or Decimal('0')
        
        return total_grants_before - total_exp_before
    
    def _get_grants_received(self, cursor, project_id: int,
                            period_from: date, period_to: date) -> Dict[str, Decimal]:
        """
        Get grants received during the period, categorized by component
        - General: consumables + travel & training + contingency + overhead
        - Salary: manpower (Recurring)
        - Capital Assets: equipment (Non-Recurring)
        """
        cursor.execute("""
            SELECT 
                head,
                SUM(amount) as total
            FROM funds_received
            WHERE project_id = %s 
              AND date_received BETWEEN %s AND %s
            GROUP BY head
        """, (project_id, period_from, period_to))
        
        grants = {
            'general': Decimal('0'),
            'salary': Decimal('0'),
            'capital_assets': Decimal('0')
        }
        
        for row in cursor.fetchall():
            head, amount = row
            if head == 'manpower':
                grants['salary'] += amount
            elif head == 'equipment':
                grants['capital_assets'] += amount
            else:  # consumables, travel & training, contingency, overhead
                grants['general'] += amount
        
        return grants
    
    def _get_expenditure(self, cursor, project_id: int,
                        period_from: date, period_to: date) -> Dict[str, Any]:
        """
        Get expenditure during the period.
        Only includes records with valid dates within the period.
        Recurring: manpower + consumables + travel + contingency + overhead
        Non-Recurring: equipment
        """
        expenditure = {
            'by_head': {},
            'recurring': Decimal('0'),
            'non_recurring': Decimal('0'),
            'total': Decimal('0')
        }
        
        # Manpower (Recurring) - only with valid dates in period
        cursor.execute("""
            SELECT COALESCE(SUM(total_cost), 0) as amount
            FROM manpower
            WHERE project_id = %s 
              AND date_incurred IS NOT NULL
              AND date_incurred BETWEEN %s AND %s
        """, (project_id, period_from, period_to))
        manpower_exp = cursor.fetchone()[0] or Decimal('0')
        expenditure['by_head']['salaries'] = float(manpower_exp)
        expenditure['recurring'] += manpower_exp
        
        # Equipment (Non-Recurring) - only with valid dates in period
        cursor.execute("""
            SELECT COALESCE(SUM(total_cost), 0) as amount
            FROM equipment
            WHERE project_id = %s 
              AND purchase_date IS NOT NULL
              AND purchase_date BETWEEN %s AND %s
        """, (project_id, period_from, period_to))
        equipment_exp = cursor.fetchone()[0] or Decimal('0')
        expenditure['by_head']['equipment'] = float(equipment_exp)
        expenditure['non_recurring'] += equipment_exp
        
        # Other heads (Recurring) - only with valid dates in period
        cursor.execute("""
            SELECT 
                head,
                SUM(amount) as total
            FROM budget_expenditure
            WHERE project_id = %s 
              AND date_incurred IS NOT NULL
              AND date_incurred BETWEEN %s AND %s
            GROUP BY head
        """, (project_id, period_from, period_to))
        
        head_mapping = {
            'consumables': 'consumables',
            'travel & training': 'travels',
            'contingency': 'contingencies',
            'overhead': 'overheads'
        }
        
        for row in cursor.fetchall():
            head, amount = row
            mapped_head = head_mapping.get(head, head)
            expenditure['by_head'][mapped_head] = float(amount)
            expenditure['recurring'] += amount
        
        # Ensure all heads exist (even if zero)
        for head in ['equipment', 'salaries', 'consumables', 'travels', 'contingencies', 'overheads']:
            if head not in expenditure['by_head']:
                expenditure['by_head'][head] = 0.0
        
        expenditure['total'] = expenditure['recurring'] + expenditure['non_recurring']
        
        return expenditure
    
    def _get_approved_budget(self, cursor, project_id: int) -> Dict[str, float]:
        """Get approved budget by head"""
        cursor.execute("""
            SELECT 
                head,
                allocated_amount
            FROM budget_allocation
            WHERE project_id = %s
        """, (project_id,))
        
        budget = {}
        head_mapping = {
            'manpower': 'salaries',
            'equipment': 'equipment',
            'consumables': 'consumables',
            'travel & training': 'travels',
            'contingency': 'contingencies',
            'overhead': 'overheads'
        }
        
        for row in cursor.fetchall():
            head, amount = row
            mapped_head = head_mapping.get(head, head)
            budget[mapped_head] = float(amount)
        
        return budget
    
    def create_uc(self, project_id: int, financial_year: str, 
                  generated_by: Optional[int] = None) -> int:
        """
        Create a new UC record in the database
        
        Returns:
            uc_id of the created record
        """
        cursor = self.conn.cursor()
        
        # Get UC data
        uc_data = self.get_uc_data(project_id, financial_year)
        
        # Generate UC number
        uc_number = f"UC-{financial_year}-{project_id:03d}"
        
        # Insert UC record
        cursor.execute("""
            INSERT INTO utilization_certificates (
                project_id, uc_number, financial_year, period_from, period_to,
                opening_balance, interest_earned, total_grants_received,
                total_expenditure, closing_balance,
                grant_general, grant_salary, grant_capital_assets,
                expenditure_recurring, expenditure_non_recurring,
                status, generated_by
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s,
                'draft', %s
            ) RETURNING uc_id
        """, (
            project_id, uc_number, financial_year,
            uc_data['period_from'], uc_data['period_to'],
            uc_data['opening_balance'], 0,  # interest_earned
            uc_data['grants_received']['total'],
            uc_data['expenditure']['total'],
            uc_data['closing_balance'],
            uc_data['grants_received']['general'],
            uc_data['grants_received']['salary'],
            uc_data['grants_received']['capital_assets'],
            uc_data['expenditure']['recurring'],
            uc_data['expenditure']['non_recurring'],
            generated_by
        ))
        
        uc_id = cursor.fetchone()[0]
        
        # Insert Statement of Expenditure details
        for head, amount in uc_data['expenditure']['by_head'].items():
            approved = uc_data['budget'].get(head, 0)
            cursor.execute("""
                INSERT INTO uc_statement_of_expenditure (
                    uc_id, head, approved_budget, 
                    expenditure_incurred, total_expenditure
                ) VALUES (%s, %s, %s, %s, %s)
            """, (uc_id, head, approved, amount, amount))
        
        self.conn.commit()
        cursor.close()
        
        return uc_id
    
    def get_uc_by_id(self, uc_id: int) -> Dict[str, Any]:
        """Retrieve UC data by uc_id"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT * FROM vw_uc_summary WHERE uc_id = %s
        """, (uc_id,))
        
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"UC {uc_id} not found")
        
        columns = [desc[0] for desc in cursor.description]
        uc_summary = dict(zip(columns, row))
        
        # Get detailed SoE
        cursor.execute("""
            SELECT head, approved_budget, expenditure_incurred, total_expenditure
            FROM uc_statement_of_expenditure
            WHERE uc_id = %s
        """, (uc_id,))
        
        soe_details = []
        for row in cursor.fetchall():
            soe_details.append({
                'head': row[0],
                'approved_budget': float(row[1]),
                'expenditure_incurred': float(row[2]),
                'total_expenditure': float(row[3])
            })
        
        cursor.close()
        
        return {
            'uc_summary': uc_summary,
            'soe_details': soe_details
        }
    
    def update_uc_status(self, uc_id: int, status: str, 
                        signature_data: Optional[Dict] = None):
        """Update UC status and signatures"""
        cursor = self.conn.cursor()
        
        update_fields = ["status = %s"]
        params = [status]
        
        if signature_data:
            if 'pi_signature_date' in signature_data:
                update_fields.append("pi_signature_date = %s")
                params.append(signature_data['pi_signature_date'])
            if 'admin_signature_date' in signature_data:
                update_fields.append("admin_signature_date = %s")
                params.append(signature_data['admin_signature_date'])
            if 'head_signature_date' in signature_data:
                update_fields.append("head_signature_date = %s")
                params.append(signature_data['head_signature_date'])
        
        if status == 'submitted':
            update_fields.append("submitted_date = CURRENT_DATE")
        elif status == 'approved':
            update_fields.append("approved_date = CURRENT_DATE")
        
        params.append(uc_id)
        
        query = f"""
            UPDATE utilization_certificates 
            SET {', '.join(update_fields)}
            WHERE uc_id = %s
        """
        
        cursor.execute(query, params)
        self.conn.commit()
        cursor.close()