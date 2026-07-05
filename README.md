# Project Tracking Dashboard

A full-stack _Project Management and Financial Tracking Dashboard_ built with FastAPI (Python) for the backend and React (JavaScript) for the frontend.  
It allows organizations to manage research or institutional projects - including _budget allocations, funds received, expenditures, manpower, and equipment_ - with detailed analytics and breakdowns.

# Features

#  Backend (FastAPI)

- User authentication with JWT tokens (`/token`).
- Role-based access control (Admin/User).
- PostgreSQL integration for persistent data.
- Endpoints for:
  - Project creation and tracking.
  - Budget allocation with detailed breakdowns (manpower, equipment, etc.).
  - Fund receipts and expenditure recording.
  - Dashboard statistics and analytics.
  - Technical group and funding agency management.

#  Frontend (React)

- Secure login with token-based authentication.
- Dynamic project list with filters, sorting, and status tracking.
- Interactive budget and expenditure visualization.
- Tabbed project detail view (Overview / Funds / Expenditure).
- Real-time utilization and balance computation.
- Tailwind CSS + Lucide icons + Recharts for modern UI and charts.

# Tech Stack

Layer | Technology

|Backend | FastAPI, PostgreSQL, Pydantic, psycopg2, Uvicorn
|Frontend | React.js, Tailwind CSS, Recharts, Lucide React
|Authentication | JWT (OAuth2PasswordBearer)
|Config | `.env` with python-dotenv & pydantic-settings


python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

# Install dependencies

pip install -r requirements.txt

# Project Structure

