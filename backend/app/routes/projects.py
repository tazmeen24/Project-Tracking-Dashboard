# backend/app/routes/projects.py
from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import datetime
from typing import Optional
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.project import ProjectCreate, ProjectUpdate
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("")
async def create_project(project: ProjectCreate):
    """Create a new project with budget allocations and investigator details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funding_agencies", "agency_id", project.funding_agency_id, conn)
            validate_foreign_key("technical_groups", "group_id", project.technical_group_id, conn)
            
            # Create project with new fields
            cur.execute(
                """INSERT INTO projects 
                   (project_no, title, alias, start_date, end_date, funding_agency_id, technical_group_id,
                    project_category, project_type, PFMS_id) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (
                    project.project_no,
                    project.title,
                    project.alias if project.alias else None,
                    project.start_date,
                    project.end_date if project.end_date else None,
                    project.funding_agency_id,
                    project.technical_group_id,
                    project.project_category,
                    project.project_type,
                    project.PFMS_id if project.PFMS_id else None
                )
            )
            project_result = cur.fetchone()
            project_id = project_result['project_id']
            
            # Create investigator record
            cur.execute(
                """INSERT INTO investigators 
                   (project_id, principal_investigator, pi_email, pi_mobile, 
                    co_investigator, co_email, co_mobile)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (project_id, project.principal_investigator, project.pi_email, project.pi_mobile,
                 project.co_investigator, project.co_email, project.co_mobile)
            )
            
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
                               (allocation_id, project_id, role, salary_per_month, months, num_personnel, qualification, experience_required)
                               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                            (allocation_id, project_id, item.role, 
                             item.salary_per_month, item.months, item.num_personnel, item.qualification, item.experience_required)
                        )
                
                # Insert equipment breakdown
                if head == 'equipment' and breakdown:
                    for item in breakdown:
                        cur.execute(
                            """INSERT INTO equipment_allocation_breakdown 
                               (allocation_id, project_id, item_name, quantity, unit_cost, description, product_website)
                               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                            (allocation_id, project_id, item.item_name, 
                             item.quantity, item.unit_cost, item.description, item.product_website)
                        )
            
            conn.commit()
            
            # Return project with investigators and budget
            cur.execute("""
                SELECT p.*, 
                       i.principal_investigator, i.pi_email, i.pi_mobile,
                       i.co_investigator, i.co_email, i.co_mobile,
                       json_agg(
                           json_build_object(
                               'head', ba.head,
                               'allocated_amount', ba.allocated_amount
                           )
                       ) as budget_allocations
                FROM projects p
                LEFT JOIN investigators i ON p.project_id = i.project_id
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                WHERE p.project_id = %s
                GROUP BY p.project_id, i.id
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
                       p.project_category,
                       p.project_type,
                       p.PFMS_id,
                       tg.name AS technical_group_name,
                       fa.name AS funding_agency_name,
                       p.start_date,
                       p.end_date,
                       i.principal_investigator,
                       i.pi_email,
                       i.pi_mobile,
                       i.co_investigator,
                       i.co_email,
                       i.co_mobile,
                       COALESCE(SUM(phs.planned_allocation), 0) AS planned_allocation,
                       COALESCE(SUM(phs.funds_received), 0) AS funds_received,
                       COALESCE(SUM(phs.actual_expenditure), 0) AS actual_expenditure
                FROM projects p
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN investigators i ON p.project_id = i.project_id
                LEFT JOIN project_head_summary phs ON p.project_id = phs.project_id
                GROUP BY p.project_id, tg.name, fa.name, i.id
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
    """Get single project details with investigators"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    p.alias,
                    p.project_category,
                    p.project_type,
                    p.PFMS_id,
                    tg.name AS technical_group_name,
                    fa.name AS funding_agency_name,
                    p.start_date,
                    p.end_date,
                    i.principal_investigator,
                    i.pi_email,
                    i.pi_mobile,
                    i.co_investigator,
                    i.co_email,
                    i.co_mobile
                FROM projects p
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN investigators i ON p.project_id = i.project_id
                WHERE p.project_id = %s
            """, (project_id,))
            project = cur.fetchone()
            
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
                
            return json.loads(json.dumps(dict(project), cls=DecimalEncoder))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()


@router.put("/{project_id}")
async def update_project(project_id: int, project: ProjectUpdate):
    """Update project details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if project exists
            cur.execute("SELECT * FROM projects WHERE project_id = %s", (project_id,))
            existing_project = cur.fetchone()
            
            if not existing_project:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if project.project_no is not None:
                update_fields.append("project_no = %s")
                values.append(project.project_no)
            
            if project.title is not None:
                update_fields.append("title = %s")
                values.append(project.title)
            
            if project.alias is not None:
                update_fields.append("alias = %s")
                values.append(project.alias)
            
            if project.start_date is not None:
                update_fields.append("start_date = %s")
                values.append(project.start_date)
            
            if project.end_date is not None:
                update_fields.append("end_date = %s")
                values.append(project.end_date)
            
            if project.funding_agency_id is not None:
                validate_foreign_key("funding_agencies", "agency_id", project.funding_agency_id, conn)
                update_fields.append("funding_agency_id = %s")
                values.append(project.funding_agency_id)
            
            if project.technical_group_id is not None:
                validate_foreign_key("technical_groups", "group_id", project.technical_group_id, conn)
                update_fields.append("technical_group_id = %s")
                values.append(project.technical_group_id)
            
            if project.project_category is not None:
                update_fields.append("project_category = %s")
                values.append(project.project_category)
            
            if project.project_type is not None:
                update_fields.append("project_type = %s")
                values.append(project.project_type)
            
            if project.PFMS_id is not None:
                update_fields.append("PFMS_id = %s")
                values.append(project.PFMS_id)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            # Additional validation for category-type relationship
            new_category = project.project_category if project.project_category is not None else existing_project['project_category']
            new_type = project.project_type if project.project_type is not None else existing_project['project_type']
            
            if new_category == 'sponsored' and new_type not in ['PFMS', 'NON-PFMS']:
                raise HTTPException(
                    status_code=400, 
                    detail="When project_category is 'sponsored', project_type must be either 'PFMS' or 'NON-PFMS'"
                )
            elif new_category == 'non-sponsored' and new_type != 'contract-research':
                raise HTTPException(
                    status_code=400,
                    detail="When project_category is 'non-sponsored', project_type must be 'contract-research'"
                )
            
            # Validate PFMS_id requirement
            new_PFMS_id = project.PFMS_id if project.PFMS_id is not None else existing_project.get('PFMS_id')
            if new_category == 'sponsored' and new_type == 'PFMS' and not new_PFMS_id:
                raise HTTPException(
                    status_code=400,
                    detail="PFMS_id is required when project_category is 'sponsored' and project_type is 'PFMS'"
                )
            
            values.append(project_id)
            query = f"UPDATE projects SET {', '.join(update_fields)} WHERE project_id = %s RETURNING *"
            
            cur.execute(query, values)
            updated_project = cur.fetchone()
            conn.commit()
            
            return json.loads(json.dumps(dict(updated_project), cls=DecimalEncoder))
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.get("/{project_id}/manpower-remaining")
async def get_manpower_remaining(project_id: int):
    """Get remaining manpower positions to be filled"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    mab.role,
                    mab.salary_per_month,
                    SUM(mab.num_personnel) as planned_positions,
                    COALESCE(SUM(m.num_personnel), 0) as filled_positions,
                    SUM(mab.num_personnel) - COALESCE(SUM(m.num_personnel), 0) as remaining_positions
                FROM manpower_allocation_breakdown mab
                LEFT JOIN manpower m ON mab.project_id = m.project_id AND mab.role = m.role
                WHERE mab.project_id = %s
                GROUP BY mab.role, mab.salary_per_month
                HAVING SUM(mab.num_personnel) - COALESCE(SUM(m.num_personnel), 0) > 0
                ORDER BY mab.role
            """, (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{project_id}/equipment-remaining")
async def get_equipment_remaining(project_id: int):
    """Get remaining equipment to be purchased"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    eab.item_name,
                    eab.unit_cost,
                    SUM(eab.quantity) as planned_quantity,
                    COALESCE(SUM(e.quantity), 0) as purchased_quantity,
                    SUM(eab.quantity) - COALESCE(SUM(e.quantity), 0) as remaining_quantity
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

@router.get("/{project_id}/budget-breakdown-comparison")
async def get_budget_breakdown_comparison(
    project_id: int,
    as_of_date: Optional[str] = Query(None, description="Cumulative as of date in YYYY-MM-DD format"),
    start_date: Optional[str] = Query(None, description="Start date for range filter in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date for range filter in YYYY-MM-DD format"),
    conn = Depends(get_db_connection)
):
    """
    Get budget breakdown comparison showing allocated vs received vs spent
    
    This endpoint supports two modes:
    1. Cumulative mode (as_of_date): Returns data from project start up to specified date
       Example: ?as_of_date=2025-11-27
    
    2. Range mode (start_date & end_date): Returns data for a specific date range
       Example: ?start_date=2025-01-01&end_date=2025-11-27
    
    Returns breakdown for all budget heads (manpower, equipment, consumables, etc.)
    """
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Validate project exists
            cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Determine filter mode
            if start_date and end_date:
                # Date range mode
                date_condition_fr = "fr.date_received BETWEEN %s AND %s"
                date_condition_be = "be.date_incurred BETWEEN %s AND %s"
                date_condition_m = "m.date_incurred BETWEEN %s AND %s"
                date_condition_e = "e.purchase_date BETWEEN %s AND %s"
                date_params = [start_date, end_date] * 4
                filter_label = f"between {start_date} and {end_date}"
            else:
                # As of date mode (cumulative)
                filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
                date_condition_fr = "fr.date_received <= %s"
                date_condition_be = "be.date_incurred <= %s"
                date_condition_m = "m.date_incurred <= %s"
                date_condition_e = "e.purchase_date <= %s"
                date_params = [filter_date] * 4
                filter_label = f"as of {filter_date}"
            
            # Query budget breakdown with date filtering
            cur.execute(f"""
                SELECT 
                    ba.head,
                    COALESCE(ba.allocated_amount, 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_fr} THEN fr.amount 
                        ELSE 0 
                    END), 0) as funds_received,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_be} THEN be.amount 
                        ELSE 0 
                    END), 0) as expenditure_general,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_m} THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) as expenditure_manpower,
                    COALESCE(SUM(CASE 
                        WHEN {date_condition_e} THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as expenditure_equipment
                FROM budget_allocation ba
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
                LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
                LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
                LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
                WHERE ba.project_id = %s
                GROUP BY ba.head, ba.allocated_amount
                ORDER BY ba.head
            """, (*date_params, project_id))
            
            results = cur.fetchall()
            
            # Process results
            processed_results = []
            for row in results:
                total_expenditure = (
                    float(row['expenditure_general']) +
                    float(row['expenditure_manpower']) +
                    float(row['expenditure_equipment'])
                )
                processed_results.append({
                    'head': row['head'],
                    'approved_budget': float(row['approved_budget']),
                    'funds_received': float(row['funds_received']),
                    'total_expenditure': total_expenditure,
                    'unspent_balance': float(row['funds_received']) - total_expenditure
                })
            
            return {
                'project_id': project_id,
                'filter_type': 'range' if start_date and end_date else 'as_of',
                'filter_label': filter_label,
                'data': processed_results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


# Optional: Add these helper endpoints if they don't exist yet

@router.get("/{project_id}/manpower-plan-vs-actual")
async def get_manpower_plan_vs_actual(
    project_id: int,
    conn = Depends(get_db_connection)
):
    """Get manpower plan vs actual using database view"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_plan_vs_actual WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


@router.get("/{project_id}/equipment-plan-vs-actual")
async def get_equipment_plan_vs_actual(
    project_id: int,
    conn = Depends(get_db_connection)
):
    """Get equipment plan vs actual using database view"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_plan_vs_actual WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


@router.get("/{project_id}/funds-breakdown-summary")
async def get_funds_breakdown_summary(
    project_id: int,
    conn = Depends(get_db_connection)
):
    """Get funds breakdown summary using database view"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM funds_breakdown_summary WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
#  Delete project
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


#  Get manpower allocation breakdown
@router.get("/{project_id}/manpower-allocation-breakdown")
async def get_project_manpower_allocation_breakdown(project_id: int):
    """Get manpower allocation breakdown for project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM  WHERE project_id = %s",
                (project_id,)
            )
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


#  Get equipment allocation breakdown
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


#  Get approved manpower roles
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


# MISSING ROUTE 5: Get approved equipment items
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