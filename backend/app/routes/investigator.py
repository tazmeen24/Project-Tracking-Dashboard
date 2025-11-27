# backend/app/routes/investigators.py
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor
import json

from ..database import get_db_connection, validate_foreign_key
from ..models.project import InvestigatorCreate, InvestigatorUpdate, InvestigatorResponse
from ..utils.json_encoder import DecimalEncoder

router = APIRouter(prefix="/investigators", tags=["Investigators"])

@router.post("", response_model=dict)
async def create_investigator(investigator: InvestigatorCreate):
    """Create investigator details for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Validate project exists
            validate_foreign_key("projects", "project_id", investigator.project_id, conn)
            
            # Check if investigator already exists for this project
            cur.execute("SELECT id FROM investigators WHERE project_id = %s", (investigator.project_id,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Investigators already exist for this project. Use update endpoint.")
            
            cur.execute(
                """INSERT INTO investigators 
                   (project_id, principal_investigator, pi_email, pi_mobile, 
                    co_investigator, co_email, co_mobile)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) 
                   RETURNING *""",
                (investigator.project_id, investigator.principal_investigator, 
                 investigator.pi_email, investigator.pi_mobile,
                 investigator.co_investigator, investigator.co_email, investigator.co_mobile)
            )
            result = cur.fetchone()
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.get("/project/{project_id}", response_model=dict)
async def get_project_investigators(project_id: int):
    """Get investigator details for a project"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM investigators WHERE project_id = %s", (project_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Investigators not found for this project")
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/{investigator_id}", response_model=dict)
async def get_investigator(investigator_id: int):
    """Get investigator details by ID"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM investigators WHERE id = %s", (investigator_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Investigator not found")
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@router.put("/{investigator_id}", response_model=dict)
async def update_investigator(investigator_id: int, investigator: InvestigatorUpdate):
    """Update investigator details"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            update_fields, values = [], []
            
            if investigator.principal_investigator is not None:
                update_fields.append("principal_investigator = %s")
                values.append(investigator.principal_investigator)
            if investigator.pi_email is not None:
                update_fields.append("pi_email = %s")
                values.append(investigator.pi_email)
            if investigator.pi_mobile is not None:
                update_fields.append("pi_mobile = %s")
                values.append(investigator.pi_mobile)
            if investigator.co_investigator is not None:
                update_fields.append("co_investigator = %s")
                values.append(investigator.co_investigator)
            if investigator.co_email is not None:
                update_fields.append("co_email = %s")
                values.append(investigator.co_email)
            if investigator.co_mobile is not None:
                update_fields.append("co_mobile = %s")
                values.append(investigator.co_mobile)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            values.append(investigator_id)
            query = f"UPDATE investigators SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
            cur.execute(query, values)
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Investigator not found")
            
            conn.commit()
            return json.loads(json.dumps(dict(result), cls=DecimalEncoder))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.delete("/{investigator_id}")
async def delete_investigator(investigator_id: int):
    """Delete investigator record"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM investigators WHERE id = %s RETURNING *", (investigator_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Investigator not found")
            conn.commit()
            return {"message": "Investigator deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()