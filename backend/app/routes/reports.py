from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from datetime import datetime
import os
from app.services.reports_service import ReportService, PDFReportGenerator
from app.services.excel_service import ExcelReportGenerator
from app.database import get_db_connection
import logging
from app.models.reports_models import ReportGenerationRequest

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/projects/{project_id}/reports/generate")
async def generate_project_report(
    project_id: int,
    request: ReportGenerationRequest  # Changed from individual parameters
):
    """Generate project report in PDF or Excel format"""
    
    logger.info(f"=== Report Generation Started ===")
    logger.info(f"Project ID: {project_id}")
    logger.info(f"Report Type: {request.reportType}")
    logger.info(f"Format: {request.format}")
    logger.info(f"Include Sections: {request.includeSections}")
    
    conn = None
    temp_file_path = None
    
    try:
        conn = get_db_connection()
        report_service = ReportService(conn)
        project_data = report_service.get_project_report_data(project_id)
        
        # Get sections from request
        include_sections = request.includeSections
        
        # CRITICAL: Override sections for summary reports
        if request.reportType == 'summary':
            logger.info("Summary report - forcing minimal sections")
            include_sections = {
                'financial_summary': True,
                'budget_allocation': False,
                'funds_expenditure': False,
                'category_breakdown': False,
                'detailed_transactions': False,
                'charts': False
            }
        else:
            # For comprehensive, ensure at least something is selected
            if not any(include_sections.values()):
                logger.info("No sections selected - enabling defaults")
                include_sections = {
                    'financial_summary': True,
                    'budget_allocation': True,
                    'funds_expenditure': True,
                    'category_breakdown': True,
                    'detailed_transactions': False,
                    'charts': False
                }
        
        logger.info(f"Final sections: {include_sections}")
        
        # Generate filename
        project_no = project_data['project'].get('project_no', f"PROJECT_{project_id}")
        project_no_clean = ''.join(c if c.isalnum() or c in ('-', '_') else '_' for c in str(project_no))
        
        file_format = request.format.lower()
        if file_format in ['excel', 'xlsx']:
            file_format = 'xlsx'
        
        date_str = datetime.now().strftime("%d%b%Y_%H%M")
        filename = f"{project_no_clean}_{request.reportType.capitalize()}_{date_str}.{file_format}"
        
        # Generate report
        if file_format == 'pdf':
            temp_file_path = PDFReportGenerator.generate_pdf(project_data, include_sections)
            media_type = "application/pdf"
        elif file_format == 'xlsx':
            temp_file_path = ExcelReportGenerator.generate_excel(project_data, include_sections)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:
            raise HTTPException(status_code=400, detail=f"Invalid format: {request.format}")
        
        file_size = os.path.getsize(temp_file_path)
        
        # Log report generation
        report_service.log_report_generation(
            project_id=project_id,
            report_type=request.reportType,
            format=file_format,
            filename=filename,
            file_size=file_size,
            user_id=None,
            included_sections=include_sections
        )
        
        return FileResponse(
            path=temp_file_path,
            media_type=media_type,
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
        
    except ValueError as e:
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