# app/utils/validators.py
from fastapi import HTTPException
from psycopg2.extras import RealDictCursor
from datetime import datetime

def validate_expenditure_against_budget(project_id: int, head: str, new_amount: float, conn):
    """Check if adding new expenditure exceeds budget allocation"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                COALESCE(ba.allocated_amount, 0) as budget,
                COALESCE(SUM(be.amount), 0) as current_expenditure,
                COALESCE(SUM(m.salary_per_month * m.months * m.num_personnel), 0) as manpower_exp,
                COALESCE(SUM(e.quantity * e.unit_cost), 0) as equipment_exp
            FROM budget_allocation ba
            LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
            LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
            LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
            WHERE ba.project_id = %s AND ba.head = %s
            GROUP BY ba.allocated_amount
        """, (project_id, head))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail=f"No budget allocation found for {head}")
        
        total_current = float(result['current_expenditure']) + float(result['manpower_exp']) + float(result['equipment_exp'])
        
        if total_current + new_amount > float(result['budget']):
            raise HTTPException(
                status_code=400, 
                detail=f"Expenditure exceeds budget allocation. Budget: ₹{result['budget']:,.2f}, Current: ₹{total_current:,.2f}, Attempting: ₹{new_amount:,.2f}, Would exceed by: ₹{(total_current + new_amount - float(result['budget'])):,.2f}"
            )

def validate_funds_against_budget(project_id: int, head: str, new_amount: float, conn):
    """Check if funds received exceeds budget allocation"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                COALESCE(ba.allocated_amount, 0) as budget,
                COALESCE(SUM(fr.amount), 0) as current_funds
            FROM budget_allocation ba
            LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
            WHERE ba.project_id = %s AND ba.head = %s
            GROUP BY ba.allocated_amount
        """, (project_id, head))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail=f"No budget allocation found for {head}")
        
        if float(result['current_funds']) + new_amount > float(result['budget']):
            raise HTTPException(
                status_code=400,
                detail=f"Funds exceed budget allocation. Budget: ₹{result['budget']:,.2f}, Current: ₹{result['current_funds']:,.2f}, Attempting: ₹{new_amount:,.2f}, Would exceed by: ₹{(float(result['current_funds']) + new_amount - float(result['budget'])):,.2f}"
            )

def validate_manpower_against_approved_posts(project_id: int, role: str, num_personnel: int, conn, exclude_manpower_id: int = None):
    """Check if personnel count exceeds approved posts for role"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT COALESCE(SUM(num_personnel), 0) as approved_posts
            FROM manpower_allocation_breakdown
            WHERE project_id = %s AND role = %s
        """, (project_id, role))
        
        result = cur.fetchone()
        if not result or result['approved_posts'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved posts found for role '{role}'. Please add this role to the budget allocation breakdown first."
            )
        
        if exclude_manpower_id:
            cur.execute("""
                SELECT COALESCE(SUM(num_personnel), 0) as current_assigned
                FROM manpower
                WHERE project_id = %s AND role = %s AND manpower_id != %s
            """, (project_id, role, exclude_manpower_id))
        else:
            cur.execute("""
                SELECT COALESCE(SUM(num_personnel), 0) as current_assigned
                FROM manpower
                WHERE project_id = %s AND role = %s
            """, (project_id, role))
        
        current = cur.fetchone()
        
        if int(current['current_assigned']) + num_personnel > int(result['approved_posts']):
            raise HTTPException(
                status_code=400,
                detail=f"Personnel count exceeds approved posts for '{role}'. Approved: {result['approved_posts']}, Currently assigned: {current['current_assigned']}, Attempting to add: {num_personnel}"
            )

def validate_equipment_against_approved_quantity(project_id: int, item_name: str, quantity: int, conn, exclude_equipment_id: int = None):
    """Check if equipment quantity exceeds approved quantity"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT COALESCE(SUM(quantity), 0) as approved_qty
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        """, (project_id, item_name))
        
        result = cur.fetchone()
        if not result or result['approved_qty'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved quantity found for item '{item_name}'. Please add this item to the budget allocation breakdown first."
            )
        
        if exclude_equipment_id:
            cur.execute("""
                SELECT COALESCE(SUM(quantity), 0) as current_purchased
                FROM equipment
                WHERE project_id = %s AND name = %s AND equipment_id != %s
            """, (project_id, item_name, exclude_equipment_id))
        else:
            cur.execute("""
                SELECT COALESCE(SUM(quantity), 0) as current_purchased
                FROM equipment
                WHERE project_id = %s AND name = %s
            """, (project_id, item_name))
        
        current = cur.fetchone()
        
        if int(current['current_purchased']) + quantity > int(result['approved_qty']):
            raise HTTPException(
                status_code=400,
                detail=f"Quantity exceeds approved limit for '{item_name}'. Approved: {result['approved_qty']}, Currently purchased: {current['current_purchased']}, Attempting to add: {quantity}"
            )

def validate_transaction_date(project_id: int, transaction_date: str, conn):
    """Check if transaction date falls within project duration"""
    if not transaction_date:
        return None
        
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT start_date, end_date
            FROM projects
            WHERE project_id = %s
        """, (project_id,))
        
        project = cur.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        trans_date = datetime.strptime(transaction_date, '%Y-%m-%d').date()
        
        if trans_date < project['start_date']:
            raise HTTPException(
                status_code=400,
                detail=f"Transaction date {transaction_date} is before project start date {project['start_date']}"
            )
        
        if project['end_date'] and trans_date > project['end_date']:
            return {
                "warning": f"Transaction date {transaction_date} is after project end date {project['end_date']}"
            }
    
    return None

def validate_manpower_funds_against_allocation(project_id: int, role: str, num_personnel: int, conn, exclude_fund_id: int = None):
    """Check if manpower funds exceed approved posts"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT COALESCE(SUM(num_personnel), 0) as approved_posts
            FROM manpower_allocation_breakdown
            WHERE project_id = %s AND role = %s
        """, (project_id, role))
        
        result = cur.fetchone()
        if not result or result['approved_posts'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved posts found for role '{role}' in budget allocation"
            )
        
        if exclude_fund_id:
            cur.execute("""
                SELECT COALESCE(SUM(num_personnel), 0) as current_funded
                FROM manpower_funds_breakdown
                WHERE project_id = %s AND role = %s AND breakdown_id != %s
            """, (project_id, role, exclude_fund_id))
        else:
            cur.execute("""
                SELECT COALESCE(SUM(num_personnel), 0) as current_funded
                FROM manpower_funds_breakdown
                WHERE project_id = %s AND role = %s
            """, (project_id, role))
        
        current = cur.fetchone()
        
        if int(current['current_funded']) + num_personnel > int(result['approved_posts']):
            raise HTTPException(
                status_code=400,
                detail=f"Funding exceeds approved posts for '{role}'. Approved: {result['approved_posts']}, Currently funded: {current['current_funded']}, Attempting: {num_personnel}"
            )

def validate_equipment_funds_against_allocation(project_id: int, item_name: str, quantity: int, conn, exclude_fund_id: int = None):
    """Check if equipment funds exceed approved quantity"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT COALESCE(SUM(quantity), 0) as approved_qty
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        """, (project_id, item_name))
        
        result = cur.fetchone()
        if not result or result['approved_qty'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved quantity found for item '{item_name}' in budget allocation"
            )
        
        if exclude_fund_id:
            cur.execute("""
                SELECT COALESCE(SUM(quantity), 0) as current_funded
                FROM equipment_funds_breakdown
                WHERE project_id = %s AND item_name = %s AND breakdown_id != %s
            """, (project_id, item_name, exclude_fund_id))
        else:
            cur.execute("""
                SELECT COALESCE(SUM(quantity), 0) as current_funded
                FROM equipment_funds_breakdown
                WHERE project_id = %s AND item_name = %s
            """, (project_id, item_name))
        
        current = cur.fetchone()
        
        if int(current['current_funded']) + quantity > int(result['approved_qty']):
            raise HTTPException(
                status_code=400,
                detail=f"Funding exceeds approved quantity for '{item_name}'. Approved: {result['approved_qty']}, Currently funded: {current['current_funded']}, Attempting: {quantity}"
            )

def validate_manpower_salary_against_breakdown(project_id: int, role: str, salary_per_month: float, conn):
    """Validate that the salary matches the approved salary in the breakdown"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT salary_per_month as approved_salary
            FROM manpower_allocation_breakdown
            WHERE project_id = %s AND role = %s
            LIMIT 1
        """, (project_id, role))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(
                status_code=400,
                detail=f"No approved salary found for role '{role}'. Please add this role to the budget allocation breakdown first."
            )
        
        approved_salary = float(result['approved_salary'])
        
        if abs(salary_per_month - approved_salary) > 1.0:
            raise HTTPException(
                status_code=400,
                detail=f"Salary for '{role}' does not match approved amount. Approved: ₹{approved_salary:,.2f}, Attempting: ₹{salary_per_month:,.2f}"
            )

def validate_equipment_cost_against_breakdown(project_id: int, item_name: str, unit_cost: float, quantity: int, conn):
    """Validate that total equipment cost doesn't exceed the allocated budget for this item"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                SUM(quantity * unit_cost) as approved_total_budget,
                SUM(quantity) as approved_qty
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        """, (project_id, item_name))
        
        result = cur.fetchone()
        if not result or not result['approved_total_budget']:
            raise HTTPException(
                status_code=400,
                detail=f"No approved budget found for item '{item_name}'. Please add this item to the budget allocation breakdown first."
            )
        
        approved_total = float(result['approved_total_budget'])
        
        cur.execute("""
            SELECT COALESCE(SUM(quantity * unit_cost), 0) as current_spent
            FROM equipment
            WHERE project_id = %s AND name = %s
        """, (project_id, item_name))
        
        current = cur.fetchone()
        current_spent = float(current['current_spent'])
        
        new_cost = unit_cost * quantity
        if current_spent + new_cost > approved_total:
            raise HTTPException(
        status_code=400,
        detail=(
            f"Total cost for '{item_name}' exceeds approved budget. "
            f"Approved: ₹{approved_total:,.2f}, "
            f"Already spent: ₹{current_spent:,.2f}, "
            f"Attempting: ₹{new_cost:,.2f}, "
            f"Would exceed by: ₹{(current_spent + new_cost - approved_total):,.2f}"
        )
    )
