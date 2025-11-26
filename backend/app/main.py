# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    reports
)

app = FastAPI(
    title="Project Tracking Dashboard API",
    description="Comprehensive project budget tracking and management system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
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
app.include_router(reports.router)

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