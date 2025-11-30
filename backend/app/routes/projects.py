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
    """Create a new project with budget allocations, investigator details, and funding agency details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funding_agencies", "agency_id", project.funding_agency_id, conn)
            validate_foreign_key("technical_groups", "group_id", project.technical_group_id, conn)
            
            # Create project
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
            
            # Create investigator record (with proper None handling for co-investigator)
            cur.execute(
                """INSERT INTO investigators 
                   (project_id, principal_investigator, pi_email, pi_mobile, 
                    co_investigator, co_email, co_mobile)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (project_id, project.principal_investigator, project.pi_email, project.pi_mobile,
                 project.co_investigator if project.co_investigator else None, 
                 project.co_email if project.co_email else None, 
                 project.co_mobile if project.co_mobile else None)
            )
            
            # ============= NEW: Handle Funding Agency Details =============
            # Check if funding agency details are provided
            if project.contact_person:
                # Check if details already exist for this agency
                cur.execute(
                    "SELECT id FROM funding_agency_details WHERE agency_id = %s",
                    (project.funding_agency_id,)
                )
                existing_details = cur.fetchone()
                
                if existing_details:
                    # Update existing details
                    cur.execute(
                        """UPDATE funding_agency_details 
                           SET contact_person = %s, designation = %s, mobile = %s, email = %s,
                               sanctioned_number = %s, scheme = %s, cna_sub_agency = %s,
                               bank_name = %s, bank_account_no = %s
                           WHERE agency_id = %s""",
                        (
                            project.contact_person,
                            project.contact_designation if project.contact_designation else None,
                            project.contact_mobile if project.contact_mobile else None,
                            project.contact_email if project.contact_email else None,
                            project.sanctioned_number if project.sanctioned_number else None,
                            project.funding_scheme if project.funding_scheme else None,
                            project.cna_sub_agency if project.cna_sub_agency else None,
                            project.bank_name if project.bank_name else None,
                            project.bank_account_no if project.bank_account_no else None,
                            project.funding_agency_id
                        )
                    )
                else:
                    # Create new details
                    cur.execute(
                        """INSERT INTO funding_agency_details 
                           (agency_id, contact_person, designation, mobile, email,
                            sanctioned_number, scheme, cna_sub_agency, bank_name, bank_account_no)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (
                            project.funding_agency_id,
                            project.contact_person,
                            project.contact_designation if project.contact_designation else None,
                            project.contact_mobile if project.contact_mobile else None,
                            project.contact_email if project.contact_email else None,
                            project.sanctioned_number if project.sanctioned_number else None,
                            project.funding_scheme if project.funding_scheme else None,
                            project.cna_sub_agency if project.cna_sub_agency else None,
                            project.bank_name if project.bank_name else None,
                            project.bank_account_no if project.bank_account_no else None
                        )
                    )
            # ============================================================
            
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
                             item.salary_per_month, item.months, item.num_personnel, 
                             item.qualification if hasattr(item, 'qualification') else None, 
                             item.experience_required if hasattr(item, 'experience_required') else None)
                        )
                
                # Insert equipment breakdown
                if head == 'equipment' and breakdown:
                    for item in breakdown:
                        cur.execute(
                            """INSERT INTO equipment_allocation_breakdown 
                               (allocation_id, project_id, item_name, quantity, unit_cost, description, product_website)
                               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                            (allocation_id, project_id, item.item_name, 
                             item.quantity, item.unit_cost, 
                             item.description if hasattr(item, 'description') else None, 
                             item.product_website if hasattr(item, 'product_website') else None)
                        )
            
            conn.commit()
            
            # Return complete project data
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
    """Get complete project details - FIXED version with all corrections"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get main project data
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    p.alias,
                    p.project_category,
                    p.project_type,
                    p.PFMS_id,
                    p.start_date,
                    p.end_date,
                    p.technical_group_id,
                    p.funding_agency_id,
                    tg.name AS technical_group_name,
                    fa.name AS funding_agency_name,
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
            
            project_dict = dict(project)
            
            # Get funding agency details
            try:
                cur.execute("""
                    SELECT 
                        contact_person,
                        designation as contact_designation,
                        mobile as contact_mobile,
                        email as contact_email,
                        sanctioned_number,
                        scheme as funding_scheme,
                        cna_sub_agency,
                        bank_name,
                        bank_account_no
                    FROM funding_agency_details
                    WHERE agency_id = %s
                """, (project_dict['funding_agency_id'],))
                
                fad = cur.fetchone()
                if fad:
                    project_dict.update(dict(fad))
            except Exception as e:
                print(f"Funding agency details not available: {e}")
            
            # Get budget allocations
            try:
                cur.execute("""
                    SELECT head, allocated_amount
                    FROM budget_allocation
                    WHERE project_id = %s
                """, (project_id,))
                
                budget_allocations = {}
                for row in cur.fetchall():
                    budget_allocations[row['head']] = float(row['allocated_amount'])
                
                project_dict['manpower_allocation'] = budget_allocations.get('manpower', 0)
                project_dict['equipment_allocation'] = budget_allocations.get('equipment', 0)
                project_dict['travel_training_allocation'] = budget_allocations.get('travel & training', 0)
                project_dict['consumables_allocation'] = budget_allocations.get('consumables', 0)
                project_dict['contingency_allocation'] = budget_allocations.get('contingency', 0)
                project_dict['overhead_allocation'] = budget_allocations.get('overhead', 0)
            except Exception as e:
                print(f"Budget allocations error: {e}")
                project_dict['manpower_allocation'] = 0
                project_dict['equipment_allocation'] = 0
                project_dict['travel_training_allocation'] = 0
                project_dict['consumables_allocation'] = 0
                project_dict['contingency_allocation'] = 0
                project_dict['overhead_allocation'] = 0
            
            # Get manpower breakdown
            try:
                cur.execute("""
                    SELECT 
                        role,
                        salary_per_month,
                        months,
                        num_personnel,
                        qualification,
                        experience_required
                    FROM manpower_allocation_breakdown
                    WHERE project_id = %s
                """, (project_id,))
                project_dict['manpower_breakdown'] = [
                    json.loads(json.dumps(dict(row), cls=DecimalEncoder)) 
                    for row in cur.fetchall()
                ]
            except Exception as e:
                print(f"Manpower breakdown error: {e}")
                project_dict['manpower_breakdown'] = []
            
            # Get equipment breakdown
            try:
                cur.execute("""
                    SELECT 
                        item_name,
                        quantity,
                        unit_cost,
                        description,
                        product_website
                    FROM equipment_allocation_breakdown
                    WHERE project_id = %s
                """, (project_id,))
                project_dict['equipment_breakdown'] = [
                    json.loads(json.dumps(dict(row), cls=DecimalEncoder)) 
                    for row in cur.fetchall()
                ]
            except Exception as e:
                print(f"Equipment breakdown error: {e}")
                project_dict['equipment_breakdown'] = []
            
            # Get funds received
            try:
                cur.execute("""
                    SELECT 
                        head,
                        amount,
                        date_received,
                        remarks
                    FROM funds_received
                    WHERE project_id = %s
                    ORDER BY date_received DESC
                """, (project_id,))
                project_dict['funds_received'] = [
                    json.loads(json.dumps(dict(row), cls=DecimalEncoder)) 
                    for row in cur.fetchall()
                ]
            except Exception as e:
                print(f"Funds received error: {e}")
                project_dict['funds_received'] = []
            
            # FIXED: Get manpower expenditure (correct table name)
            try:
                cur.execute("""
                    SELECT 
                        role,
                        salary_per_month,
                        months,
                        num_personnel,
                        date_incurred
                    FROM manpower
                    WHERE project_id = %s
                    ORDER BY date_incurred DESC
                """, (project_id,))
                project_dict['manpower_expenditure'] = [
                    json.loads(json.dumps(dict(row), cls=DecimalEncoder)) 
                    for row in cur.fetchall()
                ]
            except Exception as e:
                print(f"Manpower expenditure error: {e}")
                project_dict['manpower_expenditure'] = []
            
            # FIXED: Get equipment expenditure (correct table name)
            try:
                cur.execute("""
                    SELECT 
                        name,
                        quantity,
                        unit_cost,
                        purchase_date
                    FROM equipment
                    WHERE project_id = %s
                    ORDER BY purchase_date DESC
                """, (project_id,))
                project_dict['equipment_expenditure'] = [
                    json.loads(json.dumps(dict(row), cls=DecimalEncoder)) 
                    for row in cur.fetchall()
                ]
            except Exception as e:
                print(f"Equipment expenditure error: {e}")
                project_dict['equipment_expenditure'] = []
            
            # Get other expenditure
            try:
                cur.execute("""
                    SELECT 
                        head,
                        amount,
                        description,
                        date_incurred
                    FROM budget_expenditure
                    WHERE project_id = %s
                    ORDER BY date_incurred DESC
                """, (project_id,))
                project_dict['other_expenditure'] = [
                    json.loads(json.dumps(dict(row), cls=DecimalEncoder)) 
                    for row in cur.fetchall()
                ]
            except Exception as e:
                print(f"Other expenditure error: {e}")
                project_dict['other_expenditure'] = []
            
            return json.loads(json.dumps(project_dict, cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_project: {str(e)}")
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
