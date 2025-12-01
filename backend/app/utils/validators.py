# app/utils/validators.py
"""
Validators for budget, funds, and expenditure operations

FIXED: 
- validate_expenditure_against_budget: Now uses auto-calculated total_cost columns
- validate_manpower_salary_against_breakdown: Handles multiple entries, allows range
- Improved error messages throughout
"""

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor
from datetime import datetime


def validate_expenditure_against_budget(project_id: int, head: str, new_amount: float, conn):
    """
    Check if adding new expenditure exceeds budget allocation
    
    FIXED: Now correctly uses auto-calculated total_cost columns from manpower/equipment tables
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Get budget allocation for this head
        cur.execute("""
            SELECT allocated_amount
            FROM budget_allocation
            WHERE project_id = %s AND head = %s
        """, (project_id, head))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(
                status_code=400, 
                detail=f"No budget allocation found for '{head}'. Please create allocation first."
            )
        
        budget = float(result['allocated_amount'])
        
        # Calculate current expenditure based on head type
        if head == 'manpower':
            # Use auto-calculated total_cost from manpower table
            cur.execute("""
                SELECT COALESCE(SUM(total_cost), 0) as current_expenditure
                FROM manpower
                WHERE project_id = %s
            """, (project_id,))
            
        elif head == 'equipment':
            # Use auto-calculated total_cost from equipment table
            cur.execute("""
                SELECT COALESCE(SUM(total_cost), 0) as current_expenditure
                FROM equipment
                WHERE project_id = %s
            """, (project_id,))
            
        else:
            # For consumables, contingency, travel & training, overhead
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0) as current_expenditure
                FROM budget_expenditure
                WHERE project_id = %s AND head = %s
            """, (project_id, head))
        
        current = cur.fetchone()
        current_expenditure = float(current['current_expenditure'])
        
        # Check if adding new amount would exceed budget
        if current_expenditure + new_amount > budget:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Expenditure exceeds budget allocation for '{head}'. "
                    f"Budget: ₹{budget:,.2f}, "
                    f"Current: ₹{current_expenditure:,.2f}, "
                    f"Attempting: ₹{new_amount:,.2f}, "
                    f"Would exceed by: ₹{(current_expenditure + new_amount - budget):,.2f}"
                )
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
            raise HTTPException(
                status_code=400, 
                detail=f"No budget allocation found for '{head}'"
            )
        
        budget = float(result['budget'])
        current_funds = float(result['current_funds'])
        
        if current_funds + new_amount > budget:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Funds exceed budget allocation for '{head}'. "
                    f"Budget: ₹{budget:,.2f}, "
                    f"Current: ₹{current_funds:,.2f}, "
                    f"Attempting: ₹{new_amount:,.2f}, "
                    f"Would exceed by: ₹{(current_funds + new_amount - budget):,.2f}"
                )
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
                detail=(
                    f"No approved posts found for role '{role}'. "
                    f"Please add this role to the budget allocation breakdown first."
                )
            )
        
        # Get current assigned personnel
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
        current_assigned = int(current['current_assigned'])
        approved_posts = int(result['approved_posts'])
        
        if current_assigned + num_personnel > approved_posts:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Personnel count exceeds approved posts for '{role}'. "
                    f"Approved: {approved_posts}, "
                    f"Currently assigned: {current_assigned}, "
                    f"Attempting to add: {num_personnel}, "
                    f"Would exceed by: {current_assigned + num_personnel - approved_posts}"
                )
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
                detail=(
                    f"No approved quantity found for item '{item_name}'. "
                    f"Please add this item to the budget allocation breakdown first."
                )
            )
        
        # Get current purchased quantity
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
        current_purchased = int(current['current_purchased'])
        approved_qty = int(result['approved_qty'])
        
        if current_purchased + quantity > approved_qty:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Quantity exceeds approved limit for '{item_name}'. "
                    f"Approved: {approved_qty}, "
                    f"Currently purchased: {current_purchased}, "
                    f"Attempting to add: {quantity}, "
                    f"Would exceed by: {current_purchased + quantity - approved_qty}"
                )
            )


def validate_transaction_date(project_id: int, transaction_date: str, conn):
    """
    Check if transaction date falls within project duration
    
    Returns None if valid, or a warning dict if date is after project end
    """
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
        
        # Parse transaction date
        if isinstance(transaction_date, str):
            trans_date = datetime.strptime(transaction_date, '%Y-%m-%d').date()
        else:
            trans_date = transaction_date
        
        # Check against start date (hard error)
        if trans_date < project['start_date']:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Transaction date {trans_date} is before project start date "
                    f"{project['start_date']}"
                )
            )
        
        # Check against end date (warning only)
        if project['end_date'] and trans_date > project['end_date']:
            return {
                "warning": (
                    f"Transaction date {trans_date} is after project end date "
                    f"{project['end_date']}"
                )
            }
    
    return None


