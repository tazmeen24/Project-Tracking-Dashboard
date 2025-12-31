"""
Expenditure Service
Handles all business logic related to expenditures across different heads

 Completely rewritten to match actual database schema
- manpower table: Uses role, salary_per_month, months, date_incurred (NOT name, date_of_joining/leaving)
- equipment table: Uses name, purchase_date, quantity, unit_cost (NOT vendor, invoice details)
- budget_expenditure table: For consumables, contingency, travel & training, overhead
- NO 'expenditures' table exists
- total_cost is auto-calculated, cannot be inserted
- Removed all non-existent audit columns
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
    
    def create_manpower_expenditure(self, manpower_data: dict) -> dict:
        """
        Create a new manpower expenditure record
        
        Schema: manpower(project_id, role, salary_per_month, months, num_personnel, date_incurred)
        Note: total_cost is auto-calculated
        
        Args:
            manpower_data: Dictionary containing manpower information
            
        Returns:
            Created manpower record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = manpower_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate transaction date
                date_incurred = manpower_data.get('date_incurred')
                if date_incurred:
                    self._validate_transaction_date(project_id, date_incurred, cur)
                
                # Validate against allocation breakdown
                self._validate_manpower_against_allocation(
                    project_id,
                    manpower_data['role'],
                    manpower_data.get('num_personnel', 1),
                    cur
                )
                
                # Insert manpower record
                # NOTE: Do NOT insert total_cost - it's auto-calculated
                cur.execute("""
                    INSERT INTO manpower
                    (project_id, role, salary_per_month, months, num_personnel, date_incurred)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    project_id,
                    manpower_data['role'],
                    manpower_data['salary_per_month'],
                    manpower_data['months'],
                    manpower_data.get('num_personnel', 1),
                    date_incurred
                ))
                
                result = cur.fetchone()
                manpower_id = result['manpower_id']
                
                self.conn.commit()
                
                return self.get_manpower_by_id(manpower_id)
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_manpower(self, project_id: Optional[int] = None, 
                        role: Optional[str] = None,
                        skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all manpower records with optional filters"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    m.*,
                    p.title as project_title,
                    p.project_no
                FROM manpower m
                LEFT JOIN projects p ON m.project_id = p.project_id
                WHERE 1=1
            """
            
            params = []
            if project_id:
                query += " AND m.project_id = %s"
                params.append(project_id)
            
            if role:
                query += " AND m.role = %s"
                params.append(role)
            
            query += " ORDER BY m.date_incurred DESC LIMIT %s OFFSET %s"
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
    
    def update_manpower(self, manpower_id: int, manpower_data: dict) -> dict:
        """
        Update an existing manpower record
        Note: total_cost will be recalculated automatically
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if record exists
                cur.execute("SELECT * FROM manpower WHERE manpower_id = %s", (manpower_id,))
                current = cur.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Manpower record not found")
                
                # Build update query
                update_fields = []
                update_values = []
                
                allowed_fields = ['role', 'salary_per_month', 'months', 'num_personnel', 'date_incurred']
                
                for field in allowed_fields:
                    if field in manpower_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(manpower_data[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_values.append(manpower_id)
                
                query = f"""
                    UPDATE manpower 
                    SET {', '.join(update_fields)}
                    WHERE manpower_id = %s
                """
                
                cur.execute(query, update_values)
                self.conn.commit()
                
                return self.get_manpower_by_id(manpower_id)
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_manpower(self, manpower_id: int) -> dict:
        """Delete a manpower record"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("SELECT * FROM manpower WHERE manpower_id = %s", (manpower_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Manpower record not found")
                
                cur.execute("DELETE FROM manpower WHERE manpower_id = %s", (manpower_id,))
                self.conn.commit()
                
                return {"message": "Manpower record deleted successfully"}
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== Equipment Expenditure ====================
    
    def create_equipment_expenditure(self, equipment_data: dict) -> dict:
        """
        Create a new equipment expenditure record
        
        Schema: equipment(project_id, name, purchase_date, quantity, unit_cost)
        Note: total_cost is auto-calculated
        
        Args:
            equipment_data: Dictionary containing equipment information
            
        Returns:
            Created equipment record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = equipment_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate transaction date
                purchase_date = equipment_data.get('purchase_date')
                if purchase_date:
                    self._validate_transaction_date(project_id, purchase_date, cur)
                
                # Validate against allocation breakdown
                self._validate_equipment_against_allocation(
                    project_id,
                    equipment_data['name'],
                    equipment_data['quantity'],
                    cur
                )
                
                # Insert equipment record
                # NOTE: Do NOT insert total_cost - it's auto-calculated
                cur.execute("""
                    INSERT INTO equipment
                    (project_id, name, purchase_date, quantity, unit_cost)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    project_id,
                    equipment_data['name'],
                    purchase_date,
                    equipment_data['quantity'],
                    equipment_data['unit_cost']
                ))
                
                result = cur.fetchone()
                equipment_id = result['equipment_id']
                
                self.conn.commit()
                
                return self.get_equipment_by_id(equipment_id)
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_equipment(self, project_id: Optional[int] = None,
                         name: Optional[str] = None,
                         skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all equipment records with optional filters"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    e.*,
                    p.title as project_title,
                    p.project_no
                FROM equipment e
                LEFT JOIN projects p ON e.project_id = p.project_id
                WHERE 1=1
            """
            
            params = []
            if project_id:
                query += " AND e.project_id = %s"
                params.append(project_id)
            
            if name:
                query += " AND e.name ILIKE %s"
                params.append(f"%{name}%")
            
            query += " ORDER BY e.purchase_date DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_equipment_by_id(self, equipment_id: int) -> dict:
        """Get a single equipment record by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    e.*,
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
    
    def update_equipment(self, equipment_id: int, equipment_data: dict) -> dict:
        """
        Update an existing equipment record
        Note: total_cost will be recalculated automatically
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if record exists
                cur.execute("SELECT * FROM equipment WHERE equipment_id = %s", (equipment_id,))
                current = cur.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Equipment record not found")
                
                # Build update query
                update_fields = []
                update_values = []
                
                allowed_fields = ['name', 'purchase_date', 'quantity', 'unit_cost']
                
                for field in allowed_fields:
                    if field in equipment_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(equipment_data[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_values.append(equipment_id)
                
                query = f"""
                    UPDATE equipment 
                    SET {', '.join(update_fields)}
                    WHERE equipment_id = %s
                """
                
                cur.execute(query, update_values)
                self.conn.commit()
                
                return self.get_equipment_by_id(equipment_id)
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_equipment(self, equipment_id: int) -> dict:
        """Delete an equipment record"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("SELECT * FROM equipment WHERE equipment_id = %s", (equipment_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Equipment record not found")
                
                cur.execute("DELETE FROM equipment WHERE equipment_id = %s", (equipment_id,))
                self.conn.commit()
                
                return {"message": "Equipment record deleted successfully"}
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== Budget Expenditure (Consumables, Contingency, etc.) ====================
    
    def create_budget_expenditure(self, expenditure_data: dict) -> dict:
        """
        Create budget expenditure for: consumables, contingency, travel & training, overhead
        
        Schema: budget_expenditure(project_id, head, amount, date_incurred, description)
        
        Args:
            expenditure_data: Dictionary containing expenditure information
            
        Returns:
            Created expenditure record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = expenditure_data['project_id']
                head = expenditure_data['head']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate head
                valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
                if head not in valid_heads:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid head. Must be one of: {', '.join(valid_heads)}. "
                               f"Use manpower/equipment services for those categories."
                    )
                
                # Validate transaction date
                date_incurred = expenditure_data.get('date_incurred')
                if date_incurred:
                    self._validate_transaction_date(project_id, date_incurred, cur)
                
                # Insert expenditure record
                cur.execute("""
                    INSERT INTO budget_expenditure
                    (project_id, head, amount, date_incurred, description)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    project_id,
                    head,
                    expenditure_data['amount'],
                    date_incurred,
                    expenditure_data.get('description')
                ))
                
                result = cur.fetchone()
                expenditure_id = result['expenditure_id']
                
                self.conn.commit()
                
                return self.get_budget_expenditure_by_id(expenditure_id)
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_budget_expenditure(self, project_id: Optional[int] = None,
                                   head: Optional[str] = None,
                                   skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all budget expenditure records with optional filters"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    be.*,
                    p.title as project_title,
                    p.project_no
                FROM budget_expenditure be
                LEFT JOIN projects p ON be.project_id = p.project_id
                WHERE 1=1
            """
            
            params = []
            if project_id:
                query += " AND be.project_id = %s"
                params.append(project_id)
            
            if head:
                query += " AND be.head = %s"
                params.append(head)
            
            query += " ORDER BY be.date_incurred DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_budget_expenditure_by_id(self, expenditure_id: int) -> dict:
        """Get a single budget expenditure record by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    be.*,
                    p.title as project_title,
                    p.project_no
                FROM budget_expenditure be
                LEFT JOIN projects p ON be.project_id = p.project_id
                WHERE be.expenditure_id = %s
            """, (expenditure_id,))
            
            expenditure = cur.fetchone()
            if not expenditure:
                raise HTTPException(status_code=404, detail="Expenditure record not found")
            
            return dict(expenditure)
    
    def update_budget_expenditure(self, expenditure_id: int, expenditure_data: dict) -> dict:
        """Update a budget expenditure record"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if record exists
                cur.execute("SELECT * FROM budget_expenditure WHERE expenditure_id = %s", 
                          (expenditure_id,))
                current = cur.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Expenditure record not found")
                
                # Build update query
                update_fields = []
                update_values = []
                
                allowed_fields = ['head', 'amount', 'date_incurred', 'description']
                
                for field in allowed_fields:
                    if field in expenditure_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(expenditure_data[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_values.append(expenditure_id)
                
                query = f"""
                    UPDATE budget_expenditure 
                    SET {', '.join(update_fields)}
                    WHERE expenditure_id = %s
                """
                
                cur.execute(query, update_values)
                self.conn.commit()
                
                return self.get_budget_expenditure_by_id(expenditure_id)
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_budget_expenditure(self, expenditure_id: int) -> dict:
        """Delete a budget expenditure record"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("SELECT * FROM budget_expenditure WHERE expenditure_id = %s", 
                          (expenditure_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Expenditure record not found")
                
                cur.execute("DELETE FROM budget_expenditure WHERE expenditure_id = %s", 
                          (expenditure_id,))
                self.conn.commit()
                
                return {"message": "Expenditure record deleted successfully"}
                
            except HTTPException:
                self.conn.rollback()
                raise
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== Summary Methods ====================
    
    def get_project_expenditure_summary(self, project_id: int) -> dict:
        """
        Get comprehensive expenditure summary for a project across all heads
        
        Returns total expenditure from: manpower, equipment, and budget_expenditure tables
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Manpower
            cur.execute("""
                SELECT COALESCE(SUM(total_cost), 0) as total
                FROM manpower WHERE project_id = %s
            """, (project_id,))
            manpower_total = float(cur.fetchone()['total'])
            
            # Equipment
            cur.execute("""
                SELECT COALESCE(SUM(total_cost), 0) as total
                FROM equipment WHERE project_id = %s
            """, (project_id,))
            equipment_total = float(cur.fetchone()['total'])
            
            # Budget expenditure by head
            cur.execute("""
                SELECT head, COALESCE(SUM(amount), 0) as total
                FROM budget_expenditure 
                WHERE project_id = %s
                GROUP BY head
            """, (project_id,))
            budget_exp = {row['head']: float(row['total']) for row in cur.fetchall()}
            
            return {
                "project_id": project_id,
                "manpower_expenditure": manpower_total,
                "equipment_expenditure": equipment_total,
                "consumables_expenditure": budget_exp.get('consumables', 0),
                "contingency_expenditure": budget_exp.get('contingency', 0),
                "travel_training_expenditure": budget_exp.get('travel & training', 0),
                "overhead_expenditure": budget_exp.get('overhead', 0),
                "total_expenditure": manpower_total + equipment_total + sum(budget_exp.values())
            }
    
    # ==================== Helper Methods ====================
    
    def _validate_foreign_key(self, table: str, column: str, value: int, cursor):
        """Validate that a foreign key exists"""
        cursor.execute(f"SELECT 1 FROM {table} WHERE {column} = %s", (value,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {column}: {value} does not exist in {table}"
            )
    
    def _validate_transaction_date(self, project_id: int, transaction_date: str, cursor):
        """Check if transaction date falls within project duration"""
        if isinstance(transaction_date, str):
            trans_date = datetime.strptime(transaction_date, '%Y-%m-%d').date()
        else:
            trans_date = transaction_date
        
        cursor.execute("""
            SELECT start_date, end_date
            FROM projects
            WHERE project_id = %s
        """, (project_id,))
        
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if trans_date < project['start_date']:
            raise HTTPException(
                status_code=400,
                detail=f"Transaction date {trans_date} is before project start date {project['start_date']}"
            )
        
        if project['end_date'] and trans_date > project['end_date']:
            # Just a warning, don't block
            pass
    
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