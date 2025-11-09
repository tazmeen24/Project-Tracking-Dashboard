# Project Tracking Dashboard

A full-stack _Project Management and Financial Tracking Dashboard_ built with FastAPI (Python) for the backend and React (JavaScript) for the frontend.  
It allows organizations to manage research or institutional projects - including _budget allocations, funds received, expenditures, manpower, and equipment_ - with detailed analytics and breakdowns.

# Features

# 🔹 Backend (FastAPI)

- User authentication with JWT tokens (`/token`).
- Role-based access control (Admin/User).
- PostgreSQL integration for persistent data.
- Endpoints for:
  - Project creation and tracking.
  - Budget allocation with detailed breakdowns (manpower, equipment, etc.).
  - Fund receipts and expenditure recording.
  - Dashboard statistics and analytics.
  - Technical group and funding agency management.

# 🔹 Frontend (React)

- Secure login with token-based authentication.
- Dynamic project list with filters, sorting, and status tracking.
- Interactive budget and expenditure visualization.
- Tabbed project detail view (Overview / Funds / Expenditure).
- Real-time utilization and balance computation.
- Tailwind CSS + Lucide icons + Recharts for modern UI and charts.

# Tech Stack

Layer | Technology

Backend | FastAPI, PostgreSQL, Pydantic, psycopg2, Uvicorn
Frontend | React.js, Tailwind CSS, Recharts, Lucide React
Authentication | JWT (OAuth2PasswordBearer)
Config | `.env` with python-dotenv & pydantic-settings

# Installation & Setup
# Prerequisites:

- Python 3.9+
- PostgreSQL

# Create virtual environment

python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

# Install dependencies

pip install -r requirements.txt