def validate_manpower_salary_against_breakdown(project_id: int, role: str, salary_per_month: float, conn):
    """
    Validate that the salary is within reasonable range of approved salaries
    
    IMPROVED: Now handles multiple breakdown entries and allows ±10% variance
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                MIN(salary_per_month) as min_salary,
                MAX(salary_per_month) as max_salary,
                COUNT(*) as num_entries
            FROM manpower_allocation_breakdown
            WHERE project_id = %s AND role = %s
        """, (project_id, role))
        
        result = cur.fetchone()
        if not result or result['num_entries'] == 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No approved salary found for role '{role}'. "
                    f"Please add this role to the budget allocation breakdown first."
                )
            )
        
        min_salary = float(result['min_salary'])
        max_salary = float(result['max_salary'])
        
        # Allow 10% variance to accommodate real-world variations
        tolerance = 0.10
        min_allowed = min_salary * (1 - tolerance)
        max_allowed = max_salary * (1 + tolerance)
        
        if salary_per_month < min_allowed or salary_per_month > max_allowed:
            if min_salary == max_salary:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Salary for '{role}' outside approved range. "
                        f"Approved: ₹{min_salary:,.2f} (±10%), "
                        f"Attempting: ₹{salary_per_month:,.2f}"
                    )
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Salary for '{role}' outside approved range. "
                        f"Range: ₹{min_salary:,.2f} - ₹{max_salary:,.2f} (±10%), "
                        f"Attempting: ₹{salary_per_month:,.2f}"
                    )
                )


def validate_equipment_cost_against_breakdown(project_id: int, item_name: str, unit_cost: float, quantity: int, conn):
    """Validate that total equipment cost doesn't exceed the allocated budget for this item"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Get approved total budget for this item
        # Using the auto-calculated total_amount from breakdown
        cur.execute("""
            SELECT COALESCE(SUM(total_amount), 0) as approved_total_budget
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        """, (project_id, item_name))
        
        result = cur.fetchone()
        if not result or not result['approved_total_budget']:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No approved budget found for item '{item_name}'. "
                    f"Please add this item to the budget allocation breakdown first."
                )
            )
        
        approved_total = float(result['approved_total_budget'])
        
        # Get current spending (using auto-calculated total_cost)
        cur.execute("""
            SELECT COALESCE(SUM(total_cost), 0) as current_spent
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


# OPTIONAL: Fund breakdown validators
# These are commented out as they may be too strict for real-world use
# Uncomment if you want to enforce strict alignment between funds and allocations

"""
def validate_manpower_funds_against_allocation(project_id: int, role: str, num_personnel: int, conn, exclude_fund_id: int = None):
    '''
    Check if manpower funds exceed approved posts
    
    NOTE: This validator may be too strict. In practice, funds can be received for
    more personnel than originally allocated, as long as total budget is not exceeded.
    '''
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT COALESCE(SUM(num_personnel), 0) as approved_posts
            FROM manpower_allocation_breakdown
            WHERE project_id = %s AND role = %s
        ''', (project_id, role))
        
        result = cur.fetchone()
        if not result or result['approved_posts'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved posts found for role '{role}' in budget allocation"
            )
        
        if exclude_fund_id:
            cur.execute('''
                SELECT COALESCE(SUM(num_personnel), 0) as current_funded
                FROM manpower_funds_breakdown
                WHERE project_id = %s AND role = %s AND breakdown_id != %s
            ''', (project_id, role, exclude_fund_id))
        else:
            cur.execute('''
                SELECT COALESCE(SUM(num_personnel), 0) as current_funded
                FROM manpower_funds_breakdown
                WHERE project_id = %s AND role = %s
            ''', (project_id, role))
        
        current = cur.fetchone()
        
        if int(current['current_funded']) + num_personnel > int(result['approved_posts']):
            # This could be a warning instead of an error
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Funding exceeds approved posts for '{role}'. "
                    f"Approved: {result['approved_posts']}, "
                    f"Currently funded: {current['current_funded']}, "
                    f"Attempting: {num_personnel}"
                )
            )


def validate_equipment_funds_against_allocation(project_id: int, item_name: str, quantity: int, conn, exclude_fund_id: int = None):
    '''
    Check if equipment funds exceed approved quantity
    
    NOTE: This validator may be too strict. In practice, funds can be received for
    more equipment than originally allocated, as long as total budget is not exceeded.
    '''
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT COALESCE(SUM(quantity), 0) as approved_qty
            FROM equipment_allocation_breakdown
            WHERE project_id = %s AND item_name = %s
        ''', (project_id, item_name))
        
        result = cur.fetchone()
        if not result or result['approved_qty'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No approved quantity found for item '{item_name}' in budget allocation"
            )
        
        if exclude_fund_id:
            cur.execute('''
                SELECT COALESCE(SUM(quantity), 0) as current_funded
                FROM equipment_funds_breakdown
                WHERE project_id = %s AND item_name = %s AND breakdown_id != %s
            ''', (project_id, item_name, exclude_fund_id))
        else:
            cur.execute('''
                SELECT COALESCE(SUM(quantity), 0) as current_funded
                FROM equipment_funds_breakdown
                WHERE project_id = %s AND item_name = %s
            ''', (project_id, item_name))
        
        current = cur.fetchone()
        
        if int(current['current_funded']) + quantity > int(result['approved_qty']):
            # This could be a warning instead of an error
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Funding exceeds approved quantity for '{item_name}'. "
                    f"Approved: {result['approved_qty']}, "
                    f"Currently funded: {current['current_funded']}, "
                    f"Attempting: {quantity}"
                )
            )
"""