# backend/app/routes/projects.py

from fastapi import APIRouter, HTTPException, Query, status
from datetime import datetime
from typing import Optional, List
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.project import ProjectCreate, ProjectUpdate
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/projects", tags=["Projects"])


# ==================== CREATE ====================
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """
    Create a new project with:
    - Budget allocations
    - Investigator details
    - Funding agency details
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Validate foreign keys
            validate_foreign_key("funding_agencies", "agency_id", project.funding_agency_id, conn)
            validate_foreign_key("technical_groups", "group_id", project.technical_group_id, conn)
            
            # Create project
            cur.execute(
                """INSERT INTO projects 
                   (project_no, title, alias, start_date, end_date, funding_agency_id, technical_group_id,
                    project_category, project_type, pfms_id) 
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
                    project.pfms_id if project.pfms_id else None
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
                 project.co_investigator if project.co_investigator else None, 
                 project.co_email if project.co_email else None, 
                 project.co_mobile if project.co_mobile else None)
            )
            
            # Create/Update funding agency details if provided
            if project.contact_person:
                cur.execute(
                    "SELECT id FROM funding_agency_details WHERE agency_id = %s",
                    (project.funding_agency_id,)
                )
                existing_details = cur.fetchone()
                
                if existing_details:
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
                GROUP BY p.project_id, i.principal_investigator, i.pi_email, i.pi_mobile,
                         i.co_investigator, i.co_email, i.co_mobile
            """, (project_id,))
            
            created_project = dict(cur.fetchone())
            return json.loads(json.dumps(created_project, cls=DecimalEncoder))
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


# ==================== READ ALL ====================
@router.get("", status_code=status.HTTP_200_OK)
async def get_all_projects(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    project_category: Optional[str] = Query(None, description="Filter by project category"),
    project_type: Optional[str] = Query(None, description="Filter by project type"),
    funding_agency_id: Optional[int] = Query(None, description="Filter by funding agency"),
    technical_group_id: Optional[int] = Query(None, description="Filter by technical group"),
    search: Optional[str] = Query(None, description="Search in project title or project_no"),
    sort_by: str = Query("project_id", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """
    Get all projects with optional filtering, searching, and pagination.
    
    Returns a list of projects with basic information.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Build WHERE clause dynamically
            where_conditions = []
            params = []
            
            if project_category:
                where_conditions.append("p.project_category = %s")
                params.append(project_category)
            
            if project_type:
                where_conditions.append("p.project_type = %s")
                params.append(project_type)
            
            if funding_agency_id:
                where_conditions.append("p.funding_agency_id = %s")
                params.append(funding_agency_id)
            
            if technical_group_id:
                where_conditions.append("p.technical_group_id = %s")
                params.append(technical_group_id)
            
            if search:
                where_conditions.append("(p.title ILIKE %s OR p.project_no ILIKE %s)")
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM projects p {where_clause}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()['total']
            
            # Get paginated results
            # Validate sort_by to prevent SQL injection
            allowed_sort_fields = ['project_id', 'project_no', 'title', 'start_date', 'end_date', 'created_at']
            if sort_by not in allowed_sort_fields:
                sort_by = 'project_id'
            
            query = f"""
                SELECT 
                    p.*,
                    fa.name as funding_agency_name,
                    tg.name as technical_group_name,
                    i.principal_investigator,
                    i.pi_email,
                    -- Total Budget Allocation
                    COALESCE(
                        (SELECT SUM(allocated_amount) FROM budget_allocation WHERE project_id = p.project_id),
                        0
                    ) as total_allocation,
                    -- Total Funds Received
                    COALESCE(
                        (SELECT SUM(amount) FROM funds_received WHERE project_id = p.project_id),
                        0
                    ) as total_funds_received,
                    -- Total Expenditure (from all 3 tables)
                    COALESCE(
                        (SELECT SUM(total_cost) FROM manpower WHERE project_id = p.project_id),
                        0
                    ) + COALESCE(
                        (SELECT SUM(total_cost) FROM equipment WHERE project_id = p.project_id),
                        0
                    ) + COALESCE(
                        (SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id),
                        0
                    ) as total_expenditure,
                    -- Individual Budget Head Allocations
                    COALESCE(
                        (SELECT allocated_amount FROM budget_allocation WHERE project_id = p.project_id AND head = 'manpower'),
                        0
                    ) as manpower_allocation,
                    COALESCE(
                        (SELECT allocated_amount FROM budget_allocation WHERE project_id = p.project_id AND head = 'equipment'),
                        0
                    ) as equipment_allocation,
                    COALESCE(
                        (SELECT allocated_amount FROM budget_allocation WHERE project_id = p.project_id AND head = 'consumables'),
                        0
                    ) as consumables_allocation,
                    COALESCE(
                        (SELECT allocated_amount FROM budget_allocation WHERE project_id = p.project_id AND head = 'contingency'),
                        0
                    ) as contingency_allocation,
                    COALESCE(
                        (SELECT allocated_amount FROM budget_allocation WHERE project_id = p.project_id AND head = 'travel & training'),
                        0
                    ) as travel_training_allocation,
                    COALESCE(
                        (SELECT allocated_amount FROM budget_allocation WHERE project_id = p.project_id AND head = 'overhead'),
                        0
                    ) as overhead_allocation,
                    -- Individual Head Expenditures
                    COALESCE(
                        (SELECT SUM(total_cost) FROM manpower WHERE project_id = p.project_id),
                        0
                    ) as manpower_expenditure,
                    COALESCE(
                        (SELECT SUM(total_cost) FROM equipment WHERE project_id = p.project_id),
                        0
                    ) as equipment_expenditure,
                    COALESCE(
                        (SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id AND head = 'consumables'),
                        0
                    ) as consumables_expenditure,
                    COALESCE(
                        (SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id AND head = 'contingency'),
                        0
                    ) as contingency_expenditure,
                    COALESCE(
                        (SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id AND head = 'travel & training'),
                        0
                    ) as travel_training_expenditure,
                    COALESCE(
                        (SELECT SUM(amount) FROM budget_expenditure WHERE project_id = p.project_id AND head = 'overhead'),
                        0
                    ) as overhead_expenditure
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN investigators i ON p.project_id = i.project_id
                {where_clause}
                ORDER BY p.{sort_by} {sort_order.upper()}
                LIMIT %s OFFSET %s
            """
            
            params.extend([limit, skip])
            cur.execute(query, params)
            projects = [dict(row) for row in cur.fetchall()]
            
            return {
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "data": json.loads(json.dumps(projects, cls=DecimalEncoder))
            }
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()

# ==================== TECHNICAL GROUPS ====================
# MUST come BEFORE /{project_id} to avoid path collision
@router.get("/technical-groups", status_code=status.HTTP_200_OK)
async def get_all_technical_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None)
):
    """Get all technical groups with pagination"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            where_clause = ""
            params = []
            
            if search:
                where_clause = "WHERE name ILIKE %s"
                params.append(f"%{search}%")
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM technical_groups {where_clause}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()['total']
            
            # Get results
            query = f"SELECT group_id, name as group_name, description FROM technical_groups {where_clause} ORDER BY name LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            cur.execute(query, params)
            groups = [dict(row) for row in cur.fetchall()]
            
            return {
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "data": json.loads(json.dumps(groups, cls=DecimalEncoder))
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== TECHNICAL GROUPS ====================
@router.get("/technical-groups", status_code=status.HTTP_200_OK)
async def get_all_technical_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None)
):
    """Get all technical groups with pagination"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            where_clause = ""
            params = []
            
            if search:
                where_clause = "WHERE name ILIKE %s"
                params.append(f"%{search}%")
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM technical_groups {where_clause}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()['total']
            
            # Get results - KEY FIX: name as group_name
            query = f"SELECT group_id, name as group_name, description FROM technical_groups {where_clause} ORDER BY name LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            cur.execute(query, params)
            groups = [dict(row) for row in cur.fetchall()]
            
            return {
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "data": json.loads(json.dumps(groups, cls=DecimalEncoder))
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()

# ==================== READ ONE ====================
# ==================== READ ONE PROJECT ====================
@router.get("/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_by_id(project_id: int):
    """
    Get detailed information about a specific project including:
    - Project details
    - Investigator details
    - Funding agency details
    - Budget allocations + breakdowns
    - Funds received (with manpower/equipment breakdown)
    - Expenditure details
    """
    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            # ----------------------------------------------------
            # (1) BASIC PROJECT DETAILS + INVESTIGATORS + AGENCY
            # ----------------------------------------------------
            cur.execute("""
                SELECT 
                    p.*,
                    fa.name AS agency_name,
                    tg.name AS group_name,
                    tg.description AS group_description,
                    i.principal_investigator,
                    i.pi_email,
                    i.pi_mobile,
                    i.co_investigator,
                    i.co_email,
                    i.co_mobile
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN investigators i ON p.project_id = i.project_id
                WHERE p.project_id = %s
            """, (project_id,))

            project = cur.fetchone()
            if not project:
                raise HTTPException(404, "Project not found")

            response = dict(project)

            # ----------------------------------------------------
            # (2) FUNDING AGENCY EXTRA DETAILS
            # ----------------------------------------------------
            cur.execute("""
                SELECT * FROM funding_agency_details
                WHERE agency_id = %s
            """, (response["funding_agency_id"],))

            agency_details = cur.fetchone()
            if agency_details:
                response.update({
                    "contact_person": agency_details.get("contact_person"),
                    "contact_designation": agency_details.get("designation"),
                    "contact_mobile": agency_details.get("mobile"),
                    "contact_email": agency_details.get("email"),
                    "sanctioned_number": agency_details.get("sanctioned_number"),
                    "funding_scheme": agency_details.get("scheme"),
                    "cna_sub_agency": agency_details.get("cna_sub_agency"),
                    "bank_name": agency_details.get("bank_name"),
                    "bank_account_no": agency_details.get("bank_account_no"),
                })

            # ----------------------------------------------------
            # (3) BUDGET ALLOCATION (HEAD-WISE)
            # ----------------------------------------------------
            response.update({
                "manpower_allocation": 0,
                "equipment_allocation": 0,
                "travel_training_allocation": 0,
                "consumables_allocation": 0,
                "contingency_allocation": 0,
                "overhead_allocation": 0,
            })

            cur.execute("""
                SELECT head, allocated_amount
                FROM budget_allocation
                WHERE project_id = %s
            """, (project_id,))

            for row in cur.fetchall():
                h = row["head"]
                amt = float(row["allocated_amount"])
                if h == "manpower":
                    response["manpower_allocation"] = amt
                elif h == "equipment":
                    response["equipment_allocation"] = amt
                elif h == "travel & training":
                    response["travel_training_allocation"] = amt
                elif h == "consumables":
                    response["consumables_allocation"] = amt
                elif h == "contingency":
                    response["contingency_allocation"] = amt
                elif h == "overhead":
                    response["overhead_allocation"] = amt

            # ----------------------------------------------------
            # (4) MANPOWER BREAKDOWN
            # ----------------------------------------------------
            cur.execute("""
                SELECT *
                FROM manpower_allocation_breakdown
                WHERE project_id = %s
            """, (project_id,))
            response["manpower_breakdown"] = [dict(r) for r in cur.fetchall()]

            # ----------------------------------------------------
            # (5) EQUIPMENT BREAKDOWN
            # ----------------------------------------------------
            cur.execute("""
                SELECT *
                FROM equipment_allocation_breakdown
                WHERE project_id = %s
            """, (project_id,))
            response["equipment_breakdown"] = [dict(r) for r in cur.fetchall()]

            # ----------------------------------------------------
            # (6) FUNDS RECEIVED + MANPOWER/EQUIPMENT BREAKDOWN
            # ----------------------------------------------------
            cur.execute("""
                SELECT 
                    fund_id,
                    date_received AS received_date,
                    head,
                    remarks AS description,
                    amount
                FROM funds_received
                WHERE project_id = %s
                ORDER BY date_received DESC
            """, (project_id,))

            fund_rows = cur.fetchall()
            funds_with_breakdown = []

            for fund in fund_rows:
                f = dict(fund)
                f["breakdown"] = None

                # ---- MANPOWER BREAKDOWN FOR FUNDS ----
                if f["head"] == "manpower":
                    cur.execute("""
                        SELECT role, salary_per_month, months, num_personnel
                        FROM manpower_funds_breakdown
                        WHERE fund_id = %s
                    """, (f["fund_id"],))
                    b = cur.fetchone()
                    if b:
                        f["breakdown"] = dict(b)

                # ---- EQUIPMENT BREAKDOWN FOR FUNDS ----
                if f["head"] == "equipment":
                    cur.execute("""
                        SELECT item_name, quantity, unit_cost
                        FROM equipment_funds_breakdown
                        WHERE fund_id = %s
                    """, (f["fund_id"],))
                    b = cur.fetchone()
                    if b:
                        f["breakdown"] = dict(b)

                funds_with_breakdown.append(f)

            response["funds"] = funds_with_breakdown

            # ----------------------------------------------------
            # (7) EXPENDITURE LIST
            # ----------------------------------------------------
            cur.execute("""
                SELECT 
                    date_incurred AS expenditure_date,
                    head,
                    description,
                    amount
                FROM budget_expenditure
                WHERE project_id = %s
                ORDER BY date_incurred DESC
            """, (project_id,))
            response["expenditures"] = [dict(r) for r in cur.fetchall()]

            return json.loads(json.dumps(response, cls=DecimalEncoder))

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", e)
        raise HTTPException(500, str(e))
    finally:
        conn.close()


# ==================== UPDATE ====================
@router.put("/{project_id}", status_code=status.HTTP_200_OK)
async def update_project(project_id: int, project: ProjectUpdate):
    """
    Update project details (full update).
    Only provided fields will be updated.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if project exists
            cur.execute("SELECT * FROM projects WHERE project_id = %s", (project_id,))
            existing_project = cur.fetchone()
            
            if not existing_project:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
            
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
            
            if project.pfms_id is not None:
                update_fields.append("pfms_id = %s")
                values.append(project.pfms_id)
            
            if not update_fields:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
            
            # Validate business rules
            new_category = project.project_category if project.project_category is not None else existing_project['project_category']
            new_type = project.project_type if project.project_type is not None else existing_project['project_type']
            
            if new_category == 'sponsored' and new_type not in ['PFMS', 'NON-PFMS']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="When project_category is 'sponsored', project_type must be either 'PFMS' or 'NON-PFMS'"
                )
            elif new_category == 'non-sponsored' and new_type != 'contract-research':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="When project_category is 'non-sponsored', project_type must be 'contract-research'"
                )
            
            new_pfms_id = project.pfms_id if project.pfms_id is not None else existing_project.get('pfms_id')
            if new_category == 'sponsored' and new_type == 'PFMS' and not new_pfms_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="pfms_id is required when project_category is 'sponsored' and project_type is 'PFMS'"
                )
            
            # Execute update
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


# ==================== PARTIAL UPDATE ====================
@router.patch("/{project_id}", status_code=status.HTTP_200_OK)
async def partial_update_project(project_id: int, project: ProjectUpdate):
    """
    Partially update a project (same as PUT but semantically different).
    Use this for updating specific fields without sending all data.
    """
    # Reuse the PUT logic as it already handles partial updates
    return await update_project(project_id, project)


# ==================== DELETE ====================
@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: int):
    """
    Delete a project and all associated records.
    
    This will cascade delete:
    - Investigators
    - Budget allocations
    - Manpower and equipment breakdowns
    - Funds received
    - Expenditures
    
    Note: Ensure CASCADE is set up in your database schema.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if project exists
            cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (project_id,))
            project = cur.fetchone()
            
            if not project:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
            
            # Delete project (should cascade to related tables)
            cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))
            conn.commit()
            
            return None  # 204 No Content returns no body
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== ADDITIONAL USEFUL ENDPOINTS ====================

