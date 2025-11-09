from fastapi import FastAPI, HTTPException, Query,status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime,date
import json
import os
from decimal import Decimal
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm
from auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    Token,
    User,
    UserCreate,
    require_role
)
from config import settings

app = FastAPI(title="Project Tracking Dashboard API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection with environment variables
DB_CONFIG = {
    "host": settings.DB_HOST,
    "database": settings.DB_NAME,
    "user": settings.DB_USER,
    "password": settings.DB_PASSWORD,
    "port": settings.DB_PORT,
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

def validate_foreign_key(table: str, column: str, value: int, conn):
    """Validate that a foreign key exists"""
    with conn.cursor() as cur:
        cur.execute(f"SELECT 1 FROM {table} WHERE {column} = %s", (value,))
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Invalid {column}: {value} does not exist in {table}")

# New Pydantic models for breakdowns
class ManpowerBreakdownItem(BaseModel):
    role: str
    salary_per_month: float
    months: int
    num_personnel: int = 1
    
    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v

class EquipmentBreakdownItem(BaseModel):
    item_name: str
    quantity: int
    unit_cost: float
    
    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v
    
class ManpowerFundsBreakdownCreate(BaseModel):
    fund_id: int
    project_id: int
    role: str
    salary_per_month: float
    months: int
    num_personnel: int = 1

    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v


class EquipmentFundsBreakdownCreate(BaseModel):
    fund_id: int
    project_id: int
    item_name: str
    quantity: int = 1
    unit_cost: float

    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v


class ProjectCreate(BaseModel):
    project_no: str
    title: str
    alias: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    funding_agency_id: int
    technical_group_id: int
    # Budget allocations for each head
    manpower_allocation: Optional[float] = 0.0
    equipment_allocation: Optional[float] = 0.0
    consumables_allocation: Optional[float] = 0.0
    contingency_allocation: Optional[float] = 0.0
    travel_training_allocation: Optional[float] = 0.0
    overhead_allocation: Optional[float] = 0.0
    # NEW: Breakdown details
    manpower_breakdown: Optional[List[ManpowerBreakdownItem]] = []
    equipment_breakdown: Optional[List[EquipmentBreakdownItem]] = []
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('manpower_allocation', 'equipment_allocation', 'consumables_allocation',
                 'contingency_allocation', 'travel_training_allocation', 'overhead_allocation')
    @classmethod
    def validate_allocation_amounts(cls, v):
        if v is not None and v < 0:
            raise ValueError('Allocation amounts must be non-negative')
        return v

class BudgetAllocationCreate(BaseModel):
    project_id: int
    head: str
    allocated_amount: float
    manpower_breakdown: Optional[List[ManpowerBreakdownItem]] = []
    equipment_breakdown: Optional[List[EquipmentBreakdownItem]] = []
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v


class TechnicalGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class FundsReceivedCreate(BaseModel):
    project_id: int
    head: str
    amount: float
    date_received: str
    remarks: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_received')
    @classmethod
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

class FundsReceivedUpdate(BaseModel):
    head: Optional[str] = None
    amount: Optional[float] = None
    date_received: Optional[str] = None
    remarks: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        if v is not None:
            valid_heads = ['manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead']
            if v not in valid_heads:
                raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_received')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v

class ManpowerCreate(BaseModel):
    project_id: int
    role: str
    salary_per_month: float
    months: int
    date_incurred: Optional[str] = None
    num_personnel: int = 1
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v

class ManpowerUpdate(BaseModel):
    role: Optional[str] = None
    salary_per_month: Optional[float] = None
    months: Optional[int] = None
    date_incurred: Optional[str] = None
    num_personnel: Optional[int] = None
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('salary_per_month', 'months', 'num_personnel')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Must be a positive number')
        return v

class EquipmentCreate(BaseModel):
    project_id: int
    name: str
    purchase_date: Optional[str] = None
    quantity: int = 1
    unit_cost: float
    
    @field_validator('purchase_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v <= 0:
            raise ValueError('Must be a positive number')
        return v

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    purchase_date: Optional[str] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    
    @field_validator('purchase_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('quantity', 'unit_cost')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Must be a positive number')
        return v

class BudgetExpenditureCreate(BaseModel):
    project_id: int
    head: str
    amount: float
    date_incurred: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
        if v not in valid_heads:
            raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class BudgetExpenditureUpdate(BaseModel):
    head: Optional[str] = None
    amount: Optional[float] = None
    date_incurred: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('head')
    @classmethod
    def validate_head(cls, v):
        if v is not None:
            valid_heads = ['consumables', 'contingency', 'travel & training', 'overhead']
            if v not in valid_heads:
                raise ValueError(f'Head must be one of: {", ".join(valid_heads)}')
        return v
    
    @field_validator('date_incurred')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_positive_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Amount must be positive')
        return v

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super(DecimalEncoder, self).default(obj)

# AUTHENTICATION ENDPOINTS

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    print(f"   Login attempt received")
    print(f"   Username: '{form_data.username}'")
    print(f"   Password length: {len(form_data.password)}")
    
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        print(f" Authentication FAILED for username: '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f" Authentication SUCCESSFUL for user: {user.username}")
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Update last login
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = %s",
                (user.username,)
            )
            conn.commit()
    finally:
        conn.close()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@app.post("/users/register", response_model=User)
async def register_user(user: UserCreate, current_user: User = Depends(require_role("admin"))):
    """Admin only: Create a new user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if username exists
            cur.execute("SELECT username FROM users WHERE username = %s", (user.username,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Username already registered")
            
            # Check if email exists
            cur.execute("SELECT email FROM users WHERE email = %s", (user.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Create user
            hashed_password = get_password_hash(user.password)
            cur.execute(
                """INSERT INTO users (username, email, full_name, hashed_password, role)
                   VALUES (%s, %s, %s, %s, %s) RETURNING user_id, username, email, full_name, role, is_active""",
                (user.username, user.email, user.full_name, hashed_password, user.role)
            )
            new_user = cur.fetchone()
            conn.commit()
            return User(**new_user)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.get("/users", response_model=list)
async def list_users(current_user: User = Depends(require_role("admin"))):
    """Admin only: List all users"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username, email, full_name, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC"
            )
            users = cur.fetchall()
            return [dict(user) for user in users]
    finally:
        conn.close()

# Dashboard Statistics
@app.get("/dashboard/stats")
async def get_dashboard_stats():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) as total_projects FROM projects")
            total_projects = cur.fetchone()['total_projects']
            
            cur.execute("""
                SELECT COUNT(*) as active_projects 
                FROM projects 
                WHERE end_date IS NULL OR end_date >= CURRENT_DATE
            """)
            active_projects = cur.fetchone()['active_projects']
            
            cur.execute("""
                SELECT 
                    SUM(planned_allocation) AS total_allocation,
                    SUM(funds_received) AS total_funds,
                    SUM(actual_expenditure) AS total_expenditure
                FROM project_head_summary
            """)
            financial_stats = cur.fetchone()
            
            return {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "total_allocation": float(financial_stats['total_allocation'] or 0),
                "total_funds": float(financial_stats['total_funds'] or 0),
                "total_expenditure": float(financial_stats['total_expenditure'] or 0),
                "balance": float(
                    (financial_stats['total_funds'] or 0) -
                    (financial_stats['total_expenditure'] or 0)
                )
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# Financial Overview with pagination
@app.get("/financial-overview")
async def get_financial_overview(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            offset = (page - 1) * limit
            
            # total count
            cur.execute("SELECT COUNT(*) as total FROM projects")
            total_count = cur.fetchone()['total']
            
            # financial summary
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    tg.name AS technical_group,
                    fa.name AS agency_name,
                    
                    COALESCE(SUM(phs.planned_allocation), 0) AS total_allocation,
                    COALESCE(SUM(phs.funds_received), 0) AS total_funds_received,
                    COALESCE(SUM(phs.actual_expenditure), 0) AS total_expenditure,
                    
                    -- balances
                    COALESCE(SUM(phs.planned_allocation), 0) - COALESCE(SUM(phs.actual_expenditure), 0) AS budget_balance,
                    COALESCE(SUM(phs.funds_received), 0) - COALESCE(SUM(phs.actual_expenditure), 0) AS funding_balance                    
                    -- utilization vs budget
                    CASE 
                        WHEN COALESCE(SUM(phs.planned_allocation), 0) > 0 
                        THEN ROUND((SUM(phs.actual_expenditure) / SUM(phs.planned_allocation)) * 100, 2)
                        ELSE 0
                    END AS budget_utilization_percent,
                    
                    -- utilization vs funds
                    CASE 
                        WHEN COALESCE(SUM(phs.funds_received), 0) > 0 
                        THEN ROUND((SUM(phs.actual_expenditure) / SUM(phs.funds_received)) * 100, 2)
                        ELSE 0
                    END AS funds_utilization_percent
                    
                FROM projects p
                LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
                LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
                LEFT JOIN project_head_summary phs ON p.project_id = phs.project_id
                GROUP BY p.project_id, p.project_no, p.title, tg.name, fa.name
                ORDER BY p.project_no
                LIMIT %s OFFSET %s
            """, (limit, offset))
            
            results = cur.fetchall()
            return {
                "data": [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()


# Technical Groups endpoints
@app.get("/technical-groups")
async def get_technical_groups():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM technical_groups ORDER BY name")
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# Funding Agencies endpoints
@app.get("/funding-agencies")
async def get_funding_agencies():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agencies ORDER BY name")
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# Budget Allocation endpoints - updated!
@app.post("/budget-allocation")
async def create_budget_allocation(allocation: BudgetAllocationCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", allocation.project_id, conn)
            
            cur.execute(
                "INSERT INTO budget_allocation (project_id, head, allocated_amount) VALUES (%s, %s, %s) RETURNING *",
                (allocation.project_id, allocation.head, allocation.allocated_amount)
            )
            result = cur.fetchone()
            allocation_id = result['allocation_id']
            
            # Insert manpower breakdown if provided
            if allocation.head == 'manpower' and allocation.manpower_breakdown:
                for item in allocation.manpower_breakdown:
                    cur.execute(
                        """INSERT INTO manpower_allocation_breakdown 
                           (allocation_id, project_id, role, salary_per_month, months, num_personnel)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (allocation_id, allocation.project_id, item.role, 
                         item.salary_per_month, item.months, item.num_personnel)
                    )
            
            # Insert equipment breakdown if provided
            if allocation.head == 'equipment' and allocation.equipment_breakdown:
                for item in allocation.equipment_breakdown:
                    cur.execute(
                        """INSERT INTO equipment_allocation_breakdown 
                           (allocation_id, project_id, item_name, quantity, unit_cost)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (allocation_id, allocation.project_id, item.item_name, 
                         item.quantity, item.unit_cost)
                    )
            
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/projects/{project_id}/budget-allocation")
async def get_project_budget_allocation(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM budget_allocation WHERE project_id = %s ORDER BY head", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# new feature: Get manpower breakdown for an allocation
@app.get("/budget-allocation/{allocation_id}/manpower-breakdown")
async def get_manpower_breakdown(allocation_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_allocation_breakdown WHERE allocation_id = %s",
                (allocation_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# new feature: Get equipment breakdown for an allocation
@app.get("/budget-allocation/{allocation_id}/equipment-breakdown")
async def get_equipment_breakdown(allocation_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_allocation_breakdown WHERE allocation_id = %s",
                (allocation_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# new: Get plan vs actual comparison for manpower
@app.get("/projects/{project_id}/manpower-plan-vs-actual")
async def get_manpower_plan_vs_actual(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM manpower_plan_vs_actual WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# new: Get plan vs actual comparison for equipment
@app.get("/projects/{project_id}/equipment-plan-vs-actual")
async def get_equipment_plan_vs_actual(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM equipment_plan_vs_actual WHERE project_id = %s",
                (project_id,)
            )
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# Projects endpoints - updated!
@app.post("/projects")
async def create_project(project: ProjectCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funding_agencies", "agency_id", project.funding_agency_id, conn)
            validate_foreign_key("technical_groups", "group_id", project.technical_group_id, conn)
            
            cur.execute(
                """INSERT INTO projects 
                   (project_no, title, alias, start_date, end_date, funding_agency_id, technical_group_id) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (
                    project.project_no,
                    project.title,
                    project.alias if project.alias else None,
                    project.start_date,
                    project.end_date if project.end_date else None,
                    project.funding_agency_id,
                    project.technical_group_id
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

@app.get("/projects")
async def get_projects():
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

@app.get("/projects/{project_id}")
async def get_project(project_id: int):
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
            GROUP BY p.project_id, tg.name, fa.name;

            """, (project_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Project not found")
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()


# Delete a project
@app.delete("/projects/{project_id}")
async def delete_project(project_id: int):
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

# FUNDS BREAKDOWN ENDPOINTS

# Get manpower funds breakdown for project
@app.get("/projects/{project_id}/manpower-funds-breakdown")
async def get_project_manpower_funds_breakdown(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM manpower_funds_breakdown WHERE project_id = %s", (project_id,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()



# Get equipment funds breakdown for project
@app.get("/projects/{project_id}/equipment-funds-breakdown")
async def get_project_equipment_funds_breakdown(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM equipment_funds_breakdown WHERE project_id = %s", (project_id,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# Funds breakdown summary view
@app.get("/projects/{project_id}/funds-breakdown-summary")
async def get_funds_breakdown_summary(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funds_breakdown_summary WHERE project_id = %s", (project_id,))
            results = cur.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/budget-expenditure")
async def create_budget_expenditure(exp: BudgetExpenditureCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", exp.project_id, conn)
            
            # Validate transaction date
            if exp.date_incurred:
                validate_transaction_date(exp.project_id, exp.date_incurred, conn)
            
            # Validate expenditure against budget
            validate_expenditure_against_budget(exp.project_id, exp.head, exp.amount, conn)
            
            cur.execute(
                """INSERT INTO budget_expenditure (project_id, head, amount, date_incurred, description)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (exp.project_id, exp.head, exp.amount, exp.date_incurred, exp.description)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/projects/{project_id}/funds-received")
async def get_project_funds_received(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funds_received WHERE project_id = %s ORDER BY date_received", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.post("/funds-received")
async def create_funds_received(fund: FundsReceivedCreate):
    conn = get_db_connection()
    warnings = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", fund.project_id, conn)
            
            # Collect warnings
            warning = validate_transaction_date(fund.project_id, fund.date_received, conn)
            if warning:
                warnings.append(warning)
            
            validate_funds_against_budget(fund.project_id, fund.head, fund.amount, conn)
            
            cur.execute(
                """INSERT INTO funds_received (project_id, head, amount, date_received, remarks)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (fund.project_id, fund.head, fund.amount, fund.date_received, fund.remarks)
            )
            result = cur.fetchone()
            conn.commit()
            
            response_data = json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
            if warnings:
                return {
                    "data": response_data,
                    "warnings": warnings
                }
            
            return response_data
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/manpower")
async def create_manpower(man: ManpowerCreate):
    conn = get_db_connection()
    warnings = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", man.project_id, conn)
            
            # Collect warnings
            if man.date_incurred:
                warning = validate_transaction_date(man.project_id, man.date_incurred, conn)
                if warning:
                    warnings.append(warning)
            
            # NEW: Validate salary matches approved breakdown
            validate_manpower_salary_against_breakdown(man.project_id, man.role, man.salary_per_month, conn)
            
            validate_manpower_against_approved_posts(man.project_id, man.role, man.num_personnel, conn)
            
            total_amount = man.salary_per_month * man.months * man.num_personnel
            validate_expenditure_against_budget(man.project_id, 'manpower', total_amount, conn)

            cur.execute(
                """INSERT INTO manpower (project_id, role, salary_per_month, months, date_incurred, num_personnel)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (man.project_id, man.role, man.salary_per_month, man.months, man.date_incurred, man.num_personnel)
            )
            result = cur.fetchone()
            conn.commit()
            
            response_data = json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
            if warnings:
                return {
                    "data": response_data,
                    "warnings": warnings
                }
            
            return response_data
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/manpower-funds-breakdown")
async def create_manpower_funds_breakdown(data: ManpowerFundsBreakdownCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funds_received", "fund_id", data.fund_id, conn)
            validate_foreign_key("projects", "project_id", data.project_id, conn)
            
            validate_manpower_funds_against_allocation(data.project_id, data.role, data.num_personnel, conn)

            cur.execute(
                """INSERT INTO manpower_funds_breakdown 
                   (fund_id, project_id, role, salary_per_month, months, num_personnel)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (data.fund_id, data.project_id, data.role, data.salary_per_month, data.months, data.num_personnel)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/equipment-funds-breakdown")
async def create_equipment_funds_breakdown(data: EquipmentFundsBreakdownCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funds_received", "fund_id", data.fund_id, conn)
            validate_foreign_key("projects", "project_id", data.project_id, conn)
            
            validate_equipment_funds_against_allocation(data.project_id, data.item_name, data.quantity, conn)

            cur.execute(
                """INSERT INTO equipment_funds_breakdown 
                   (fund_id, project_id, item_name, quantity, unit_cost)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (data.fund_id, data.project_id, data.item_name, data.quantity, data.unit_cost)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# Add endpoints for approved items (for dropdown UX)
@app.get("/projects/{project_id}/approved-manpower-roles")
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

@app.get("/projects/{project_id}/approved-equipment-items")
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

@app.put("/funds-received/{fund_id}")
async def update_funds_received(fund_id: int, fund: FundsReceivedUpdate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if fund.head is not None:
                update_fields.append("head = %s")
                values.append(fund.head)
            if fund.amount is not None:
                update_fields.append("amount = %s")
                values.append(fund.amount)
            if fund.date_received is not None:
                update_fields.append("date_received = %s")
                values.append(fund.date_received)
            if fund.remarks is not None:
                update_fields.append("remarks = %s")
                values.append(fund.remarks)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            values.append(fund_id)
            query = f"UPDATE funds_received SET {', '.join(update_fields)} WHERE fund_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Funds record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.delete("/funds-received/{fund_id}")
async def delete_funds_received(fund_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM funds_received WHERE fund_id = %s RETURNING *", (fund_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Funds record not found")
            conn.commit()
            return {"message": "Funds record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# --- Manpower Endpoints ---        
@app.get("/projects/{project_id}/manpower")
async def get_project_manpower(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM manpower WHERE project_id = %s ORDER BY date_incurred", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.put("/manpower/{manpower_id}")
async def update_manpower(manpower_id: int, man: ManpowerUpdate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if man.role is not None:
                update_fields.append("role = %s")
                values.append(man.role)
            if man.salary_per_month is not None:
                update_fields.append("salary_per_month = %s")
                values.append(man.salary_per_month)
            if man.months is not None:
                update_fields.append("months = %s")
                values.append(man.months)
            if man.date_incurred is not None:
                update_fields.append("date_incurred = %s")
                values.append(man.date_incurred)
            if man.num_personnel is not None:
                update_fields.append("num_personnel = %s")
                values.append(man.num_personnel)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(manpower_id)
            query = f"UPDATE manpower SET {', '.join(update_fields)} WHERE manpower_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Manpower record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.delete("/manpower/{manpower_id}")
async def delete_manpower(manpower_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM manpower WHERE manpower_id = %s RETURNING *", (manpower_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Manpower record not found")
            conn.commit()
            return {"message": "Manpower record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# --- Equipment Endpoints ---

@app.post("/equipment")
async def create_equipment(equip: EquipmentCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("projects", "project_id", equip.project_id, conn)
            
            # Validate transaction date
            if equip.purchase_date:
                validate_transaction_date(equip.project_id, equip.purchase_date, conn)

            # NEW: Validate unit cost matches approved breakdown
            validate_equipment_cost_against_breakdown(equip.project_id, equip.name, equip.unit_cost, conn)
            
            # Validate against approved quantity
            validate_equipment_against_approved_quantity(equip.project_id, equip.name, equip.quantity, conn)
            
            # Validate expenditure against budget
            total_amount = equip.quantity * equip.unit_cost
            validate_expenditure_against_budget(equip.project_id, 'equipment', total_amount, conn)
            
            cur.execute(
                """INSERT INTO equipment (project_id, name, purchase_date, quantity, unit_cost)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (equip.project_id, equip.name, equip.purchase_date, equip.quantity, equip.unit_cost)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/projects/{project_id}/equipment")
async def get_project_equipment(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM equipment WHERE project_id = %s ORDER BY purchase_date", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.put("/equipment/{equipment_id}")
async def update_equipment(equipment_id: int, equip: EquipmentUpdate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if equip.name is not None:
                update_fields.append("name = %s")
                values.append(equip.name)
            if equip.purchase_date is not None:
                update_fields.append("purchase_date = %s")
                values.append(equip.purchase_date)
            if equip.quantity is not None:
                update_fields.append("quantity = %s")
                values.append(equip.quantity)
            if equip.unit_cost is not None:
                update_fields.append("unit_cost = %s")
                values.append(equip.unit_cost)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(equipment_id)
            query = f"UPDATE equipment SET {', '.join(update_fields)} WHERE equipment_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Equipment record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM equipment WHERE equipment_id = %s RETURNING *", (equipment_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Equipment record not found")
            conn.commit()
            return {"message": "Equipment record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# --- Budget Expenditure Endpoints ---
@app.get("/projects/{project_id}/budget-expenditure")
async def get_project_budget_expenditure(project_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM budget_expenditure WHERE project_id = %s ORDER BY date_incurred", (project_id,))
            results = cur.fetchall()
            return [json.loads(json.dumps(dict(row), cls=DecimalEncoder)) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.put("/budget-expenditure/{expenditure_id}")
async def update_budget_expenditure(expenditure_id: int, exp: BudgetExpenditureUpdate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            if exp.head is not None:
                update_fields.append("head = %s")
                values.append(exp.head)
            if exp.amount is not None:
                update_fields.append("amount = %s")
                values.append(exp.amount)
            if exp.date_incurred is not None:
                update_fields.append("date_incurred = %s")
                values.append(exp.date_incurred)
            if exp.description is not None:
                update_fields.append("description = %s")
                values.append(exp.description)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(expenditure_id)
            query = f"UPDATE budget_expenditure SET {', '.join(update_fields)} WHERE expenditure_id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Expenditure record not found")
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.delete("/budget-expenditure/{expenditure_id}")
async def delete_budget_expenditure(expenditure_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM budget_expenditure WHERE expenditure_id = %s RETURNING *", (expenditure_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Expenditure record not found")
            conn.commit()
            return {"message": "Expenditure record deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# Budget Breakdown Comparison
@app.get("/projects/{project_id}/budget-breakdown-comparison")
async def get_budget_breakdown_comparison(
    project_id: int,
    as_of_date: Optional[str] = Query(None, description="Cumulative as of date in YYYY-MM-DD format"),
    start_date: Optional[str] = Query(None, description="Start date for range filter in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date for range filter in YYYY-MM-DD format")
):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Determine filter mode
            if start_date and end_date:
                # Date range mode: between start_date and end_date
                date_condition_fr = "fr.date_received BETWEEN %s AND %s"
                date_condition_be = "be.date_incurred BETWEEN %s AND %s"
                date_condition_m = "m.date_incurred BETWEEN %s AND %s"
                date_condition_e = "e.purchase_date BETWEEN %s AND %s"
                date_params = [start_date, end_date] * 4
                filter_label = f"between {start_date} and {end_date}"
            else:
                # As of date mode: cumulative up to as_of_date
                filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
                date_condition_fr = "fr.date_received <= %s"
                date_condition_be = "be.date_incurred <= %s"
                date_condition_m = "m.date_incurred <= %s"
                date_condition_e = "e.purchase_date <= %s"
                date_params = [filter_date] * 4
                filter_label = f"as of {filter_date}"
            
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
                'filter_type': 'range' if start_date and end_date else 'as_of',
                'filter_label': filter_label,
                'data': processed_results
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# All projects budget summary
@app.get("/budget-breakdown-all-projects")
async def get_all_projects_budget_breakdown(
    as_of_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
            
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_no,
                    p.title,
                    COALESCE(SUM(ba.allocated_amount), 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN fr.date_received <= %s THEN fr.amount 
                        ELSE 0 
                    END), 0) as total_funds_received,
                    COALESCE(SUM(CASE 
                        WHEN be.date_incurred <= %s THEN be.amount 
                        ELSE 0 
                    END), 0) +
                    COALESCE(SUM(CASE 
                        WHEN m.date_incurred <= %s THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) +
                    COALESCE(SUM(CASE 
                        WHEN e.purchase_date <= %s THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as total_expenditure
                FROM projects p
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON p.project_id = fr.project_id
                LEFT JOIN budget_expenditure be ON p.project_id = be.project_id
                LEFT JOIN manpower m ON p.project_id = m.project_id
                LEFT JOIN equipment e ON p.project_id = e.project_id
                GROUP BY p.project_id, p.project_no, p.title
                ORDER BY p.project_no
            """, (filter_date, filter_date, filter_date, filter_date))
            
            results = cur.fetchall()
            processed_results = []
            for row in results:
                processed_results.append({
                    'project_id': row['project_id'],
                    'project_no': row['project_no'],
                    'title': row['title'],
                    'approved_budget': float(row['approved_budget']),
                    'total_funds_received': float(row['total_funds_received']),
                    'total_expenditure': float(row['total_expenditure']),
                    'unspent_balance': float(row['total_funds_received']) - float(row['total_expenditure'])
                })
            
            return {
                'as_of_date': filter_date,
                'data': processed_results
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# Budget Breakdown by Technical Group
@app.get("/budget-breakdown-by-technical-group")
async def get_budget_breakdown_by_technical_group(
    as_of_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
            
            cur.execute("""
                SELECT 
                    tg.name as technical_group,
                    ba.head,
                    COALESCE(SUM(ba.allocated_amount), 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN fr.date_received <= %s THEN fr.amount 
                        ELSE 0 
                    END), 0) as funds_received,
                    COALESCE(SUM(CASE 
                        WHEN be.date_incurred <= %s THEN be.amount 
                        ELSE 0 
                    END), 0) as expenditure_general,
                    COALESCE(SUM(CASE 
                        WHEN m.date_incurred <= %s THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) as expenditure_manpower,
                    COALESCE(SUM(CASE 
                        WHEN e.purchase_date <= %s THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as expenditure_equipment
                FROM technical_groups tg
                LEFT JOIN projects p ON tg.group_id = p.technical_group_id
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
                LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
                LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
                LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
                GROUP BY tg.name, ba.head
                HAVING SUM(ba.allocated_amount) > 0
                ORDER BY tg.name, ba.head
            """, (filter_date, filter_date, filter_date, filter_date))
            
            results = cur.fetchall()
            
            # Process results to group by technical group
            grouped_data = {}
            for row in results:
                group = row['technical_group']
                if group not in grouped_data:
                    grouped_data[group] = []
                
                total_expenditure = (
                    float(row['expenditure_general']) +
                    float(row['expenditure_manpower']) +
                    float(row['expenditure_equipment'])
                )
                
                grouped_data[group].append({
                    'head': row['head'],
                    'approved_budget': float(row['approved_budget']),
                    'funds_received': float(row['funds_received']),
                    'total_expenditure': total_expenditure,
                    'budget_balance': float(row['approved_budget']) - total_expenditure,
                    'funds_balance': float(row['funds_received']) - total_expenditure
                })
            
            return {
                'as_of_date': filter_date,
                'data': grouped_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()


# Budget Breakdown by Funding Agency
@app.get("/budget-breakdown-by-funding-agency")
async def get_budget_breakdown_by_funding_agency(
    as_of_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            filter_date = as_of_date if as_of_date else datetime.now().strftime('%Y-%m-%d')
            
            cur.execute("""
                SELECT 
                    fa.name as funding_agency,
                    ba.head,
                    COALESCE(SUM(ba.allocated_amount), 0) as approved_budget,
                    COALESCE(SUM(CASE 
                        WHEN fr.date_received <= %s THEN fr.amount 
                        ELSE 0 
                    END), 0) as funds_received,
                    COALESCE(SUM(CASE 
                        WHEN be.date_incurred <= %s THEN be.amount 
                        ELSE 0 
                    END), 0) as expenditure_general,
                    COALESCE(SUM(CASE 
                        WHEN m.date_incurred <= %s THEN m.salary_per_month * m.months * m.num_personnel 
                        ELSE 0 
                    END), 0) as expenditure_manpower,
                    COALESCE(SUM(CASE 
                        WHEN e.purchase_date <= %s THEN e.quantity * e.unit_cost 
                        ELSE 0 
                    END), 0) as expenditure_equipment
                FROM funding_agencies fa
                LEFT JOIN projects p ON fa.agency_id = p.funding_agency_id
                LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
                LEFT JOIN funds_received fr ON ba.project_id = fr.project_id AND ba.head = fr.head
                LEFT JOIN budget_expenditure be ON ba.project_id = be.project_id AND ba.head = be.head
                LEFT JOIN manpower m ON ba.project_id = m.project_id AND ba.head = 'manpower'
                LEFT JOIN equipment e ON ba.project_id = e.project_id AND ba.head = 'equipment'
                GROUP BY fa.name, ba.head
                HAVING SUM(ba.allocated_amount) > 0
                ORDER BY fa.name, ba.head
            """, (filter_date, filter_date, filter_date, filter_date))
            
            results = cur.fetchall()
            
            # Process results to group by funding agency
            grouped_data = {}
            for row in results:
                agency = row['funding_agency']
                if agency not in grouped_data:
                    grouped_data[agency] = []
                
                total_expenditure = (
                    float(row['expenditure_general']) +
                    float(row['expenditure_manpower']) +
                    float(row['expenditure_equipment'])
                )
                
                grouped_data[agency].append({
                    'head': row['head'],
                    'approved_budget': float(row['approved_budget']),
                    'funds_received': float(row['funds_received']),
                    'total_expenditure': total_expenditure,
                    'budget_balance': float(row['approved_budget']) - total_expenditure,
                    'funds_balance': float(row['funds_received']) - total_expenditure
                })
            
            return {
                'as_of_date': filter_date,
                'data': grouped_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

# Get manpower allocation breakdown for project
@app.get("/projects/{project_id}/manpower-allocation-breakdown")
async def get_project_manpower_allocation_breakdown(project_id: int):
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

# Get equipment allocation breakdown for project
@app.get("/projects/{project_id}/equipment-allocation-breakdown")
async def get_project_equipment_allocation_breakdown(project_id: int):
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
        # Get approved posts from allocation breakdown
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
        
        # Check current assignments (excluding the current record if updating)
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
        # Get approved quantity from allocation breakdown
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
        
        # Check current purchases (excluding the current record if updating)
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
        
        # Allow transactions after end date with warning (projects often continue)
        if project['end_date'] and trans_date > project['end_date']:
            return {
                "warning": f"Transaction date {transaction_date} is after project end date {project['end_date']}"
            }
    
    return None

def validate_manpower_funds_against_allocation(project_id: int, role: str, num_personnel: int, conn, exclude_fund_id: int = None):
    """Check if manpower funds exceed approved posts"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Get approved posts
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
        
        # Check current funds breakdown
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
        # Get approved quantity
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
        
        # Check current funds breakdown
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
        
        # Allow small floating point differences (₹1)
        if abs(salary_per_month - approved_salary) > 1.0:
            raise HTTPException(
                status_code=400,
                detail=f"Salary for '{role}' does not match approved amount. Approved: ₹{approved_salary:,.2f}, Attempting: ₹{salary_per_month:,.2f}"
            )


def validate_equipment_cost_against_breakdown(project_id: int, item_name: str, unit_cost: float, quantity: int, conn):
    """Validate that total equipment cost doesn't exceed the allocated budget for this item"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Get total approved budget for this item
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
        
        # Get current spending on this item (excluding current transaction)
        cur.execute("""
            SELECT COALESCE(SUM(quantity * unit_cost), 0) as current_spent
            FROM equipment
            WHERE project_id = %s AND name = %s
        """, (project_id, item_name))
        
        current = cur.fetchone()
        current_spent = float(current['current_spent'])
        
        # Check if new purchase would exceed total approved budget
        new_cost = unit_cost * quantity
        if current_spent + new_cost > approved_total:
            raise HTTPException(
                status_code=400,
                detail=f"Total cost for '{item_name}' exceeds approved budget. Approved: ₹{approved_total:,.2f}, Already spent: ₹{current_spent:,.2f}, Attempting: ₹{new_cost:,.2f}, Would exceed by: ₹{(current_spent + new_cost - approved_total):,.2f}"
            )        
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )