# app/routes/projects.py
from fastapi import APIRouter, HTTPException, Query
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.project import ProjectCreate
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("")
async def create_project(project: ProjectCreate):
    """Create a new project with budget allocations"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funding_agencies", "agency_id", project.funding_agency_id, conn)
            validate_foreign_key("technical_groups", "group_id", project.technical_group_id, conn)
            
            cur.execute(
                """INSERT INTO projects 
                   (project_no, title, alias, start_date, end_date, funding_agency_id, technical_group_id, principal_investigator, co_pi) 
                  VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (
                    project.project_no,
                    project.title,
                    project.alias if project.alias else None,
                    project.start_date,
                    project.end_date if project.end_date else None,
                    project.funding_agency_id,
                    project.technical_group_id,
                    project.principal_investigator,
                    project.co_pi
                )
            )
            project_result = cur.fetchone()
            project_id = project_result['project_id']
            
            # Create budget allocations
            budget_heads = [
                ('manpower', project.manpower_allocation, project.manpower_breakdown),
                ('equipment', project.equipment_allocation, project.equipment_breakdown),
                ('consumables', project.consumables_allocation, []),
                ('contingency', project.contingency_allocation, []),
                ('travel & training', project.travel_training_allocation, []),
                ('overhead', project.overhead_allocation, [])
            ]
            
            for head, amount, breakdown in budget_heads:
                cur.execute(
                    "INSERT INTO budget_allocation (project_id, head, allocated_amount) VALUES (%s, %s, %s) RETURNING allocation_id",
                    (project_id, head, amount)
                )
                allocation_id = cur.fetchone()['allocation_id']
                
                # Insert manpower breakdown
                if head == 'manpower' and breakdown:
                    for item in breakdown:
                        cur.execute(
                            """INSERT INTO manpower_allocation_breakdown 
                               (allocation_id, project_id, role, salary_per_month, months, num_personnel)
                               VALUES (%s, %s, %s, %s, %s, %s)""",
                            (allocation_id, project_id, item.role, 
                             item.salary_per_month, item.months, item.num_personnel)
                        )
                
                # Insert equipment breakdown
                if head == 'equipment' and breakdown:
                    for item in breakdown:
                        cur.execute(
                            """INSERT INTO equipment_allocation_breakdown 
                               (allocation_id, project_id, item_name, quantity, unit_cost)
                               VALUES (%s, %s, %s, %s, %s)""",
                            (allocation_id, project_id, item.item_name, 
                             item.quantity, item.unit_cost)
                        )
            
            conn.commit()
            
            cur.execute("""
                SELECT p.*, 
                       json_agg(
                           json_build_object(
                               'head', ba.head,
                               'allocated_amount', ba.allocated_amount
                           )
                       ) as budget_allocations
                FROM projects p
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                WHERE p.project_id = %s
                GROUP BY p.project_id
            """, (project_id,))
            
            final_result = cur.fetchone()
            return json.loads(json.dumps(dict(final_result), cls=DecimalEncoder))
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("")
async def get_projects():
    """Get all projects with summary"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT p.project_id,
                       p.project_no,
                       p.title,
                       p.alias,
                       tg.name AS technical_group_name,
                       fa.name AS funding_agency_name,
                       p.start_date,
                       p.end_date,
                       p.principal_investigator,
                       p.co_pi,
                       COALESCE(SUM(phs.planned_allocation), 0) AS planned_allocation,
                       COALESCE(SUM(phs.funds_received), 0) AS funds_received,
                       COALESCE(SUM(phs.actual_expenditure), 0) AS actual_expenditure
                FROM projects p
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN project_head_summary phs ON p.project_id = phs.project_id
                GROUP BY p.project_id, tg.name, fa.name
                ORDER BY p.start_date DESC
            """)
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/{project_id}")
async def get_project(project_id: int):
    """Get single project details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    p.alias,
                    tg.name AS technical_group_name,
                    fa.name AS funding_agency_name,
                    p.start_date,
                    p.end_date,
                    COALESCE(SUM(phs.planned_allocation), 0) AS planned_allocation,
                    COALESCE(SUM(phs.funds_received), 0) AS funds_received,
                    COALESCE(SUM(phs.actual_expenditure), 0) AS actual_expenditure,
                    COALESCE(SUM(phs.planned_allocation), 0) - COALESCE(SUM(phs.actual_expenditure), 0) AS budget_balance,
                    COALESCE(SUM(phs.funds_received), 0) - COALESCE(SUM(phs.actual_expenditure), 0) AS funding_balance
                FROM projects p
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN project_head_summary phs ON p.project_id = phs.project_id
                WHERE p.project_id = %s
                GROUP BY p.project_id, tg.name, fa.name
            """, (project_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Project not found")
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.delete("/{project_id}")
async def delete_project(project_id: int):
    """Delete a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM projects WHERE project_id = %s RETURNING *", (project_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Project not found")
            conn.commit()
            return {"message": "Project deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/{project_id}/manpower-allocation-breakdown")
async def get_project_manpower_allocation_breakdown(project_id: int):
    """Get manpower allocation breakdown for project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_allocation_breakdown WHERE project_id = %s",
                (project_id,)
            )
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{project_id}/equipment-allocation-breakdown")
async def get_project_equipment_allocation_breakdown(project_id: int):
    """Get equipment allocation breakdown for project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_allocation_breakdown WHERE project_id = %s",
                (project_id,)
            )
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{project_id}/approved-manpower-roles")
async def get_approved_manpower_roles(project_id: int):
    """Get list of approved manpower roles with availability"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    mab.role,
                    mab.salary_per_month,
                    mab.months,
                    SUM(mab.num_personnel) as approved_posts,
                    COALESCE(SUM(m.num_personnel), 0) as assigned_posts,
                    SUM(mab.num_personnel) - COALESCE(SUM(m.num_personnel), 0) as available_posts
                FROM manpower_allocation_breakdown mab
                LEFT JOIN manpower m ON mab.project_id = m.project_id AND mab.role = m.role
                WHERE mab.project_id = %s
                GROUP BY mab.role, mab.salary_per_month, mab.months
                HAVING SUM(mab.num_personnel) - COALESCE(SUM(m.num_personnel), 0) > 0
                ORDER BY mab.role
            """, (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{project_id}/approved-equipment-items")
async def get_approved_equipment_items(project_id: int):
    """Get list of approved equipment items with availability"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    eab.item_name,
                    eab.unit_cost,
                    SUM(eab.quantity) as approved_quantity,
                    COALESCE(SUM(e.quantity), 0) as purchased_quantity,
                    SUM(eab.quantity) - COALESCE(SUM(e.quantity), 0) as available_quantity
                FROM equipment_allocation_breakdown eab
                LEFT JOIN equipment e ON eab.project_id = e.project_id AND eab.item_name = e.name
                WHERE eab.project_id = %s
                GROUP BY eab.item_name, eab.unit_cost
                HAVING SUM(eab.quantity) - COALESCE(SUM(e.quantity), 0) > 0
                ORDER BY eab.item_name
            """, (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()