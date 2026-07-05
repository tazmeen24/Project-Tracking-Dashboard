# Project Tracking Dashboard

A full-stack **Project Management and Financial Tracking Dashboard** built with **FastAPI (Python)** for the backend and **React.js** for the frontend.

The application allows organizations to manage research or institutional projects, including **budget allocations, funds received, expenditures, manpower, and equipment**, while providing detailed financial analytics and reporting.

---

# Features

## Backend (FastAPI)

- User authentication using JWT tokens (`/token`)
- Role-based access control (Admin/User)
- PostgreSQL integration for persistent storage
- REST API endpoints for:
  - Project creation and management
  - Budget allocation with category-wise breakdowns (manpower, equipment, etc.)
  - Fund receipt and expenditure tracking
  - Dashboard statistics and analytics
  - Technical Group and Funding Agency management
  - Report generation

---

## Frontend (React)

- Secure login using JWT authentication
- Dynamic project list with filtering, sorting, and status tracking
- Interactive budget and expenditure visualizations
- Tabbed project details (Overview / Funds / Expenditure)
- Real-time utilization and balance calculations
- Modern UI built with Tailwind CSS, Lucide React icons, and Recharts

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Backend | FastAPI, PostgreSQL, Pydantic, psycopg2, Uvicorn |
| Frontend | React.js, Tailwind CSS, Recharts, Lucide React |
| Authentication | JWT (OAuth2PasswordBearer) |
| Configuration | `.env`, python-dotenv, pydantic-settings |

---

# Installation

## Clone the repository

```bash
git clone <repository-url>
cd project-dashboard
```

## Create a virtual environment

```bash
python -m venv venv
```

### Activate the virtual environment

**Linux/macOS**

```bash
source venv/bin/activate
```

**Windows (Command Prompt)**

```cmd
venv\Scripts\activate
```

**Windows (PowerShell)**

```powershell
venv\Scripts\Activate.ps1
```

## Install backend dependencies

```bash
pip install -r requirements.txt
```

## Install frontend dependencies

```bash
cd frontend
npm install
```

---

# Running the Application

## Start the Backend

From the **backend** directory:

```bash
uvicorn app.main:app --reload
```

The backend will start at:

```
http://127.0.0.1:8000
```

API documentation:

```
http://127.0.0.1:8000/docs
```

---

## Start the Frontend

From the **frontend** directory:

```bash
npm start
```

(or replace with your actual start script, e.g. `npm start` if applicable.)

The frontend will typically run at:

```
http://localhost:3000
```

---

# Project Structure

```text
project-dashboard/
├── .env
├── .gitignore
├── README.md
├── render.yaml
│
├── backend/
│   ├── .env
│   ├── financial_queries.py
│   ├── fix_cursors.py
│   ├── Procfile
│   ├── project_tracking.db
│   ├── schema.sql
│   ├── requirements.txt
│   └── app/
│       ├── auth.py
│       ├── build_backend.py
│       ├── config.py
│       ├── database.py
│       ├── main.py
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
│
└── frontend/
    ├── package.json
    ├── public/
    └── src/
        ├── components/
        ├── contexts/
        ├── hooks/
        ├── pages/
        ├── services/
        └── utils/
```

---

# API Features

- Authentication
- Project Management
- Budget Allocation
- Fund Management
- Expenditure Tracking
- Dashboard Analytics
- Financial Summary
- Report Generation
- Technical Group Management
- Funding Agency Management

---

# Frontend Features

- Authentication
- Dashboard Overview
- Project Management
- Financial Summary
- Analytics Dashboard
- Report Generation
- Installment Tracking
- Utilization Certificate (UC) Management

---

# Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

# Future Improvements

- Email notifications
- Audit logs
- Advanced analytics
- Export reports in multiple formats
- Docker support
- CI/CD pipeline
- Unit and integration tests

---

# License

This project is intended for educational and institutional use.