@router.get("/{project_id}/summary", status_code=status.HTTP_200_OK)
async def get_project_summary(project_id: int):
    """
    Get a financial summary of the project including:
    - Total budget allocated
    - Total funds received
    - Total expenditure
    - Balance available
    - Budget utilization percentage
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (project_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
            
            cur.execute("""
                SELECT 
                    COALESCE(SUM(allocated_amount), 0) as total_allocated,
                FROM budget_allocation
                WHERE project_id = %s
            """, (project_id,))
            budget_data = cur.fetchone()
            
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_received
                FROM funds_received
                WHERE project_id = %s
            """, (project_id,))
            funds_data = cur.fetchone()
            
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_spent
                FROM budget_expenditure
                WHERE project_id = %s
            """, (project_id,))
            expenditure_data = cur.fetchone()
            
            total_allocated = float(budget_data['total_allocated'])
            total_utilized = float(budget_data['total_utilized'])
            total_received = float(funds_data['total_received'])
            total_spent = float(expenditure_data['total_spent'])
            
            balance = total_received - total_spent
            utilization_percentage = (total_utilized / total_allocated * 100) if total_allocated > 0 else 0
            
            return {
                "project_id": project_id,
                "total_budget_allocated": total_allocated,
                "total_budget_utilized": total_utilized,
                "total_funds_received": total_received,
                "total_expenditure": total_spent,
                "available_balance": balance,
                "budget_utilization_percentage": round(utilization_percentage, 2)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/{project_id}/exists", status_code=status.HTTP_200_OK)
async def check_project_exists(project_id: int):
    """
    Check if a project exists (useful for frontend validation).
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (project_id,))
            exists = cur.fetchone() is not None
            
            return {"exists": exists, "project_id": project_id}
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()