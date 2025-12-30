from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, constr
from typing import Optional, List, Annotated
from psycopg2.extensions import connection

from app.database import get_db

router = APIRouter(prefix="/funding-agencies", tags=["Funding Agencies"])


class FundingAgencyCreate(BaseModel):
    name: Annotated[str, constr(strip_whitespace=True, min_length=1)]
    address: Optional[str] = None


class FundingAgencyOut(BaseModel):
    agency_id: int
    name: str
    address: Optional[str]


@router.get("/", response_model=List[FundingAgencyOut])
def get_all_funding_agencies(conn: connection = Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT agency_id, name, address
            FROM funding_agencies
            ORDER BY name
        """)
        return cur.fetchall()


@router.post("/", response_model=FundingAgencyOut, status_code=status.HTTP_201_CREATED)
def create_funding_agency(
    agency: FundingAgencyCreate,
    conn: connection = Depends(get_db)
):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM funding_agencies WHERE LOWER(name) = LOWER(%s)",
            (agency.name,)
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Funding agency already exists")

        cur.execute(
            """
            INSERT INTO funding_agencies (name, address)
            VALUES (%s, %s)
            RETURNING agency_id, name, address
            """,
            (agency.name, agency.address)
        )
        conn.commit()
        return cur.fetchone()
