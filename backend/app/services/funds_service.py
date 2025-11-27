"""
Funds Service
Handles all business logic related to funds received, budget allocations, and breakdowns
"""

from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from datetime import datetime, date
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor


class FundsService:
    """Service class for funds-related operations"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    # ==================== Funds Received ====================
    
    def create_funds_received(self, funds_data: dict, user: dict) -> dict:
        """
        Record new funds received for a project
        
        Args:
            funds_data: Dictionary containing funds information
            user: Current authenticated user
            
        Returns:
            Created funds record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = funds_data['project_id']
                head = funds_data['head']
                amount = funds_data['amount']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Validate head
                valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 
                              'travel & training', 'overhead']
                if head not in valid_heads:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid head. Must be one of: {', '.join(valid_heads)}"
                    )
                
                # Check if budget allocation exists for this head
                cur.execute("""
                    SELECT allocated_amount FROM budget_allocations
                    WHERE project_id = %s AND head = %s
                """, (project_id, head))
                
                allocation = cur.fetchone()
                if not allocation:
                    raise HTTPException(
                        status_code=400,
                        detail=f"No budget allocation found for head '{head}' in this project"
                    )
                
                # Check if total funds received would exceed allocated amount
                cur.execute("""
                    SELECT COALESCE(SUM(amount), 0) as total_received
                    FROM funds_received
                    WHERE project_id = %s AND head = %s
                """, (project_id, head))
                
                current = cur.fetchone()
                current_total = float(current['total_received'])
                allocated_amount = float(allocation['allocated_amount'])
                
                if current_total + amount > allocated_amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Total funds received (₹{current_total + amount:,.2f}) would exceed "
                               f"allocated amount (₹{allocated_amount:,.2f}) for head '{head}'"
                    )
                
                # Validate date format
                date_received = funds_data.get('date_received')
                if date_received:
                    try:
                        datetime.strptime(date_received, '%Y-%m-%d')
                    except ValueError:
                        raise HTTPException(
                            status_code=400,
                            detail="Date must be in YYYY-MM-DD format"
                        )
                
                # Insert funds received record
                cur.execute("""
                    INSERT INTO funds_received
                    (project_id, head, amount, date_received, remarks, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING fund_id
                """, (
                    project_id,
                    head,
                    amount,
                    date_received,
                    funds_data.get('remarks'),
                    user['user_id'],
                    user['user_id']
                ))
                
                fund_id = cur.fetchone()['fund_id']
                self.conn.commit()
                
                return self.get_funds_received_by_id(fund_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_funds_received(self, project_id: Optional[int] = None,
                               head: Optional[str] = None,
                               skip: int = 0, limit: int = 100) -> List[dict]:
        """
        Get all funds received records with optional filters
        
        Args:
            project_id: Optional project ID filter
            head: Optional budget head filter
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of funds received records
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    fr.*,
                    p.project_no,
                    p.title as project_title
                FROM funds_received fr
                LEFT JOIN projects p ON fr.project_id = p.project_id
                WHERE 1=1
            """
            
            params = []
            if project_id:
                query += " AND fr.project_id = %s"
                params.append(project_id)
            
            if head:
                query += " AND fr.head = %s"
                params.append(head)
            
            query += " ORDER BY fr.date_received DESC, fr.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_funds_received_by_id(self, fund_id: int) -> dict:
        """
        Get a single funds received record by ID
        
        Args:
            fund_id: Funds received ID
            
        Returns:
            Funds received record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    fr.*,
                    p.project_no,
                    p.title as project_title
                FROM funds_received fr
                LEFT JOIN projects p ON fr.project_id = p.project_id
                WHERE fr.fund_id = %s
            """, (fund_id,))
            
            funds = cur.fetchone()
            if not funds:
                raise HTTPException(status_code=404, detail="Funds record not found")
            
            return dict(funds)
    
    def update_funds_received(self, fund_id: int, funds_data: dict, user: dict) -> dict:
        """
        Update a funds received record
        
        Args:
            fund_id: Funds received ID
            funds_data: Updated funds data
            user: Current authenticated user
            
        Returns:
            Updated funds record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if record exists
                cur.execute("""
                    SELECT * FROM funds_received WHERE fund_id = %s
                """, (fund_id,))
                
                current = cur.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Funds record not found")
                
                # Build update query
                update_fields = []
                update_values = []
                
                allowed_fields = ['head', 'amount', 'date_received', 'remarks']
                
                for field in allowed_fields:
                    if field in funds_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(funds_data[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_fields.append("updated_by = %s")
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                update_values.extend([user['user_id'], fund_id])
                
                query = f"""
                    UPDATE funds_received 
                    SET {', '.join(update_fields)}
                    WHERE fund_id = %s
                """
                
                cur.execute(query, update_values)
                self.conn.commit()
                
                return self.get_funds_received_by_id(fund_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_funds_received(self, fund_id: int) -> dict:
        """
        Delete a funds received record
        
        Args:
            fund_id: Funds received ID
            
        Returns:
            Success message
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("SELECT 1 FROM funds_received WHERE fund_id = %s", (fund_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Funds record not found")
                
                # Delete the record
                cur.execute("DELETE FROM funds_received WHERE fund_id = %s", (fund_id,))
                self.conn.commit()
                
                return {"message": "Funds record deleted successfully"}
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_funds_summary_by_project(self, project_id: int) -> List[dict]:
        """
        Get funds received summary grouped by head for a project
        
        Args:
            project_id: Project ID
            
        Returns:
            List of funds summary by head
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    ba.head,
                    ba.allocated_amount,
                    COALESCE(SUM(fr.amount), 0) as total_received,
                    COUNT(fr.fund_id) as transaction_count
                FROM budget_allocations ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id 
                    AND ba.head = fr.head
                WHERE ba.project_id = %s
                GROUP BY ba.head, ba.allocated_amount
                ORDER BY ba.head
            """, (project_id,))
            
            return [dict(row) for row in cur.fetchall()]
    
    # ==================== Budget Allocations ====================
    
    def create_budget_allocation(self, allocation_data: dict, user: dict) -> dict:
        """
        Create a budget allocation for a project
        
        Args:
            allocation_data: Dictionary containing allocation information
            user: Current authenticated user
            
        Returns:
            Created allocation record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = allocation_data['project_id']
                head = allocation_data['head']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Check if allocation already exists for this head
                cur.execute("""
                    SELECT 1 FROM budget_allocations
                    WHERE project_id = %s AND head = %s
                """, (project_id, head))
                
                if cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail=f"Budget allocation already exists for head '{head}' in this project"
                    )
                
                # Insert allocation
                cur.execute("""
                    INSERT INTO budget_allocations
                    (project_id, head, allocated_amount, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING allocation_id
                """, (
                    project_id,
                    head,
                    allocation_data['allocated_amount'],
                    user['user_id'],
                    user['user_id']
                ))
                
                allocation_id = cur.fetchone()['allocation_id']
                
                # Insert breakdown data if provided
                if head == 'manpower' and 'manpower_breakdown' in allocation_data:
                    for item in allocation_data['manpower_breakdown']:
                        cur.execute("""
                            INSERT INTO manpower_allocation_breakdown
                            (project_id, role, salary_per_month, months, num_personnel)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (
                            project_id,
                            item['role'],
                            item['salary_per_month'],
                            item['months'],
                            item.get('num_personnel', 1)
                        ))
                
                if head == 'equipment' and 'equipment_breakdown' in allocation_data:
                    for item in allocation_data['equipment_breakdown']:
                        cur.execute("""
                            INSERT INTO equipment_allocation_breakdown
                            (project_id, item_name, quantity, unit_cost)
                            VALUES (%s, %s, %s, %s)
                        """, (
                            project_id,
                            item['item_name'],
                            item['quantity'],
                            item['unit_cost']
                        ))
                
                self.conn.commit()
                return self.get_budget_allocation_by_id(allocation_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_budget_allocations(self, project_id: Optional[int] = None,
                                   skip: int = 0, limit: int = 100) -> List[dict]:
        """
        Get all budget allocations with optional project filter
        
        Args:
            project_id: Optional project ID filter
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of budget allocations
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    ba.*,
                    p.project_no,
                    p.title as project_title
                FROM budget_allocations ba
                LEFT JOIN projects p ON ba.project_id = p.project_id
            """
            
            params = []
            if project_id:
                query += " WHERE ba.project_id = %s"
                params.append(project_id)
            
            query += " ORDER BY ba.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_budget_allocation_by_id(self, allocation_id: int) -> dict:
        """
        Get a single budget allocation by ID
        
        Args:
            allocation_id: Budget allocation ID
            
        Returns:
            Budget allocation record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    ba.*,
                    p.project_no,
                    p.title as project_title
                FROM budget_allocations ba
                LEFT JOIN projects p ON ba.project_id = p.project_id
                WHERE ba.allocation_id = %s
            """, (allocation_id,))
            
            allocation = cur.fetchone()
            if not allocation:
                raise HTTPException(status_code=404, detail="Budget allocation not found")
            
            return dict(allocation)
    
    def update_budget_allocation(self, allocation_id: int, 
                                allocation_data: dict, user: dict) -> dict:
        """
        Update a budget allocation
        
        Args:
            allocation_id: Budget allocation ID
            allocation_data: Updated allocation data
            user: Current authenticated user
            
        Returns:
            Updated allocation record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if record exists
                cur.execute("""
                    SELECT * FROM budget_allocations WHERE allocation_id = %s
                """, (allocation_id,))
                
                current = cur.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Budget allocation not found")
                
                # Update allocation amount if provided
                if 'allocated_amount' in allocation_data:
                    cur.execute("""
                        UPDATE budget_allocations
                        SET allocated_amount = %s, updated_by = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE allocation_id = %s
                    """, (allocation_data['allocated_amount'], user['user_id'], allocation_id))
                
                self.conn.commit()
                return self.get_budget_allocation_by_id(allocation_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== Manpower Breakdown ====================
    
    def create_manpower_breakdown(self, breakdown_data: dict, user: dict) -> dict:
        """
        Add manpower breakdown item to budget allocation
        
        Args:
            breakdown_data: Dictionary containing manpower breakdown information
            user: Current authenticated user
            
        Returns:
            Created breakdown record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = breakdown_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Check if manpower allocation exists
                cur.execute("""
                    SELECT 1 FROM budget_allocations
                    WHERE project_id = %s AND head = 'manpower'
                """, (project_id,))
                
                if not cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Manpower budget allocation must exist before adding breakdown"
                    )
                
                # Insert breakdown
                cur.execute("""
                    INSERT INTO manpower_allocation_breakdown
                    (project_id, role, salary_per_month, months, num_personnel)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING breakdown_id
                """, (
                    project_id,
                    breakdown_data['role'],
                    breakdown_data['salary_per_month'],
                    breakdown_data['months'],
                    breakdown_data.get('num_personnel', 1)
                ))
                
                breakdown_id = cur.fetchone()['breakdown_id']
                self.conn.commit()
                
                return self.get_manpower_breakdown_by_id(breakdown_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_manpower_breakdown_by_project(self, project_id: int) -> List[dict]:
        """Get all manpower breakdown items for a project"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM manpower_allocation_breakdown
                WHERE project_id = %s
                ORDER BY role
            """, (project_id,))
            
            return [dict(row) for row in cur.fetchall()]
    
    def get_manpower_breakdown_by_id(self, breakdown_id: int) -> dict:
        """Get a single manpower breakdown item by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM manpower_allocation_breakdown
                WHERE breakdown_id = %s
            """, (breakdown_id,))
            
            breakdown = cur.fetchone()
            if not breakdown:
                raise HTTPException(status_code=404, detail="Manpower breakdown not found")
            
            return dict(breakdown)
    
    # ==================== Equipment Breakdown ====================
    
    def create_equipment_breakdown(self, breakdown_data: dict, user: dict) -> dict:
        """
        Add equipment breakdown item to budget allocation
        
        Args:
            breakdown_data: Dictionary containing equipment breakdown information
            user: Current authenticated user
            
        Returns:
            Created breakdown record
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                project_id = breakdown_data['project_id']
                
                # Validate project exists
                self._validate_foreign_key('projects', 'project_id', project_id, cur)
                
                # Check if equipment allocation exists
                cur.execute("""
                    SELECT 1 FROM budget_allocations
                    WHERE project_id = %s AND head = 'equipment'
                """, (project_id,))
                
                if not cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Equipment budget allocation must exist before adding breakdown"
                    )
                
                # Insert breakdown
                cur.execute("""
                    INSERT INTO equipment_allocation_breakdown
                    (project_id, item_name, quantity, unit_cost)
                    VALUES (%s, %s, %s, %s)
                    RETURNING breakdown_id
                """, (
                    project_id,
                    breakdown_data['item_name'],
                    breakdown_data['quantity'],
                    breakdown_data['unit_cost']
                ))
                
                breakdown_id = cur.fetchone()['breakdown_id']
                self.conn.commit()
                
                return self.get_equipment_breakdown_by_id(breakdown_id)
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_equipment_breakdown_by_project(self, project_id: int) -> List[dict]:
        """Get all equipment breakdown items for a project"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM equipment_allocation_breakdown
                WHERE project_id = %s
                ORDER BY item_name
            """, (project_id,))
            
            return [dict(row) for row in cur.fetchall()]
    
    def get_equipment_breakdown_by_id(self, breakdown_id: int) -> dict:
        """Get a single equipment breakdown item by ID"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM equipment_allocation_breakdown
                WHERE breakdown_id = %s
            """, (breakdown_id,))
            
            breakdown = cur.fetchone()
            if not breakdown:
                raise HTTPException(status_code=404, detail="Equipment breakdown not found")
            
            return dict(breakdown)
    
    # ==================== Helper Methods ====================
    
    def _validate_foreign_key(self, table: str, column: str, value: int, cursor):
        """Validate that a foreign key exists"""
        cursor.execute(f"SELECT 1 FROM {table} WHERE {column} = %s", (value,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {column}: {value} does not exist in {table}"
            )