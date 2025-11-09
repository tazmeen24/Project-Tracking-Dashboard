-- 1. Funding Agencies
CREATE TABLE funding_agencies (
    agency_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT
);

CREATE TABLE technical_groups (
    group_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- 2. Projects
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    project_no TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    alias TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    funding_agency_id INT REFERENCES funding_agencies (agency_id),
    technical_group_id INT REFERENCES technical_groups (group_id)
);

-- 3. Funds Received (with budget head tagging)
CREATE TABLE funds_received (
    fund_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    head TEXT CHECK (
        head IN (
            'manpower',
            'equipment',
            'consumables',
            'contingency',
            'travel & training',
            'overhead'
        )
    ) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    date_received DATE NOT NULL,
    remarks TEXT
);

-- 4. Manpower
CREATE TABLE manpower (
    manpower_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    salary_per_month NUMERIC(12, 2) NOT NULL,
    months INT NOT NULL,
    num_personnel INT NOT NULL DEFAULT 1,
    date_incurred DATE,
    total_cost NUMERIC(14, 2) GENERATED ALWAYS AS (
        salary_per_month * months * num_personnel
    ) STORED
);

-- 5. Equipment
CREATE TABLE equipment (
    equipment_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    purchase_date DATE,
    quantity INT NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(14, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- 6. Budget Expenditure
CREATE TABLE budget_expenditure (
    expenditure_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    head TEXT CHECK (
        head IN (
            'consumables',
            'contingency',
            'travel & training',
            'overhead'
        )
    ),
    amount NUMERIC(14, 2) NOT NULL,
    date_incurred DATE,
    description TEXT
);

-- 7. Budget Allocation (Planned allocations)
CREATE TABLE budget_allocation (
    allocation_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    head TEXT CHECK (
        head IN (
            'manpower',
            'equipment',
            'consumables',
            'contingency',
            'travel & training',
            'overhead'
        )
    ),
    allocated_amount NUMERIC(14, 2) NOT NULL
);

-- View for Allocation vs Funds vs Expenditure per Head
CREATE OR REPLACE VIEW project_head_summary AS
WITH
    heads AS (
        SELECT UNNEST(
                ARRAY[
                    'manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead'
                ]
            ) AS head
    )
SELECT
    p.project_id,
    p.title,
    h.head,
    COALESCE(SUM(ba.allocated_amount), 0) AS planned_allocation,
    COALESCE(SUM(fr.amount), 0) AS funds_received,
    COALESCE(
        SUM(
            CASE
                WHEN h.head = 'manpower' THEN m.total_cost
                WHEN h.head = 'equipment' THEN e.total_cost
                ELSE be.amount
            END
        ),
        0
    ) AS actual_expenditure
FROM
    projects p
    CROSS JOIN heads h
    LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
    AND ba.head = h.head
    LEFT JOIN funds_received fr ON p.project_id = fr.project_id
    AND fr.head = h.head
    LEFT JOIN manpower m ON p.project_id = m.project_id
    AND h.head = 'manpower'
    LEFT JOIN equipment e ON p.project_id = e.project_id
    AND h.head = 'equipment'
    LEFT JOIN budget_expenditure be ON p.project_id = be.project_id
    AND be.head = h.head
GROUP BY
    p.project_id,
    p.title,
    h.head
ORDER BY p.project_id, h.head;

-- Drop the simple budget_allocation table
DROP TABLE IF EXISTS budget_allocation CASCADE;

-- Create new allocation table with breakdown support
CREATE TABLE budget_allocation (
    allocation_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    head TEXT CHECK (
        head IN (
            'manpower',
            'equipment',
            'consumables',
            'contingency',
            'travel & training',
            'overhead'
        )
    ),
    allocated_amount NUMERIC(14, 2) NOT NULL
);

-- New table: Manpower Allocation Breakdown (planned at allocation time)
CREATE TABLE manpower_allocation_breakdown (
    breakdown_id SERIAL PRIMARY KEY,
    allocation_id INT REFERENCES budget_allocation (allocation_id) ON DELETE CASCADE,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    salary_per_month NUMERIC(12, 2) NOT NULL,
    months INT NOT NULL,
    num_personnel INT NOT NULL DEFAULT 1,
    total_amount NUMERIC(14, 2) GENERATED ALWAYS AS (
        salary_per_month * months * num_personnel
    ) STORED
);

--  Equipment Allocation Breakdown (planned at allocation time)
CREATE TABLE equipment_allocation_breakdown (
    breakdown_id SERIAL PRIMARY KEY,
    allocation_id INT REFERENCES budget_allocation (allocation_id) ON DELETE CASCADE,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(14, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- Add indexes
CREATE INDEX idx_manpower_alloc_breakdown_project ON manpower_allocation_breakdown (project_id);

CREATE INDEX idx_equipment_alloc_breakdown_project ON equipment_allocation_breakdown (project_id);

-- View: Compare Planned vs Actual for Manpower
CREATE OR REPLACE VIEW manpower_plan_vs_actual AS
SELECT
    p.project_id,
    p.title,
    mab.role AS planned_role,
    mab.salary_per_month AS planned_salary,
    mab.months AS planned_months,
    mab.num_personnel AS planned_personnel,
    mab.total_amount AS planned_total,
    COALESCE(SUM(m.total_cost), 0) AS actual_total,
    mab.total_amount - COALESCE(SUM(m.total_cost), 0) AS difference
FROM
    projects p
    LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
    AND ba.head = 'manpower'
    LEFT JOIN manpower_allocation_breakdown mab ON ba.allocation_id = mab.allocation_id
    LEFT JOIN manpower m ON p.project_id = m.project_id
    AND m.role = mab.role
GROUP BY
    p.project_id,
    p.title,
    mab.role,
    mab.salary_per_month,
    mab.months,
    mab.num_personnel,
    mab.total_amount;

-- View: Compare Planned vs Actual for Equipment
CREATE OR REPLACE VIEW equipment_plan_vs_actual AS
SELECT
    p.project_id,
    p.title,
    eab.item_name AS planned_item,
    eab.quantity AS planned_quantity,
    eab.unit_cost AS planned_unit_cost,
    eab.total_amount AS planned_total,
    COALESCE(SUM(e.total_cost), 0) AS actual_total,
    eab.total_amount - COALESCE(SUM(e.total_cost), 0) AS difference
FROM
    projects p
    LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
    AND ba.head = 'equipment'
    LEFT JOIN equipment_allocation_breakdown eab ON ba.allocation_id = eab.allocation_id
    LEFT JOIN equipment e ON p.project_id = e.project_id
    AND e.name = eab.item_name
GROUP BY
    p.project_id,
    p.title,
    eab.item_name,
    eab.quantity,
    eab.unit_cost,
    eab.total_amount;

-- Update the main summary view
CREATE OR REPLACE VIEW project_head_summary AS
WITH
    heads AS (
        SELECT UNNEST(
                ARRAY[
                    'manpower', 'equipment', 'consumables', 'contingency', 'travel & training', 'overhead'
                ]
            ) AS head
    )
SELECT
    p.project_id,
    p.title,
    h.head,
    COALESCE(ba.allocated_amount, 0) AS planned_allocation,
    COALESCE(SUM(fr.amount), 0) AS funds_received,
    COALESCE(
        SUM(
            CASE
                WHEN h.head = 'manpower' THEN m.total_cost
                WHEN h.head = 'equipment' THEN e.total_cost
                ELSE be.amount
            END
        ),
        0
    ) AS actual_expenditure
FROM
    projects p
    CROSS JOIN heads h
    LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
    AND ba.head = h.head
    LEFT JOIN funds_received fr ON p.project_id = fr.project_id
    AND fr.head = h.head
    LEFT JOIN manpower m ON p.project_id = m.project_id
    AND h.head = 'manpower'
    LEFT JOIN equipment e ON p.project_id = e.project_id
    AND h.head = 'equipment'
    LEFT JOIN budget_expenditure be ON p.project_id = be.project_id
    AND be.head = h.head
GROUP BY
    p.project_id,
    p.title,
    h.head,
    ba.allocated_amount
ORDER BY p.project_id, h.head;

-- FUNDS RECEIVED BREAKDOWN SUPPORT

-- Manpower Funds Breakdown (actual received funds split by role)
CREATE TABLE manpower_funds_breakdown (
    breakdown_id SERIAL PRIMARY KEY,
    fund_id INT REFERENCES funds_received (fund_id) ON DELETE CASCADE,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    salary_per_month NUMERIC(12, 2) NOT NULL,
    months INT NOT NULL,
    num_personnel INT NOT NULL DEFAULT 1,
    total_amount NUMERIC(14, 2) GENERATED ALWAYS AS (
        salary_per_month * months * num_personnel
    ) STORED
);

-- Equipment Funds Breakdown (actual received funds split by items)
CREATE TABLE equipment_funds_breakdown (
    breakdown_id SERIAL PRIMARY KEY,
    fund_id INT REFERENCES funds_received (fund_id) ON DELETE CASCADE,
    project_id INT REFERENCES projects (project_id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(14, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- Indexes for performance
CREATE INDEX idx_manpower_funds_breakdown_project ON manpower_funds_breakdown (project_id);

CREATE INDEX idx_equipment_funds_breakdown_project ON equipment_funds_breakdown (project_id);


-- VIEW: FUNDS BREAKDOWN SUMMARY

CREATE OR REPLACE VIEW funds_breakdown_summary AS
SELECT p.project_id, p.title, fr.fund_id, fr.head, SUM(
        COALESCE(
            mfb.total_amount, efb.total_amount, fr.amount
        )
    ) AS detailed_fund_amount
FROM
    projects p
    LEFT JOIN funds_received fr ON p.project_id = fr.project_id
    LEFT JOIN manpower_funds_breakdown mfb ON fr.fund_id = mfb.fund_id
    LEFT JOIN equipment_funds_breakdown efb ON fr.fund_id = efb.fund_id
GROUP BY
    p.project_id,
    p.title,
    fr.fund_id,
    fr.head;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    hashed_password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (
        role IN ('user', 'admin', 'viewer')
    ),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
