# backend/app/routes/uc_routes.py
"""
API routes for Utilization Certificate (UC) operations
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date
import os

from app.database import get_db_connection
from app.services.uc_service import UCService
from app.services.uc_generator_docx import UCWordGenerator
from app.services.uc_generator_pdf import UCPDFGenerator
from app.auth import get_current_user

router = APIRouter(prefix="/api/uc", tags=["Utilization Certificates"])


# ============================================================================
# Request/Response Models
# ============================================================================

class GenerateUCRequest(BaseModel):
    project_id: int
    financial_year: str  # Format: "2024-25"
    format: str = "docx"  # "docx" or "pdf"


class CreateUCRequest(BaseModel):
    project_id: int
    financial_year: str
    interest_earned: Optional[float] = 0.0


class UpdateUCStatusRequest(BaseModel):
    status: str  # "draft", "submitted", "approved"
    pi_signature_date: Optional[date] = None
    admin_signature_date: Optional[date] = None
    head_signature_date: Optional[date] = None


# ============================================================================
# Routes
# ============================================================================

@router.post("/generate")
async def generate_uc(
    request: GenerateUCRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Generate UC document (Word or PDF) for a project and financial year
    
    - **project_id**: Project ID
    - **financial_year**: Financial year (e.g., "2024-25")
    - **format**: Output format ("docx" or "pdf")
    """
    try:
        conn = get_db_connection()
        uc_service = UCService(conn)
        
        # Get UC data
        uc_data = uc_service.get_uc_data(request.project_id, request.financial_year)
        
        # Generate document
        if request.format.lower() == "pdf":
            file_path = UCPDFGenerator.generate(uc_data)
            media_type = "application/pdf"
            filename = f"UC_{request.project_id}_{request.financial_year}.pdf"
        else:  # default to docx
            file_path = UCWordGenerator.generate(uc_data)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"UC_{request.project_id}_{request.financial_year}.docx"
        
        conn.close()
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating UC: {str(e)}")


@router.post("/create")
async def create_uc(
    request: CreateUCRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create UC record in database (without generating document)
    
    This stores the UC data for later retrieval and document generation
    """
    try:
        conn = get_db_connection()
        uc_service = UCService(conn)
        
        uc_id = uc_service.create_uc(
            project_id=request.project_id,
            financial_year=request.financial_year,
            generated_by=current_user.get('user_id')
        )
        
        conn.close()
        
        return {
            "success": True,
            "uc_id": uc_id,
            "message": f"UC created successfully for FY {request.financial_year}"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating UC: {str(e)}")


@router.get("/project/{project_id}")
async def get_project_ucs(
    project_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all UCs for a project
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM vw_uc_summary 
            WHERE project_id = %s
            ORDER BY financial_year DESC
        """, (project_id,))
        
        columns = [desc[0] for desc in cursor.description]
        ucs = []
        
        for row in cursor.fetchall():
            uc = dict(zip(columns, row))
            # Convert date objects to strings
            for key, value in uc.items():
                if isinstance(value, date):
                    uc[key] = value.isoformat()
            ucs.append(uc)
        
        cursor.close()
        conn.close()
        
        return {
            "project_id": project_id,
            "ucs": ucs
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching UCs: {str(e)}")


@router.get("/{uc_id}")
async def get_uc(
    uc_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get UC details by ID
    """
    try:
        conn = get_db_connection()
        uc_service = UCService(conn)
        
        uc_data = uc_service.get_uc_by_id(uc_id)
        conn.close()
        
        # Convert date objects to strings
        for key, value in uc_data['uc_summary'].items():
            if isinstance(value, date):
                uc_data['uc_summary'][key] = value.isoformat()
        
        return uc_data
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching UC: {str(e)}")


@router.put("/{uc_id}/status")
async def update_uc_status(
    uc_id: int,
    request: UpdateUCStatusRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update UC status (draft → submitted → approved)
    """
    try:
        conn = get_db_connection()
        uc_service = UCService(conn)
        
        signature_data = {}
        if request.pi_signature_date:
            signature_data['pi_signature_date'] = request.pi_signature_date
        if request.admin_signature_date:
            signature_data['admin_signature_date'] = request.admin_signature_date
        if request.head_signature_date:
            signature_data['head_signature_date'] = request.head_signature_date
        
        uc_service.update_uc_status(uc_id, request.status, signature_data)
        conn.close()
        
        return {
            "success": True,
            "message": f"UC status updated to {request.status}"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating UC status: {str(e)}")


@router.get("/data/{project_id}/{financial_year}")
async def get_uc_data(
    project_id: int,
    financial_year: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get UC data without generating document (for preview)
    
    - **project_id**: Project ID
    - **financial_year**: Financial year (e.g., "2024-25")
    """
    try:
        conn = get_db_connection()
        uc_service = UCService(conn)
        
        uc_data = uc_service.get_uc_data(project_id, financial_year)
        conn.close()
        
        # Convert date objects to strings
        uc_data['period_from'] = uc_data['period_from'].isoformat()
        uc_data['period_to'] = uc_data['period_to'].isoformat()
        
        for key, value in uc_data['project'].items():
            if isinstance(value, date):
                uc_data['project'][key] = value.isoformat()
        
        return uc_data
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching UC data: {str(e)}")


@router.delete("/{uc_id}")
async def delete_uc(
    uc_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete a UC record (only if status is 'draft')
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check status
        cursor.execute("""
            SELECT status FROM utilization_certificates WHERE uc_id = %s
        """, (uc_id,))
        
        result = cursor.fetchone()
        if not result:
            raise ValueError(f"UC {uc_id} not found")
        
        if result[0] != 'draft':
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete UC with status '{result[0]}'. Only draft UCs can be deleted."
            )
        
        # Delete UC
        cursor.execute("""
            DELETE FROM utilization_certificates WHERE uc_id = %s
        """, (uc_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "UC deleted successfully"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting UC: {str(e)}")