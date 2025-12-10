# backend/app/routes/reports.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from datetime import datetime
import os
from app.services.reports_service import ReportService, PDFReportGenerator
from app.services.excel_service import ExcelReportGenerator
from app.database import get_db_connection
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# KEEP ONLY ONE - Delete the duplicate below
@router.post("/projects/{project_id}/reports/generate")
async def generate_project_report(
    project_id: int,
    report_type: str = "comprehensive",
    format: str = "pdf",
    include_financial_summary: bool = True,
    include_budget_allocation: bool = True,
    include_funds_expenditure: bool = True,
    include_category_breakdown: bool = True,
    include_detailed_transactions: bool = False,
    include_charts: bool = False
):
    """Generate project report in PDF or Excel format"""
    
    logger.info(f"=== Report Generation Started ===")
    logger.info(f"Project ID: {project_id}")
    logger.info(f"Report Type: {report_type}")
    logger.info(f"Format: {format}")
    
    conn = None
    temp_file_path = None
    
    try:
        logger.info("Getting database connection...")
        conn = get_db_connection()
        
        logger.info("Initializing report service...")
        report_service = ReportService(conn)
        
        logger.info("Fetching project data...")
        project_data = report_service.get_project_report_data(project_id)
        logger.info(f"Project data fetched: {project_data['project']['title']}")
        
        # Build include_sections dict
        include_sections = {
            'financial_summary': include_financial_summary,
            'budget_allocation': include_budget_allocation,
            'funds_expenditure': include_funds_expenditure,
            'category_breakdown': include_category_breakdown,
            'detailed_transactions': include_detailed_transactions,
            'charts': include_charts
        }
        
        if report_type == 'summary':
            include_sections['detailed_transactions'] = False
            include_sections['category_breakdown'] = False
        
        # Generate filename
        project_id_str = project_data['project']['project_id']
        date_str = datetime.now().strftime("%d%b%Y_%H%M")
        filename = f"{project_id_str}_{report_type.capitalize()}_{date_str}.{format}"
        logger.info(f"Generated filename: {filename}")
        
        # Generate report based on format
        logger.info(f"Generating {format.upper()} report...")
        if format == 'pdf':
            temp_file_path = PDFReportGenerator.generate_pdf(project_data, include_sections)
        elif format == 'excel':
            temp_file_path = ExcelReportGenerator.generate_excel(project_data, include_sections)
        else:
            raise HTTPException(status_code=400, detail="Invalid format")
        
        logger.info(f"Report generated at: {temp_file_path}")
        
        file_size = os.path.getsize(temp_file_path)
        logger.info(f"File size: {file_size} bytes")
        
        # Log report generation
        logger.info("Logging report generation to database...")
        report_service.log_report_generation(
            project_id=project_id,
            report_type=report_type,
            format=format,
            filename=filename,
            file_size=file_size,
            user_id=None,
            included_sections=include_sections
        )
        logger.info("Report logged successfully")
        
        media_type = "application/pdf" if format == 'pdf' else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        logger.info("Returning file response...")
        return FileResponse(
            path=temp_file_path,
            media_type=media_type,
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ValueError as e:
        logger.error(f"ValueError: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Exception: {str(e)}", exc_info=True)
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")
    finally:
        if conn:
            conn.close()
            logger.info("Database connection closed")


@router.get("/projects/{project_id}/reports/history")
async def get_report_history(project_id: int, limit: int = 10):
    """Get history of generated reports for a project"""
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                rl.id,
                rl.report_type,
                rl.format,
                rl.filename,
                rl.file_size,
                rl.generated_at,
                rl.generated_by
            FROM report_logs rl
            WHERE rl.project_id = %s
            ORDER BY rl.generated_at DESC
            LIMIT %s
        """, (project_id, limit))
        
        reports = []
        for row in cursor.fetchall():
            reports.append({
                'id': row[0],
                'report_type': row[1],
                'format': row[2],
                'filename': row[3],
                'file_size': row[4],
                'generated_at': row[5].isoformat() if row[5] else None,
                'generated_by': row[6] or 'System'
            })
        
        cursor.close()
        return {'reports': reports}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching report history: {str(e)}")
    finally:
        if conn:
            conn.close()