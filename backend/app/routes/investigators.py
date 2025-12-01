# backend/app/routes/investigators.py

from fastapi import APIRouter, HTTPException, status
from psycopg2.extras import RealDictCursor
from typing import Optional
import json

from ..database import get_db_connection, validate_foreign_key
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/investigators", tags=["Investigators"])

# ==================== CREATE ====================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_investigator(
    project_id: int,
    principal_investigator: str,
    pi_email: str,
    pi_mobile: str,
    co_investigator: Optional[str] = None,
    co_email: Optional[str] = None,
    co_mobile: Optional[str] = None
):
    """Create investigator details for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Validate project exists
            validate_foreign_key("projects", "project_id", project_id, conn)
            
            # Check if investigator already exists for this project
            cur.execute(
                "SELECT id FROM investigators WHERE project_id = %s", 
                (project_id,)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Investigators already exist for this project. Use PUT to update."
                )
            
            cur.execute(
                """INSERT INTO investigators 
                   (project_id, principal_investigator, pi_email, pi_mobile, 
                    co_investigator, co_email, co_mobile)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) 
                   RETURNING *""",
                (project_id, principal_investigator, pi_email, pi_mobile,
                 co_investigator, co_email, co_mobile)
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


# ==================== READ ====================

@router.get("/project/{project_id}", status_code=status.HTTP_200_OK)
async def get_project_investigators(project_id: int):
    """Get investigator details for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM investigators WHERE project_id = %s", 
                (project_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Investigators not found for this project"
                )
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.get("/{investigator_id}", status_code=status.HTTP_200_OK)
async def get_investigator(investigator_id: int):
    """Get investigator details by ID"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM investigators WHERE id = %s", 
                (investigator_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Investigator not found"
                )
            
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


# ==================== UPDATE ====================

@router.put("/{investigator_id}", status_code=status.HTTP_200_OK)
async def update_investigator(
    investigator_id: int,
    principal_investigator: Optional[str] = None,
    pi_email: Optional[str] = None,
    pi_mobile: Optional[str] = None,
    co_investigator: Optional[str] = None,
    co_email: Optional[str] = None,
    co_mobile: Optional[str] = None
):
    """Update investigator details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if investigator exists
            cur.execute(
                "SELECT id FROM investigators WHERE id = %s",
                (investigator_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Investigator not found"
                )
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if principal_investigator is not None:
                update_fields.append("principal_investigator = %s")
                values.append(principal_investigator)
            if pi_email is not None:
                update_fields.append("pi_email = %s")
                values.append(pi_email)
            if pi_mobile is not None:
                update_fields.append("pi_mobile = %s")
                values.append(pi_mobile)
            if co_investigator is not None:
                update_fields.append("co_investigator = %s")
                values.append(co_investigator)
            if co_email is not None:
                update_fields.append("co_email = %s")
                values.append(co_email)
            if co_mobile is not None:
                update_fields.append("co_mobile = %s")
                values.append(co_mobile)
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            values.append(investigator_id)
            query = f"""UPDATE investigators 
                       SET {', '.join(update_fields)} 
                       WHERE id = %s 
                       RETURNING *"""
            
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

@router.delete("/{investigator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investigator(investigator_id: int):
    """Delete investigator record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "DELETE FROM investigators WHERE id = %s RETURNING *", 
                (investigator_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Investigator not found"
                )
            
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