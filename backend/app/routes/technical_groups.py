from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
from psycopg2.extras import RealDictCursor

from app.database import get_db

router = APIRouter(prefix="/technical-groups", tags=["Technical Groups"])


class TechnicalGroupCreate(BaseModel):
    name: str = Field(min_length=1)


class TechnicalGroupOut(BaseModel):
    group_id: int
    name: str


@router.get("/", response_model=List[TechnicalGroupOut])
def get_all_technical_groups(conn = Depends(get_db)):
    try:
        # IMPORTANT: Use RealDictCursor here
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT group_id, name
                FROM technical_groups
                ORDER BY name
            """)
            results = cur.fetchall()
            return results
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.post("/", response_model=TechnicalGroupOut, status_code=status.HTTP_201_CREATED)
def create_technical_group(
    group: TechnicalGroupCreate,
    conn = Depends(get_db)
):
    try:
        # Use RealDictCursor here too
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if group already exists
            cur.execute(
                "SELECT 1 FROM technical_groups WHERE LOWER(name) = LOWER(%s)",
                (group.name,)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Technical group already exists"
                )

            # Insert new group
            cur.execute(
                """
                INSERT INTO technical_groups (name)
                VALUES (%s)
                RETURNING group_id, name
                """,
                (group.name,)
            )
            result = cur.fetchone()
            conn.commit()
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )