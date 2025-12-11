# backend/app/routes/agency_details.py

from fastapi import APIRouter, HTTPException, Query, status, Body
from typing import Optional
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
import json

from ..database import get_db_connection, validate_foreign_key
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/funding-agencies", tags=["Funding Agencies"])

# ==================== PYDANTIC MODELS ====================

class FundingAgencyCreate(BaseModel):
    name: str
    address: Optional[str] = None

class FundingAgencyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None

class AgencyDetailsCreate(BaseModel):
    contact_person: str
    designation: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    sanctioned_number: Optional[str] = None
    scheme: Optional[str] = None
    cna_sub_agency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None

class AgencyDetailsUpdate(BaseModel):
    contact_person: Optional[str] = None
    designation: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    sanctioned_number: Optional[str] = None
    scheme: Optional[str] = None
    cna_sub_agency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None

# ==================== CREATE ====================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_funding_agency(agency: FundingAgencyCreate):
    """Create a new funding agency"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO funding_agencies (name, address) VALUES (%s, %s) RETURNING *",
                (agency.name, agency.address)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        if "unique" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                              detail="Agency with this name already exists")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


# ==================== READ ====================

@router.get("", status_code=status.HTTP_200_OK)
async def get_all_funding_agencies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None)
):
    """Get all funding agencies with pagination"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            where_clause = ""
            params = []
            
            if search:
                where_clause = "WHERE name ILIKE %s"
                params.append(f"%{search}%")
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM funding_agencies {where_clause}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()['total']
            
            # Get results
            query = f"SELECT agency_id, name as agency_name, address FROM funding_agencies {where_clause} ORDER BY name LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            cur.execute(query, params)
            agencies = [dict(row) for row in cur.fetchall()]
            
            return {
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "data": json.loads(json.dumps(agencies, cls=DecimalEncoder))
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/{agency_id}", status_code=status.HTTP_200_OK)
async def get_funding_agency(agency_id: int):
    """Get a specific funding agency with details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agencies WHERE agency_id = %s", (agency_id,))
            agency = cur.fetchone()
            
            if not agency:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                  detail="Funding agency not found")
            
            response = dict(agency)
            
            # Get details if exists
            cur.execute("SELECT * FROM funding_agency_details WHERE agency_id = %s", (agency_id,))
            details = cur.fetchone()
            response['details'] = dict(details) if details else None
            
            return json.loads(json.dumps(response, cls=DecimalEncoder))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== UPDATE ====================

@router.put("/{agency_id}", status_code=status.HTTP_200_OK)
async def update_funding_agency(
    agency_id: int,
    agency: FundingAgencyUpdate
):
    """Update funding agency"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agencies WHERE agency_id = %s", (agency_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                  detail="Funding agency not found")
            
            update_fields = []
            values = []
            
            if agency.name is not None:
                update_fields.append("name = %s")
                values.append(agency.name)
            if agency.address is not None:
                update_fields.append("address = %s")
                values.append(agency.address)
            
            if not update_fields:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                  detail="No fields to update")
            
            values.append(agency_id)
            query = f"UPDATE funding_agencies SET {', '.join(update_fields)} WHERE agency_id = %s RETURNING *"
            
            cur.execute(query, values)
            result = cur.fetchone()
            conn.commit()
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


# ==================== DELETE ====================

@router.delete("/{agency_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funding_agency(agency_id: int):
    """Delete funding agency (CASCADE deletes details and projects)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agencies WHERE agency_id = %s", (agency_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                  detail="Funding agency not found")
            
            cur.execute("DELETE FROM funding_agencies WHERE agency_id = %s", (agency_id,))
            conn.commit()
            return None
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== AGENCY DETAILS ====================

@router.post("/{agency_id}/details", status_code=status.HTTP_201_CREATED)
async def create_funding_agency_details(
    agency_id: int,
    details: AgencyDetailsCreate
):
    """Create agency details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            validate_foreign_key("funding_agencies", "agency_id", agency_id, conn)
            
            cur.execute("SELECT * FROM funding_agency_details WHERE agency_id = %s", (agency_id,))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                  detail="Details already exist. Use PUT to update.")
            
            cur.execute(
                """INSERT INTO funding_agency_details 
                   (agency_id, contact_person, designation, mobile, email,
                    sanctioned_number, scheme, cna_sub_agency, bank_name, bank_account_no)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (agency_id, details.contact_person, details.designation, details.mobile, details.email,
                 details.sanctioned_number, details.scheme, details.cna_sub_agency, 
                 details.bank_name, details.bank_account_no)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


@router.get("/{agency_id}/details", status_code=status.HTTP_200_OK)
async def get_funding_agency_details(agency_id: int):
    """Get agency details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agency_details WHERE agency_id = %s", (agency_id,))
            details = cur.fetchone()
            
            if not details:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                  detail="Agency details not found")
            
            return json.loads(json.dumps(dict(details), cls=DecimalEncoder))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.put("/{agency_id}/details", status_code=status.HTTP_200_OK)
async def update_funding_agency_details(
    agency_id: int,
    details: AgencyDetailsUpdate
):
    """Update agency details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM funding_agency_details WHERE agency_id = %s", (agency_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                  detail="Details not found. Use POST to create.")
            
            update_fields = []
            values = []
            
            for field, value in [
                ("contact_person", details.contact_person),
                ("designation", details.designation),
                ("mobile", details.mobile),
                ("email", details.email),
                ("sanctioned_number", details.sanctioned_number),
                ("scheme", details.scheme),
                ("cna_sub_agency", details.cna_sub_agency),
                ("bank_name", details.bank_name),
                ("bank_account_no", details.bank_account_no)
            ]:
                if value is not None:
                    update_fields.append(f"{field} = %s")
                    values.append(value)
            
            if not update_fields:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                  detail="No fields to update")
            
            values.append(agency_id)
            query = f"UPDATE funding_agency_details SET {', '.join(update_fields)} WHERE agency_id = %s RETURNING *"
            
            cur.execute(query, values)
            result = cur.fetchone()
            conn.commit()
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        conn.close()


@router.delete("/{agency_id}/details", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funding_agency_details(agency_id: int):
    """Delete agency details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM funding_agency_details WHERE agency_id = %s RETURNING *", (agency_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                  detail="Agency details not found")
            conn.commit()
            return None
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()