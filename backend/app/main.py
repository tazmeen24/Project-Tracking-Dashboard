# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
import json

# Import routers using relative imports
from .routes import (
    auth,
    dashboard,
    lookups,
    projects,
    budget,
    funds,
    manpower,
    equipment,
    expenditure,
    reports,
    investigators,
    agency_details,
    financial_summary,
    analytics,
    uc_routes,
    installment_routes,
    technical_groups,
    funding_agency,
)
from .database import get_db_connection
from .auth import get_current_user
from .models.auth import User
from .utils.json_encoder import DecimalEncoder

app = FastAPI(
    title="Project Tracking Dashboard API",
    description="Comprehensive project budget tracking and management system",
    version="1.0.0"
)

#  PRODUCTION-READY CORS Configuration
origins = [
    # Local development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    
    # Render production 
    "https://project-tracking-dashboard-frontend-1.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(lookups.router)
app.include_router(projects.router)
app.include_router(budget.router)
app.include_router(funds.router)
app.include_router(manpower.router)
app.include_router(equipment.router)
app.include_router(expenditure.router)
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(investigators.router)
app.include_router(agency_details.router)
app.include_router(financial_summary.router)
app.include_router(analytics.router)
app.include_router(uc_routes.router)
app.include_router(installment_routes.router)  
app.include_router(technical_groups.router, prefix="/api")
app.include_router(funding_agency.router)


@app.get("/api/projects/{project_id}/installments")
def get_project_installments(
    project_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get all installments for a project with fund allocations"""
    from .routes.installment_routes import get_installment_with_funds
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get all installments for project
            cur.execute("""
                SELECT * FROM project_installments
                WHERE project_id = %s
                ORDER BY installment_number
            """, (project_id,))
            
            installments = cur.fetchall()
            
            # For each installment, get fund allocations with breakdowns
            result = []
            for inst in installments:
                installment_data = dict(inst)
                
                # Get funds for this installment
                cur.execute("""
                    SELECT * FROM funds_received
                    WHERE installment_id = %s
                """, (inst['installment_id'],))
                
                funds = cur.fetchall()
                fund_allocations = []
                
                for fund in funds:
                    fund_data = {
                        'fund_id': fund['fund_id'],
                        'head': fund['head'],
                        'amount': float(fund['amount']),
                        'date_received': fund['date_received'].isoformat(),
                        'remarks': fund['remarks'],
                        'has_breakdown': False,
                        'breakdown_count': 0,
                        'breakdown': []
                    }
                    
                    # Get breakdown if applicable
                    if fund['head'] == 'manpower':
                        cur.execute("""
                            SELECT * FROM manpower_funds_breakdown
                            WHERE fund_id = %s
                        """, (fund['fund_id'],))
                        breakdown = cur.fetchall()
                        if breakdown:
                            fund_data['has_breakdown'] = True
                            fund_data['breakdown_count'] = len(breakdown)
                            fund_data['breakdown'] = [
                                {
                                    'role': b['role'],
                                    'salary_per_month': float(b['salary_per_month']),
                                    'months': b['months'],
                                    'num_personnel': b['num_personnel'],
                                    'total_amount': float(b['total_amount'])
                                }
                                for b in breakdown
                            ]
                    
                    elif fund['head'] == 'equipment':
                        cur.execute("""
                            SELECT * FROM equipment_funds_breakdown
                            WHERE fund_id = %s
                        """, (fund['fund_id'],))
                        breakdown = cur.fetchall()
                        if breakdown:
                            fund_data['has_breakdown'] = True
                            fund_data['breakdown_count'] = len(breakdown)
                            fund_data['breakdown'] = [
                                {
                                    'item_name': b['item_name'],
                                    'quantity': b['quantity'],
                                    'unit_cost': float(b['unit_cost']),
                                    'total_amount': float(b['total_amount'])
                                }
                                for b in breakdown
                            ]
                    
                    fund_allocations.append(fund_data)
                
                installment_data['installment_id'] = inst['installment_id']
                installment_data['project_id'] = inst['project_id']
                installment_data['installment_number'] = inst['installment_number']
                installment_data['sanction_number'] = inst['sanction_number']
                installment_data['sanction_date'] = inst['sanction_date'].isoformat()
                installment_data['total_amount'] = float(inst['total_amount'])
                installment_data['date_received'] = inst['date_received'].isoformat()
                installment_data['remarks'] = inst['remarks']
                installment_data['created_at'] = inst['created_at'].isoformat() if inst.get('created_at') else None
                installment_data['updated_at'] = inst['updated_at'].isoformat() if inst.get('updated_at') else None
                installment_data['funds_count'] = len(funds)
                installment_data['fund_allocations'] = fund_allocations
                
                result.append(installment_data)
            
            return json.loads(json.dumps(result, cls=DecimalEncoder))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Project Tracking Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )