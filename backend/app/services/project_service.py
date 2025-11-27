"""
Project Service
Handles all business logic related to projects
"""

from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from datetime import datetime, date
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor


class ProjectService:
    """Service class for project-related operations"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    def create_project(self, project_data: dict, user: dict) -> dict:
        """
        Create a new project with budget allocations and breakdowns
        
        Args:
            project_data: Dictionary containing project information
            user: Current authenticated user
            
        Returns:
            Created project data with ID
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Validate foreign keys
                self._validate_foreign_key('funding_agencies', 'agency_id', 
                                          project_data['funding_agency_id'], cur)
                self._validate_foreign_key('technical_groups', 'group_id', 
                                          project_data['technical_group_id'], cur)
                
                # Insert project
                cur.execute("""
                    INSERT INTO projects 
                    (project_no, title, alias, start_date, end_date, 
                     funding_agency_id, technical_group_id, 
                     principal_investigator, co_pi, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING project_id
                """, (
                    project_data['project_no'],
                    project_data['title'],
                    project_data.get('alias'),
                    project_data['start_date'],
                    project_data.get('end_date'),
                    project_data['funding_agency_id'],
                    project_data['technical_group_id'],
                    project_data.get('principal_investigator'),
                    project_data.get('co_pi'),
                    user['user_id'],
                    user['user_id']
                ))
                
                project_id = cur.fetchone()['project_id']
                
                # Insert budget allocations
                budget_heads = [
                    ('manpower', project_data.get('manpower_allocation', 0.0)),
                    ('equipment', project_data.get('equipment_allocation', 0.0)),
                    ('consumables', project_data.get('consumables_allocation', 0.0)),
                    ('contingency', project_data.get('contingency_allocation', 0.0)),
                    ('travel & training', project_data.get('travel_training_allocation', 0.0)),
                    ('overhead', project_data.get('overhead_allocation', 0.0))
                ]
                
                for head, amount in budget_heads:
                    if amount > 0:
                        cur.execute("""
                            INSERT INTO budget_allocations 
                            (project_id, head, allocated_amount, created_by, updated_by)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (project_id, head, amount, user['user_id'], user['user_id']))
                
                # Insert manpower breakdown if provided
                manpower_breakdown = project_data.get('manpower_breakdown', [])
                for item in manpower_breakdown:
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
                
                # Insert equipment breakdown if provided
                equipment_breakdown = project_data.get('equipment_breakdown', [])
                for item in equipment_breakdown:
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
                
                # Return created project
                return self.get_project_by_id(project_id)
                
            except psycopg2.IntegrityError as e:
                self.conn.rollback()
                if 'duplicate key' in str(e):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Project with number '{project_data['project_no']}' already exists"
                    )
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_all_projects(self, skip: int = 0, limit: int = 100, 
                        status_filter: Optional[str] = None) -> List[dict]:
        """
        Get all projects with pagination and optional status filter
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            status_filter: Filter by project status (active, completed, all)
            
        Returns:
            List of projects
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    p.*,
                    fa.name as funding_agency_name,
                    tg.name as technical_group_name,
                    COALESCE(SUM(fr.amount), 0) as total_funds_received,
                    COALESCE(SUM(e.total_cost), 0) as total_expenditure
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN expenditures e ON p.project_id = e.project_id
            """
            
            # Apply status filter
            if status_filter == 'active':
                query += " WHERE p.end_date IS NULL OR p.end_date >= CURRENT_DATE"
            elif status_filter == 'completed':
                query += " WHERE p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE"
            
            query += """
                GROUP BY p.project_id, fa.name, tg.name
                ORDER BY p.created_at DESC
                LIMIT %s OFFSET %s
            """
            
            cur.execute(query, (limit, skip))
            projects = cur.fetchall()
            
            return [dict(project) for project in projects]
    
    def get_project_by_id(self, project_id: int) -> dict:
        """
        Get a single project by ID with all related data
        
        Args:
            project_id: Project ID
            
        Returns:
            Project data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    p.*,
                    fa.name as funding_agency_name,
                    tg.name as technical_group_name
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                WHERE p.project_id = %s
            """, (project_id,))
            
            project = cur.fetchone()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            
            project_dict = dict(project)
            
            # Get budget allocations
            cur.execute("""
                SELECT * FROM budget_allocations
                WHERE project_id = %s
            """, (project_id,))
            project_dict['budget_allocations'] = [dict(row) for row in cur.fetchall()]
            
            # Get manpower breakdown
            cur.execute("""
                SELECT * FROM manpower_allocation_breakdown
                WHERE project_id = %s
            """, (project_id,))
            project_dict['manpower_breakdown'] = [dict(row) for row in cur.fetchall()]
            
            # Get equipment breakdown
            cur.execute("""
                SELECT * FROM equipment_allocation_breakdown
                WHERE project_id = %s
            """, (project_id,))
            project_dict['equipment_breakdown'] = [dict(row) for row in cur.fetchall()]
            
            return project_dict
    
    def update_project(self, project_id: int, project_data: dict, user: dict) -> dict:
        """
        Update an existing project
        
        Args:
            project_id: Project ID
            project_data: Updated project data
            user: Current authenticated user
            
        Returns:
            Updated project data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                # Check if project exists
                cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Project not found")
                
                # Validate foreign keys if provided
                if 'funding_agency_id' in project_data:
                    self._validate_foreign_key('funding_agencies', 'agency_id', 
                                              project_data['funding_agency_id'], cur)
                
                if 'technical_group_id' in project_data:
                    self._validate_foreign_key('technical_groups', 'group_id', 
                                              project_data['technical_group_id'], cur)
                
                # Build update query dynamically
                update_fields = []
                update_values = []
                
                allowed_fields = [
                    'project_no', 'title', 'alias', 'start_date', 'end_date',
                    'funding_agency_id', 'technical_group_id', 
                    'principal_investigator', 'co_pi'
                ]
                
                for field in allowed_fields:
                    if field in project_data:
                        update_fields.append(f"{field} = %s")
                        update_values.append(project_data[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No valid fields to update")
                
                update_fields.append("updated_by = %s")
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                update_values.extend([user['user_id'], project_id])
                
                query = f"""
                    UPDATE projects 
                    SET {', '.join(update_fields)}
                    WHERE project_id = %s
                """
                
                cur.execute(query, update_values)
                self.conn.commit()
                
                return self.get_project_by_id(project_id)
                
            except psycopg2.IntegrityError as e:
                self.conn.rollback()
                if 'duplicate key' in str(e):
                    raise HTTPException(
                        status_code=400,
                        detail="Project number already exists"
                    )
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def delete_project(self, project_id: int) -> dict:
        """
        Delete a project (soft delete by setting deleted flag)
        
        Args:
            project_id: Project ID
            
        Returns:
            Success message
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Project not found")
                
                # Check if project has dependencies
                cur.execute("""
                    SELECT COUNT(*) as count FROM expenditures WHERE project_id = %s
                """, (project_id,))
                
                expenditure_count = cur.fetchone()['count']
                if expenditure_count > 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot delete project with {expenditure_count} expenditure records"
                    )
                
                # Delete project
                cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))
                self.conn.commit()
                
                return {"message": "Project deleted successfully"}
                
            except Exception as e:
                self.conn.rollback()
                raise HTTPException(status_code=500, detail=str(e))
    
    def get_project_summary(self, project_id: int) -> dict:
        """
        Get comprehensive summary of a project including budget, funds, and expenditure
        
        Args:
            project_id: Project ID
            
        Returns:
            Project summary data
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get project basic info
            project = self.get_project_by_id(project_id)
            
            # Get budget allocation summary
            cur.execute("""
                SELECT 
                    head,
                    allocated_amount,
                    COALESCE(SUM(fr.amount), 0) as funds_received,
                    COALESCE(SUM(e.total_cost), 0) as expenditure
                FROM budget_allocations ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id 
                    AND ba.head = fr.head
                LEFT JOIN expenditures e ON ba.project_id = e.project_id 
                    AND ba.head = e.head
                WHERE ba.project_id = %s
                GROUP BY ba.head, ba.allocated_amount
            """, (project_id,))
            
            budget_summary = [dict(row) for row in cur.fetchall()]
            
            # Calculate totals
            total_allocated = sum(item['allocated_amount'] for item in budget_summary)
            total_received = sum(item['funds_received'] for item in budget_summary)
            total_spent = sum(item['expenditure'] for item in budget_summary)
            
            return {
                "project": project,
                "budget_summary": budget_summary,
                "totals": {
                    "allocated": float(total_allocated),
                    "received": float(total_received),
                    "spent": float(total_spent),
                    "balance": float(total_received - total_spent),
                    "utilization_percentage": round((total_spent / total_received * 100) if total_received > 0 else 0, 2)
                }
            }
    
    def _validate_foreign_key(self, table: str, column: str, value: int, cursor):
        """Validate that a foreign key exists"""
        cursor.execute(f"SELECT 1 FROM {table} WHERE {column} = %s", (value,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {column}: {value} does not exist in {table}"
            )