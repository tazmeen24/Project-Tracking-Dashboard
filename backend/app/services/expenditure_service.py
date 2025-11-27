"""
Expenditure Service
Handles all business logic related to expenditures across different heads
"""

from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from datetime import datetime, date
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor


class ExpenditureService:
    """Service class for expenditure-related operations"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    # ==================== Manpower Expenditure ====================
    
    def create_manpower_expenditure(self, manpower_data: dict, user: dict) -> dict:
        """
        Create a new manpower expenditure record
        
        Args:
            manpower_data: Dictionary containing manpower information
            user: Current authenticated user
            
        Returns:
            Created manpower record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = manpower_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate transaction date
                date_warning = self._validate_transaction_date(
                    project_id, 
                    manpower_data.get('date_of_joining'), 
                    cur
                )
                
                # Validate against allocation breakdown
                self._validate_manpower_against_allocation(
                    project_id,
                    manpower_data['role'],
                    manpower_data.get('num_personnel', 1),
                    cur
                )
                
                # Insert manpower record
                cur.execute("""
                    INSERT INTO manpower
                    (project_id, name, role, date_of_joining, date_of_leaving, 
                     salary_per_month, num_personnel, remarks, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING manpower_id
                """, (
                    project_id,
                    manpower_data['name'],
                    manpower_data['role'],
                    manpower_data.get('date_of_joining'),
                    manpower_data.get('date_of_leaving'),
                    manpower_data['salary_per_month'],
                    manpower_data.get('num_personnel', 1),
                    manpower_data.get('remarks'),
                    user['user_id'],
                    user['user_id']
                ))
                
                manpower_id = cur.fetchone()['manpower_id']
                
                # Create corresponding expenditure record
                total_cost = self._calculate_manpower_cost(
                    manpower_data['salary_per_month'],
                    manpower_data.get('date_of_joining'),
                    manpower_data.get('date_of_leaving'),
                    manpower_data.get('num_personnel', 1)
                )
                
                cur.execute("""
                    INSERT INTO expenditures
                    (project_id, head, description, total_cost, transaction_date, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING expenditure_id
                """, (
                    project_id,
                    'manpower',
                    f"Manpower: {manpower_data['name']} - {manpower_data['role']}",
                    total_cost,
                    manpower_data.get('date_of_joining'),
                    user['user_id'],
                    user['user_id']
                ))
                
                self.conn.commit()
                
                result = self.get_manpower_by_id(manpower_id)
                if date_warning:
                    result['warning'] = date_warning
                
                return result
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_manpower(self, project_id: Optional[int] = None, 
                        skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all manpower records with optional project filter"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    m.*,
                    p.title as project_title,
                    p.project_no
                FROM manpower m
                LEFT JOIN projects p ON m.project_id = p.project_id
            """
            
            params = []
            if project_id:
                query += " WHERE m.project_id = %s"
                params.append(project_id)
            
            query += " ORDER BY m.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_manpower_by_id(self, manpower_id: int) -> dict:
        """Get a single manpower record by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    m.*,
                    p.title as project_title,
                    p.project_no
                FROM manpower m
                LEFT JOIN projects p ON m.project_id = p.project_id
                WHERE m.manpower_id = %s
            """, (manpower_id,))
            
            manpower = cur.fetchone()
            if not manpower:
                raise HTTPException(status_code=404, detail="Manpower record not found")
            
            return dict(manpower)
    
    def update_manpower(self, manpower_id: int, manpower_data: dict, user: dict) -> dict:
        """Update an existing manpower record"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if record exists and get current data
                cur.execute("""
                    SELECT * FROM manpower WHERE manpower_id = %s
                """, (manpower_id,))
                
                current = cur.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Manpower record not found")
                
                # Validate if role is being changed
                if 'role' in manpower_data and manpower_data['role'] != current['role']:
                    self._validate_manpower_against_allocation(
                        current['project_id'],
                        manpower_data['role'],
                        manpower_data.get('num_personnel', current['num_personnel']),
                        cur,
                        exclude_manpower_id=manpower_id
                    )
                
                # Build update query
                update_fields = []
                update_values = []
                
                allowed_fields = [
                    'name', 'role', 'date_of_joining', 'date_of_leaving',
                    'salary_per_month', 'num_personnel', 'remarks'
                ]
                
                for field in allowed_fields:
                    if field in manpower_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(manpower_data[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_fields.append("updated_by = %s")
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                update_values.extend([user['user_id'], manpower_id])
                
                query = f"""
                    UPDATE manpower 
                    SET {', '.join(update_fields)}
                    WHERE manpower_id = %s
                """
                
                cur.execute(query, update_values)
                
                # Update corresponding expenditure
                total_cost = self._calculate_manpower_cost(
                    manpower_data.get('salary_per_month', current['salary_per_month']),
                    manpower_data.get('date_of_joining', current['date_of_joining']),
                    manpower_data.get('date_of_leaving', current['date_of_leaving']),
                    manpower_data.get('num_personnel', current['num_personnel'])
                )
                
                cur.execute("""
                    UPDATE expenditures
                    SET total_cost = %s, updated_by = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = %s AND head = 'manpower' 
                    AND description LIKE %s
                """, (
                    total_cost,
                    user['user_id'],
                    current['project_id'],
                    f"%{current['name']}%"
                ))
                
                self.conn.commit()
                return self.get_manpower_by_id(manpower_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_manpower(self, manpower_id: int) -> dict:
        """Delete a manpower record and its associated expenditure"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("""
                    SELECT * FROM manpower WHERE manpower_id = %s
                """, (manpower_id,))
                
                manpower = cur.fetchone()
                if not manpower:
                    raise HTTPException(status_code=404, detail="Manpower record not found")
                
                # Delete associated expenditure
                cur.execute("""
                    DELETE FROM expenditures
                    WHERE project_id = %s AND head = 'manpower' 
                    AND description LIKE %s
                """, (manpower['project_id'], f"%{manpower['name']}%"))
                
                # Delete manpower record
                cur.execute("DELETE FROM manpower WHERE manpower_id = %s", (manpower_id,))
                
                self.conn.commit()
                return {"message": "Manpower record deleted successfully"}
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== Equipment Expenditure ====================
    
    def create_equipment_expenditure(self, equipment_data: dict, user: dict) -> dict:
        """Create a new equipment expenditure record"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = equipment_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate transaction date
                date_warning = self._validate_transaction_date(
                    project_id,
                    equipment_data.get('date_of_purchase'),
                    cur
                )
                
                # Validate against allocation breakdown
                self._validate_equipment_against_allocation(
                    project_id,
                    equipment_data['name'],
                    equipment_data['quantity'],
                    cur
                )
                
                # Validate cost against breakdown
                self._validate_equipment_cost_against_breakdown(
                    project_id,
                    equipment_data['name'],
                    equipment_data['unit_cost'],
                    equipment_data['quantity'],
                    cur
                )
                
                # Calculate total cost
                total_cost = equipment_data['unit_cost'] * equipment_data['quantity']
                
                # Insert equipment record
                cur.execute("""
                    INSERT INTO equipment
                    (project_id, name, quantity, unit_cost, supplier, 
                     date_of_purchase, bill_no, remarks, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING equipment_id
                """, (
                    project_id,
                    equipment_data['name'],
                    equipment_data['quantity'],
                    equipment_data['unit_cost'],
                    equipment_data.get('supplier'),
                    equipment_data.get('date_of_purchase'),
                    equipment_data.get('bill_no'),
                    equipment_data.get('remarks'),
                    user['user_id'],
                    user['user_id']
                ))
                
                equipment_id = cur.fetchone()['equipment_id']
                
                # Create corresponding expenditure record
                cur.execute("""
                    INSERT INTO expenditures
                    (project_id, head, description, total_cost, transaction_date, 
                     bill_no, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    project_id,
                    'equipment',
                    f"Equipment: {equipment_data['name']}",
                    total_cost,
                    equipment_data.get('date_of_purchase'),
                    equipment_data.get('bill_no'),
                    user['user_id'],
                    user['user_id']
                ))
                
                self.conn.commit()
                
                result = self.get_equipment_by_id(equipment_id)
                if date_warning:
                    result['warning'] = date_warning
                
                return result
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_equipment(self, project_id: Optional[int] = None,
                         skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all equipment records with optional project filter"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    e.*,
                    (e.quantity * e.unit_cost) as total_cost,
                    p.title as project_title,
                    p.project_no
                FROM equipment e
                LEFT JOIN projects p ON e.project_id = p.project_id
            """
            
            params = []
            if project_id:
                query += " WHERE e.project_id = %s"
                params.append(project_id)
            
            query += " ORDER BY e.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_equipment_by_id(self, equipment_id: int) -> dict:
        """Get a single equipment record by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    e.*,
                    (e.quantity * e.unit_cost) as total_cost,
                    p.title as project_title,
                    p.project_no
                FROM equipment e
                LEFT JOIN projects p ON e.project_id = p.project_id
                WHERE e.equipment_id = %s
            """, (equipment_id,))
            
            equipment = cur.fetchone()
            if not equipment:
                raise HTTPException(status_code=404, detail="Equipment record not found")
            
            return dict(equipment)
    
    # ==================== General Expenditure ====================
    
    def create_general_expenditure(self, expenditure_data: dict, user: dict) -> dict:
        """Create a general expenditure record (consumables, travel, etc.)"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = expenditure_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate head
                valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
                if expenditure_data['head'] not in valid_heads:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid head. Must be one of: {', '.join(valid_heads)}"
                    )
                
                # Validate transaction date
                date_warning = self._validate_transaction_date(
                    project_id,
                    expenditure_data.get('transaction_date'),
                    cur
                )
                
                # Check if expenditure exceeds available funds
                self._check_expenditure_against_funds(
                    project_id,
                    expenditure_data['head'],
                    expenditure_data['total_cost'],
                    cur
                )
                
                # Insert expenditure
                cur.execute("""
                    INSERT INTO expenditures
                    (project_id, head, description, total_cost, transaction_date,
                     bill_no, remarks, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING expenditure_id
                """, (
                    project_id,
                    expenditure_data['head'],
                    expenditure_data['description'],
                    expenditure_data['total_cost'],
                    expenditure_data.get('transaction_date'),
                    expenditure_data.get('bill_no'),
                    expenditure_data.get('remarks'),
                    user['user_id'],
                    user['user_id']
                ))
                
                expenditure_id = cur.fetchone()['expenditure_id']
                self.conn.commit()
                
                result = self.get_expenditure_by_id(expenditure_id)
                if date_warning:
                    result['warning'] = date_warning
                
                return result
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_expenditures(self, project_id: Optional[int] = None,
                            head: Optional[str] = None,
                            skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all expenditures with optional filters"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    e.*,
                    p.title as project_title,
                    p.project_no
                FROM expenditures e
                LEFT JOIN projects p ON e.project_id = p.project_id
                WHERE 1=1
            """
            
            params = []
            if project_id:
                query += " AND e.project_id = %s"
                params.append(project_id)
            
            if head:
                query += " AND e.head = %s"
                params.append(head)
            
            query += " ORDER BY e.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_expenditure_by_id(self, expenditure_id: int) -> dict:
        """Get a single expenditure record by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    e.*,
                    p.title as project_title,
                    p.project_no
                FROM expenditures e
                LEFT JOIN projects p ON e.project_id = p.project_id
                WHERE e.expenditure_id = %s
            """, (expenditure_id,))
            
            expenditure = cur.fetchone()
            if not expenditure:
                raise HTTPException(status_code=404, detail="Expenditure record not found")
            
            return dict(expenditure)
    
    def get_expenditure_summary_by_head(self, project_id: int) -> List[dict]:
        """Get expenditure summary grouped by head for a project"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    e.head,
                    ba.allocated_amount,
                    COALESCE(SUM(fr.amount), 0) as funds_received,
                    COALESCE(SUM(e.total_cost), 0) as total_spent,
                    COUNT(e.expenditure_id) as transaction_count
                FROM budget_allocations ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id 
                    AND ba.head = fr.head
                LEFT JOIN expenditures e ON ba.project_id = e.project_id 
                    AND ba.head = e.head
                WHERE ba.project_id = %s
                GROUP BY e.head, ba.allocated_amount
            """, (project_id,))
            
            return [dict(row) for row in cur.fetchall()]
    
    # ==================== Helper Methods ====================
    
    def _calculate_manpower_cost(self, salary_per_month: float, 
                                 date_of_joining: Optional[str],
                                 date_of_leaving: Optional[str],
                                 num_personnel: int = 1) -> float:
        """Calculate total cost for manpower based on duration"""
        if not date_of_joining:
            return 0.0
        
        start = datetime.strptime(date_of_joining, '%Y-%m-%d').date()
        end = datetime.strptime(date_of_leaving, '%Y-%m-%d').date() if date_of_leaving else date.today()
        
        # Calculate number of months
        months = (end.year - start.year) * 12 + (end.month - start.month)
        if end.day >= start.day:
            months += 1
        
        return salary_per_month * max(months, 1) * num_personnel
    
    def _validate_foreign_key(self, table: str, column: str, value: int, cursor):
        """Validate that a foreign key exists"""
        cursor.execute(f"SELECT 1 FROM {table} WHERE {column} = %s", (value,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {column}: {value} does not exist in {table}"
            )
    
    def _validate_transaction_date(self, project_id: int, transaction_date: Optional[str], cursor):
        """Check if transaction date falls within project duration"""
        if not transaction_date:
            return None
        
        cursor.execute("""
            SELECT start_date, end_date
            FROM projects
            WHERE project_id = %s
        """, (project_id,))
        
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        trans_date = datetime.strptime(transaction_date, '%Y-%m-%d').date()
        
        if trans_date < project['start_date']:
            raise HTTPException(
                status_code=400,
                detail=f"Transaction date {transaction_date} is before project start date"
            )
        
        if project['end_date'] and trans_date > project['end_date']:
            return {
                "warning": f"Transaction date {transaction_date} is after project end date"
            }
        
        return None
    
    def _validate_manpower_against_allocation(self, project_id: int, role: str,
                                             num_personnel: int, cursor,
                                             exclude_manpower_id: int = None):
        """Check if manpower exceeds approved posts"""
        # Get approved posts
        cursor.execute("""
            SELECT COALESCE(SUM(num_personnel), 0) as approved_posts
            FROM manpower_allocation_breakdown
            WHERE project_id = %s AND role = %s
        """, (project_id, role))
        
        result = cursor.fetchone()
        if not result or result['approved_posts'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved posts found for role '{role}'"
            )
        
        # Check current manpower
        query = """
            SELECT COALESCE(SUM(num_personnel), 0) as current_personnel
            FROM manpower
            WHERE project_id = %s AND role = %s
        """
        params = [project_id, role]
        
        if exclude_manpower_id:
            query += " AND manpower_id != %s"
            params.append(exclude_manpower_id)
        
        cursor.execute(query, params)
        current = cursor.fetchone()
        
        if int(current['current_personnel']) + num_personnel > int(result['approved_posts']):
            raise HTTPException(
                status_code=400,
                detail=f"Personnel count exceeds approved posts for '{role}'"
            )
    
    def _validate_equipment_against_allocation(self, project_id: int, item_name: str,
                                              quantity: int, cursor,
                                              exclude_equipment_id: int = None):
        """Check if equipment quantity exceeds approved quantity"""
        # Get approved quantity
        cursor.execute("""
            SELECT COALESCE(SUM(quantity), 0) as approved_qty
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        """, (project_id, item_name))
        
        result = cursor.fetchone()
        if not result or result['approved_qty'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved quantity found for item '{item_name}'"
            )
        
        # Check current purchases
        query = """
            SELECT COALESCE(SUM(quantity), 0) as current_purchased
            FROM equipment
            WHERE project_id = %s AND name = %s
        """
        params = [project_id, item_name]
        
        if exclude_equipment_id:
            query += " AND equipment_id != %s"
            params.append(exclude_equipment_id)
        
        cursor.execute(query, params)
        current = cursor.fetchone()
        
        if int(current['current_purchased']) + quantity > int(result['approved_qty']):
            raise HTTPException(
                status_code=400,
                detail=f"Quantity exceeds approved limit for '{item_name}'"
            )
    
    def _validate_equipment_cost_against_breakdown(self, project_id: int, item_name: str,
                                                   unit_cost: float, quantity: int, cursor):
        """Validate that total equipment cost doesn't exceed allocated budget"""
        # Get total approved budget
        cursor.execute("""
            SELECT SUM(quantity * unit_cost) as approved_total_budget
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        """, (project_id, item_name))
        
        result = cursor.fetchone()
        if not result or not result['approved_total_budget']:
            raise HTTPException(
                status_code=400,
                detail=f"No approved budget found for item '{item_name}'"
            )
        
        approved_total = float(result['approved_total_budget'])
        
        # Get current spending
        cursor.execute("""
            SELECT COALESCE(SUM(quantity * unit_cost), 0) as current_spent
            FROM equipment
            WHERE project_id = %s AND name = %s
        """, (project_id, item_name))
        
        current = cursor.fetchone()
        current_spent = float(current['current_spent'])
        
        new_cost = unit_cost * quantity
        if current_spent + new_cost > approved_total:
            raise HTTPException(
                status_code=400,
                detail=f"Total cost for '{item_name}' exceeds approved budget"
            )
    
    def _check_expenditure_against_funds(self, project_id: int, head: str,
                                        amount: float, cursor):
        """Check if expenditure exceeds available funds"""
        cursor.execute("""
            SELECT 
                COALESCE(SUM(fr.amount), 0) as total_received,
                COALESCE(SUM(e.total_cost), 0) as total_spent
            FROM funds_received fr
            LEFT JOIN expenditures e ON fr.project_id = e.project_id 
                AND fr.head = e.head
            WHERE fr.project_id = %s AND fr.head = %s
            GROUP BY fr.project_id, fr.head
        """, (project_id, head))
        
        result = cursor.fetchone()
        
        if result:
            available = float(result['total_received']) - float(result['total_spent'])
            if amount > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient funds. Available: ₹{available:,.2f}, Attempting: ₹{amount:,.2f}"
                )