project dashboard/
├── .env
├── .gitignore
├── README.md
├── render.yaml                      # Render deployment config
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── financial_queries.py
│   ├── fix_cursors.py
│   ├── Procfile                     # Render/Heroku process file
│   ├── project_tracking.db          # ⚠ SQLite file — see flag below
│   ├── project_tracking.db.backup   # 0 bytes, empty
│   ├── requirements.txt
│   ├── schema.sql
│   ├── venv/
│   ├── __pycache__/
│   └── app/
│       ├── .gitignore
│       ├── auth.py                  # get_current_user dependency
│       ├── build_backend.py         # Likely builds backend-dist/*.exe via PyInstaller
│       ├── config.py
│       ├── database.py              # psycopg2 connection management
│       ├── main.py                  # FastAPI entrypoint, CORS, router registration
│       ├── init.py                  # ⚠ see flag below — may be __init__.py
│       ├── backend-dist/
│       │   └── finance-backend.exe  # Compiled Windows executable (20.9 MB)
│       ├── models/
│       │   ├── analytics_models.py
│       │   ├── auth.py
│       │   ├── budget.py
│       │   ├── expenditure.py
│       │   ├── financial_summary_models.py
│       │   ├── fundingAgencies.py
│       │   ├── funding_agency_details.py
│       │   ├── installment.py
│       │   ├── project.py
│       │   ├── reports_models.py
│       │   ├── technicalGroups.py
│       │   └── init.py
│       ├── routes/
│       │   ├── agency_details.py
│       │   ├── analytics.py
│       │   ├── auth.py
│       │   ├── budget.py
│       │   ├── dashboard.py
│       │   ├── equipment.py
│       │   ├── expenditure.py
│       │   ├── financial_summary.py
│       │   ├── financial_summary_excel_generator.py
│       │   ├── funding_agency.py
│       │   ├── funds.py
│       │   ├── installment_routes.py
│       │   ├── investigators.py
│       │   ├── lookups.py
│       │   ├── manpower.py
│       │   ├── projects.py
│       │   ├── reports.py
│       │   ├── technical_groups.py
│       │   ├── uc_routes.py
│       │   └── init.py
│       ├── services/
│       │   ├── analytics_service.py
│       │   ├── auth_service.py
│       │   ├── dashboard_service.py
│       │   ├── excel_service.py
│       │   ├── expenditure_service.py
│       │   ├── financial_summary_service.py
│       │   ├── funds_service.py
│       │   ├── project_service.py
│       │   ├── reports_service.py     # 75KB — largest file in the codebase
│       │   ├── uc_generator_docx.py
│       │   ├── uc_generator_pdf.py
│       │   ├── uc_service.py
│       │   └── init.py
│       └── utils/
│           ├── json_encoder.py        # DecimalEncoder
│           ├── validators.py
│           └── init.py
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── node_modules/
    ├── public/
    │   ├── electron.js               # Electron main process
    │   ├── preload.js                # Electron preload script
    │   ├── index.html
    │   ├── manifest.json
    │   ├── favicon.ico
    │   ├── icon.png
    │   └── robots.txt
    └── src/
        ├── App.js
        ├── App.css
        ├── App.test.js
        ├── config.js
        ├── index.js
        ├── index.css
        ├── reportWebVitals.js
        ├── setupTests.js
        ├── logo.svg
        ├── components/
        │   ├── analytics/            # BurnRateAnalysis, CashFlowChart, FYComparison,
        ├── components/
        │   ├── analytics/
        │   │   ├── BurnRateAnalysis.js
        │   │   ├── CashFlowChart.js
        │   │   ├── CategoryDistributionChart.js
        │   │   ├── ExportButton.js
        │   │   ├── FYComparison.js
        │   │   ├── KPICards.js
        │   │   ├── PortfolioHealthCard.js
        │   │   ├── ProjectsAtRiskTable.js
        │   │   └── VarianceAnalysis.js
        │   ├── common/
        │   │   ├── AddFundingAgencyModal.js
        │   │   ├── AddTechnicalGroupModal.js
        │   │   ├── Button.js
        │   │   ├── Card.js
        │   │   ├── ConfirmDialog.js
        │   │   ├── DropdownMenu.js
        │   │   ├── Input.js
        │   │   ├── Modal.js
        │   │   ├── PrivateRoute.js
        │   │   └── Sidebar.js
        │   ├── finances/
        │   │   ├── BudgetHeadSection.js
        │   │   ├── DeleteConfirmationModal.js
        │   │   ├── ExpendituresTable.js
        │   │   ├── financialSummaryCards.js
        │   │   ├── FundsTable.js
        │   │   └── LoadingSkeleton.js
        │   ├── FinancialSummary/
        │   │   ├── ByProjectTable.js
        │   │   └── OtherTables.js
        │   ├── layout/
        │   │   └── Layout.js
        │   ├── Login_files/          # ⚠ NOT source code — see flag below
        │   │   └── [82 files: .js.download, .css, .svg, saved_resource.html, ...]
        │   ├── projects/
        │   │   ├── ProjectCard.js
        │   │   └── ProjectDetails.js
        │   └── reports/
        │       ├── ReportGenerationModal.js
        │       └── UCReportCard.js
        ├── contexts/
        │   ├── AuthContext.js
        │   ├── ProjectContext.js
        │   └── ThemeContext.js
        ├── hooks/
        │   └── useApi.js
        ├── pages/
        │   ├── AddEditProjectPage.js
        │   ├── AnalyticsPage.js
        │   ├── Dashboard.js
        │   ├── FinancialSummaryPage.js
        │   ├── InstallmentForm.js
        │   ├── InstallmentsList.js
        │   ├── LoginPage.js
        │   ├── ProjectDetailsFullPage.js
        │   ├── ProjectFinancialsPage.js
        │   ├── ProjectReportPage.js
        │   ├── ProjectsPage.js
        │   ├── ProjectUCsPage.js
        │   ├── ReportsPage.js
        │   ├── UCCreatePage.js
        │   └── UCManagementPage.js
        ├── services/
        │   ├── analyticsService.js
        │   ├── api.js
        │   ├── authService.js
        │   ├── expenditureService.js
        │   ├── financeService.js
        │   ├── financialSummaryService.js
        │   ├── fundsService.js
        │   ├── installmentService.js
        │   ├── projectService.js
        │   ├── reportService.js
        │   └── ucService.js
        └── utils/
            └── helpers.js