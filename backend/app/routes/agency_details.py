# app/routes/agency_details.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from app.models.funding_agency import (
    FundingAgencyCreate,
    FundingAgencyUpdate,
    FundingAgencyResponse,
    FundingAgencyDetailsCreate,
    FundingAgencyDetailsUpdate,
    FundingAgencyDetailsResponse,
    FundingAgencyFullResponse
)
from app.database import get_db_connection
from app.auth import get_current_user

router = APIRouter(prefix="/funding-agencies", tags=["Funding Agencies"])

# ==================== FUNDING AGENCY BASIC OPERATIONS ====================

@router.post("/", response_model=FundingAgencyResponse, status_code=201)
async def create_funding_agency(
    agency: FundingAgencyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new funding agency"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            """
            INSERT INTO funding_agencies (name, description)
            VALUES (%s, %s)
            RETURNING agency_id, name, description, created_at
            """,
            (agency.name, agency.description)
        )
        
        new_agency = cursor.fetchone()
        conn.commit()
        
        return FundingAgencyResponse(**new_agency)
        
    except psycopg2.IntegrityError as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Agency with this name already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating funding agency: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/", response_model=List[FundingAgencyResponse])
async def get_all_funding_agencies(
    current_user: dict = Depends(get_current_user)
):
    """Get all funding agencies"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            """
            SELECT agency_id, name, description, created_at
            FROM funding_agencies
            ORDER BY name
            """
        )
        
        agencies = cursor.fetchall()
        return [FundingAgencyResponse(**agency) for agency in agencies]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching funding agencies: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/{agency_id}", response_model=FundingAgencyFullResponse)
async def get_funding_agency(
    agency_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific funding agency with its details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get agency basic info
        cursor.execute(
            """
            SELECT agency_id, name, description, created_at
            FROM funding_agencies
            WHERE agency_id = %s
            """,
            (agency_id,)
        )
        
        agency = cursor.fetchone()
        if not agency:
            raise HTTPException(status_code=404, detail="Funding agency not found")
        
        # Get agency details
        cursor.execute(
            """
            SELECT id, agency_id, contact_person, designation, mobile, email,
                   sanctioned_number, scheme, cna_sub_agency,
                   bank_name, bank_account_no, created_at
            FROM funding_agency_details
            WHERE agency_id = %s
            """,
            (agency_id,)
        )
        
        details = cursor.fetchone()
        
        return FundingAgencyFullResponse(
            **agency,
            details=FundingAgencyDetailsResponse(**details) if details else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching funding agency: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.put("/{agency_id}", response_model=FundingAgencyResponse)
async def update_funding_agency(
    agency_id: int,
    agency: FundingAgencyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a funding agency's basic information"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if agency exists
        cursor.execute("SELECT agency_id FROM funding_agencies WHERE agency_id = %s", (agency_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Funding agency not found")
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if agency.name is not None:
            update_fields.append("name = %s")
            values.append(agency.name)
        
        if agency.description is not None:
            update_fields.append("description = %s")
            values.append(agency.description)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(agency_id)
        
        cursor.execute(
            f"""
            UPDATE funding_agencies
            SET {', '.join(update_fields)}
            WHERE agency_id = %s
            RETURNING agency_id, name, description, created_at
            """,
            values
        )
        
        updated_agency = cursor.fetchone()
        conn.commit()
        
        return FundingAgencyResponse(**updated_agency)
        
    except HTTPException:
        raise
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Agency name already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating funding agency: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.delete("/{agency_id}", status_code=204)
async def delete_funding_agency(
    agency_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a funding agency (CASCADE will delete details and related projects)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT agency_id FROM funding_agencies WHERE agency_id = %s", (agency_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Funding agency not found")
        
        cursor.execute("DELETE FROM funding_agencies WHERE agency_id = %s", (agency_id,))
        conn.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting funding agency: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ==================== FUNDING AGENCY DETAILS OPERATIONS ====================

@router.post("/{agency_id}/details", response_model=FundingAgencyDetailsResponse, status_code=201)
async def create_funding_agency_details(
    agency_id: int,
    details: FundingAgencyDetailsCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create or update funding agency details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Verify agency exists
        cursor.execute("SELECT agency_id FROM funding_agencies WHERE agency_id = %s", (agency_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Funding agency not found")
        
        # Check if agency_id in body matches URL parameter
        if details.agency_id != agency_id:
            raise HTTPException(status_code=400, detail="Agency ID mismatch")
        
        # Check if details already exist
        cursor.execute(
            "SELECT id FROM funding_agency_details WHERE agency_id = %s",
            (agency_id,)
        )
        existing = cursor.fetchone()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="Details already exist for this agency. Use PUT to update."
            )
        
        # Insert new details
        cursor.execute(
            """
            INSERT INTO funding_agency_details (
                agency_id, contact_person, designation, mobile, email,
                sanctioned_number, scheme, cna_sub_agency,
                bank_name, bank_account_no
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, agency_id, contact_person, designation, mobile, email,
                      sanctioned_number, scheme, cna_sub_agency,
                      bank_name, bank_account_no, created_at
            """,
            (
                details.agency_id, details.contact_person, details.designation,
                details.mobile, details.email, details.sanctioned_number,
                details.scheme, details.cna_sub_agency, details.bank_name,
                details.bank_account_no
            )
        )
        
        new_details = cursor.fetchone()
        conn.commit()
        
        return FundingAgencyDetailsResponse(**new_details)
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating agency details: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/{agency_id}/details", response_model=FundingAgencyDetailsResponse)
async def get_funding_agency_details(
    agency_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get funding agency details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            """
            SELECT id, agency_id, contact_person, designation, mobile, email,
                   sanctioned_number, scheme, cna_sub_agency,
                   bank_name, bank_account_no, created_at
            FROM funding_agency_details
            WHERE agency_id = %s
            """,
            (agency_id,)
        )
        
        details = cursor.fetchone()
        if not details:
            raise HTTPException(status_code=404, detail="Agency details not found")
        
        return FundingAgencyDetailsResponse(**details)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agency details: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.put("/{agency_id}/details", response_model=FundingAgencyDetailsResponse)
async def update_funding_agency_details(
    agency_id: int,
    details: FundingAgencyDetailsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update funding agency details"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if details exist
        cursor.execute(
            "SELECT id FROM funding_agency_details WHERE agency_id = %s",
            (agency_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=404, 
                detail="Agency details not found. Use POST to create."
            )
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if details.contact_person is not None:
            update_fields.append("contact_person = %s")
            values.append(details.contact_person)
        
        if details.designation is not None:
            update_fields.append("designation = %s")
            values.append(details.designation)
        
        if details.mobile is not None:
            update_fields.append("mobile = %s")
            values.append(details.mobile)
        
        if details.email is not None:
            update_fields.append("email = %s")
            values.append(details.email)
        
        if details.sanctioned_number is not None:
            update_fields.append("sanctioned_number = %s")
            values.append(details.sanctioned_number)
        
        if details.scheme is not None:
            update_fields.append("scheme = %s")
            values.append(details.scheme)
        
        if details.cna_sub_agency is not None:
            update_fields.append("cna_sub_agency = %s")
            values.append(details.cna_sub_agency)
        
        if details.bank_name is not None:
            update_fields.append("bank_name = %s")
            values.append(details.bank_name)
        
        if details.bank_account_no is not None:
            update_fields.append("bank_account_no = %s")
            values.append(details.bank_account_no)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(agency_id)
        
        cursor.execute(
            f"""
            UPDATE funding_agency_details
            SET {', '.join(update_fields)}
            WHERE agency_id = %s
            RETURNING id, agency_id, contact_person, designation, mobile, email,
                      sanctioned_number, scheme, cna_sub_agency,
                      bank_name, bank_account_no, created_at
            """,
            values
        )
        
        updated_details = cursor.fetchone()
        conn.commit()
        
        return FundingAgencyDetailsResponse(**updated_details)
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating agency details: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.delete("/{agency_id}/details", status_code=204)
async def delete_funding_agency_details(
    agency_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete funding agency details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id FROM funding_agency_details WHERE agency_id = %s",
            (agency_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Agency details not found")
        
        cursor.execute(
            "DELETE FROM funding_agency_details WHERE agency_id = %s",
            (agency_id,)
        )
        conn.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting agency details: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ==================== UTILITY ENDPOINTS ====================

@router.get("/search/by-name", response_model=List[FundingAgencyResponse])
async def search_agencies_by_name(
    name: str,
    current_user: dict = Depends(get_current_user)
):
    """Search funding agencies by name (case-insensitive partial match)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            """
            SELECT agency_id, name, description, created_at
            FROM funding_agencies
            WHERE LOWER(name) LIKE LOWER(%s)
            ORDER BY name
            """,
            (f"%{name}%",)
        )
        
        agencies = cursor.fetchall()
        return [FundingAgencyResponse(**agency) for agency in agencies]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching agencies: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/search/by-scheme", response_model=List[FundingAgencyFullResponse])
async def search_agencies_by_scheme(
    scheme: str,
    current_user: dict = Depends(get_current_user)
):
    """Search funding agencies by scheme"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            """
            SELECT 
                fa.agency_id, fa.name, fa.description, fa.created_at,
                fad.id, fad.agency_id, fad.contact_person, fad.designation, 
                fad.mobile, fad.email, fad.sanctioned_number, fad.scheme, 
                fad.cna_sub_agency, fad.bank_name, fad.bank_account_no, 
                fad.created_at as details_created_at
            FROM funding_agencies fa
            INNER JOIN funding_agency_details fad ON fa.agency_id = fad.agency_id
            WHERE LOWER(fad.scheme) LIKE LOWER(%s)
            ORDER BY fa.name
            """,
            (f"%{scheme}%",)
        )
        
        results = cursor.fetchall()
        agencies = []
        
        for row in results:
            agency = FundingAgencyFullResponse(
                agency_id=row['agency_id'],
                name=row['name'],
                description=row['description'],
                created_at=row['created_at'],
                details=FundingAgencyDetailsResponse(
                    id=row['id'],
                    agency_id=row['agency_id'],
                    contact_person=row['contact_person'],
                    designation=row['designation'],
                    mobile=row['mobile'],
                    email=row['email'],
                    sanctioned_number=row['sanctioned_number'],
                    scheme=row['scheme'],
                    cna_sub_agency=row['cna_sub_agency'],
                    bank_name=row['bank_name'],
                    bank_account_no=row['bank_account_no'],
                    created_at=row['details_created_at']
                )
            )
            agencies.append(agency)
        
        return agencies
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching agencies by scheme: {str(e)}")
    finally:
        cursor.close()
        conn.close()