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

ALTER TABLE projects
ADD principal_investigator VARCHAR(255),
ADD co_pi VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_projects_pi ON projects(principal_investigator);
CREATE INDEX IF NOT EXISTS idx_projects_co_pi ON projects(co_pi);

CREATE TABLE funding_agency_details (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    agency_id INT NOT NULL REFERENCES funding_agencies(agency_id) ON DELETE CASCADE,

    contact_person VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),

    sanctioned_number VARCHAR(200),
    scheme VARCHAR(255),
    cna_sub_agency VARCHAR(255),

    bank_name VARCHAR(255),
    bank_account_no VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id)
);

-- Drop principal_investigator and co_pi columns from projects table
ALTER TABLE projects 
DROP COLUMN IF EXISTS principal_investigator,
DROP COLUMN IF EXISTS co_pi;

CREATE TABLE funding_agency_details (
    id SERIAL PRIMARY KEY,
    agency_id INT NOT NULL REFERENCES funding_agencies(agency_id) ON DELETE CASCADE,

    contact_person VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),

    sanctioned_number VARCHAR(200),
    scheme VARCHAR(255),
    cna_sub_agency VARCHAR(255),

    bank_name VARCHAR(255),
    bank_account_no VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE projects
ADD COLUMN project_category VARCHAR(50),
ADD COLUMN project_type VARCHAR(50);

ALTER TABLE projects
ALTER COLUMN project_category SET NOT NULL,
ALTER COLUMN project_type SET NOT NULL;

ALTER TABLE projects
ADD CONSTRAINT chk_project_category_valid
    CHECK (project_category IN ('sponsored', 'non-sponsored')),

ADD CONSTRAINT chk_project_type_valid
    CHECK (project_type IN ('PFMS', 'NON-PFMS', 'contract-research'));

ALTER TABLE projects
ADD CONSTRAINT chk_project_category_type_relation
CHECK (
       (project_category = 'sponsored' AND project_type IN ('PFMS', 'NON-PFMS'))
    OR (project_category = 'non-sponsored' AND project_type = 'contract-research')
);

ALTER TABLE projects
ADD COLUMN PFMS_id TEXT;


ALTER TABLE projects
ADD CONSTRAINT chk_PFMS_requires_identifier
CHECK (
    NOT (project_category = 'sponsored' AND project_type = 'PFMS') 
    OR PFMS_id IS NOT NULL
);

ALTER TABLE manpower_allocation_breakdown
ADD COLUMN qualification TEXT,
ADD COLUMN experience_required TEXT;

ALTER TABLE equipment_allocation_breakdown
ADD COLUMN description TEXT,
ADD COLUMN product_website TEXT;

-- ============================================================================
-- STEP 1: DROP ALL VIEWS (to avoid data type conflicts)
-- ============================================================================

DROP VIEW IF EXISTS vw_financial_summary_grand_totals CASCADE;
DROP VIEW IF EXISTS vw_financial_summary_by_funding_agency CASCADE;
DROP VIEW IF EXISTS vw_financial_summary_by_technical_group CASCADE;
DROP VIEW IF EXISTS vw_financial_summary_by_budget_head CASCADE;
DROP VIEW IF EXISTS vw_financial_summary_project_totals CASCADE;
DROP VIEW IF EXISTS vw_financial_summary_by_project CASCADE;

-- Keep your existing view (don't drop it)
-- DROP VIEW IF EXISTS project_head_summary CASCADE;

-- ============================================================================
-- STEP 2: CREATE VIEWS (with correct data types)
-- ============================================================================

CREATE OR REPLACE VIEW vw_financial_summary_by_project AS
WITH project_budgets AS (
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        tg.name as technical_group,
        fa.name as funding_agency,
        ba.head,
        ba.allocated_amount::NUMERIC(14,2) as approved_budget
    FROM projects p
    LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
    LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
    INNER JOIN budget_allocation ba ON p.project_id = ba.project_id
),
funds_by_head AS (
    SELECT 
        project_id,
        head,
        SUM(amount)::NUMERIC(14,2) as funds_received
    FROM funds_received
    GROUP BY project_id, head
),
expenditure_by_head AS (
    SELECT 
        project_id,
        'manpower' as head,
        SUM(total_cost)::NUMERIC(14,2) as expenditure
    FROM manpower
    GROUP BY project_id
    
    UNION ALL
    
    SELECT 
        project_id,
        'equipment' as head,
        SUM(total_cost)::NUMERIC(14,2) as expenditure
    FROM equipment
    GROUP BY project_id
    
    UNION ALL
    
    SELECT 
        project_id,
        head,
        SUM(amount)::NUMERIC(14,2) as expenditure
    FROM budget_expenditure
    GROUP BY project_id, head
)
SELECT 
    pb.project_id,
    pb.project_no,
    pb.title,
    pb.technical_group,
    pb.funding_agency,
    pb.head as budget_head,
    pb.approved_budget,
    COALESCE(fh.funds_received, 0::NUMERIC(14,2)) as funds_received,
    COALESCE(eh.expenditure, 0::NUMERIC(14,2)) as expenditure,
    (pb.approved_budget - COALESCE(eh.expenditure, 0))::NUMERIC(14,2) as budget_balance,
    (COALESCE(fh.funds_received, 0) - COALESCE(eh.expenditure, 0))::NUMERIC(14,2) as funds_balance,
    CASE 
        WHEN pb.approved_budget > 0 
        THEN (COALESCE(eh.expenditure, 0) / pb.approved_budget * 100)
        ELSE 0 
    END::NUMERIC(14,2) as utilization_percentage
FROM project_budgets pb
LEFT JOIN funds_by_head fh ON pb.project_id = fh.project_id AND pb.head = fh.head
LEFT JOIN expenditure_by_head eh ON pb.project_id = eh.project_id AND pb.head = eh.head
ORDER BY pb.project_no, pb.head;


CREATE OR REPLACE VIEW vw_financial_summary_project_totals AS
SELECT 
    project_id,
    project_no,
    title,
    technical_group,
    funding_agency,
    SUM(approved_budget)::NUMERIC(14,2) as total_approved_budget,
    SUM(funds_received)::NUMERIC(14,2) as total_funds_received,
    SUM(expenditure)::NUMERIC(14,2) as total_expenditure,
    SUM(budget_balance)::NUMERIC(14,2) as total_budget_balance,
    SUM(funds_balance)::NUMERIC(14,2) as total_funds_balance,
    CASE 
        WHEN SUM(approved_budget) > 0 
        THEN (SUM(expenditure) / SUM(approved_budget) * 100)
        ELSE 0 
    END::NUMERIC(14,2) as overall_utilization_percentage
FROM vw_financial_summary_by_project
GROUP BY project_id, project_no, title, technical_group, funding_agency
ORDER BY project_no;


CREATE OR REPLACE VIEW vw_financial_summary_by_budget_head AS
SELECT 
    budget_head,
    COUNT(DISTINCT project_id) as project_count,
    SUM(approved_budget)::NUMERIC(14,2) as total_approved,
    SUM(funds_received)::NUMERIC(14,2) as total_funds_received,
    SUM(expenditure)::NUMERIC(14,2) as total_expenditure,
    SUM(budget_balance)::NUMERIC(14,2) as budget_balance,
    SUM(funds_balance)::NUMERIC(14,2) as funds_balance,
    CASE 
        WHEN SUM(approved_budget) > 0 
        THEN (SUM(expenditure) / SUM(approved_budget) * 100)
        ELSE 0 
    END::NUMERIC(14,2) as utilization_percentage
FROM vw_financial_summary_by_project
GROUP BY budget_head
ORDER BY budget_head;


CREATE OR REPLACE VIEW vw_financial_summary_by_technical_group AS
SELECT 
    COALESCE(technical_group, 'Unassigned') as group_name,
    COUNT(DISTINCT project_id) as project_count,
    SUM(total_approved_budget)::NUMERIC(14,2) as total_approved,
    SUM(total_funds_received)::NUMERIC(14,2) as total_funds_received,
    SUM(total_expenditure)::NUMERIC(14,2) as total_expenditure,
    SUM(total_budget_balance)::NUMERIC(14,2) as budget_balance,
    SUM(total_funds_balance)::NUMERIC(14,2) as funds_balance,
    CASE 
        WHEN SUM(total_approved_budget) > 0 
        THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
        ELSE 0 
    END::NUMERIC(14,2) as utilization_percentage
FROM vw_financial_summary_project_totals
GROUP BY technical_group
ORDER BY group_name;


CREATE OR REPLACE VIEW vw_financial_summary_by_funding_agency AS
SELECT 
    COALESCE(funding_agency, 'Unassigned') as agency_name,
    COUNT(DISTINCT project_id) as project_count,
    SUM(total_approved_budget)::NUMERIC(14,2) as total_approved,
    SUM(total_funds_received)::NUMERIC(14,2) as total_funds_received,
    SUM(total_expenditure)::NUMERIC(14,2) as total_expenditure,
    SUM(total_budget_balance)::NUMERIC(14,2) as budget_balance,
    SUM(total_funds_balance)::NUMERIC(14,2) as funds_balance,
    CASE 
        WHEN SUM(total_approved_budget) > 0 
        THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
        ELSE 0 
    END::NUMERIC(14,2) as utilization_percentage
FROM vw_financial_summary_project_totals
GROUP BY funding_agency
ORDER BY agency_name;


CREATE OR REPLACE VIEW vw_financial_summary_grand_totals AS
SELECT 
    COUNT(DISTINCT project_id) as total_projects,
    SUM(total_approved_budget)::NUMERIC(14,2) as total_approved_budget,
    SUM(total_funds_received)::NUMERIC(14,2) as total_funds_received,
    SUM(total_expenditure)::NUMERIC(14,2) as total_expenditure,
    SUM(total_budget_balance)::NUMERIC(14,2) as budget_balance,
    SUM(total_funds_balance)::NUMERIC(14,2) as funds_balance,
    CASE 
        WHEN SUM(total_approved_budget) > 0 
        THEN (SUM(total_expenditure) / SUM(total_approved_budget) * 100)
        ELSE 0 
    END::NUMERIC(14,2) as overall_utilization
FROM vw_financial_summary_project_totals;

CREATE OR REPLACE FUNCTION get_financial_summary_date_range(
    start_date DATE,
    end_date DATE,
    p_project_id INT DEFAULT NULL
)
RETURNS TABLE (
    project_id INT,
    project_no TEXT,
    title TEXT,
    technical_group TEXT,
    funding_agency TEXT,
    budget_head TEXT,
    approved_budget NUMERIC,
    funds_received NUMERIC,
    expenditure NUMERIC,
    budget_balance NUMERIC,
    funds_balance NUMERIC,
    utilization_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH project_budgets AS (
        SELECT 
            p.project_id,
            p.project_no,
            p.title,
            tg.name as technical_group,
            fa.name as funding_agency,
            ba.head,
            COALESCE(ba.allocated_amount, 0) as approved_budget
        FROM projects p
        LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
        LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
        LEFT JOIN budget_allocation ba ON p.project_id = ba.project_id
        WHERE (p_project_id IS NULL OR p.project_id = p_project_id)
    ),
    funds_by_head AS (
        -- Only funds received DURING the date range
        SELECT 
            fr.project_id,
            fr.head,
            SUM(fr.amount) as funds_received
        FROM funds_received fr
        WHERE fr.date_received BETWEEN start_date AND end_date
        GROUP BY fr.project_id, fr.head
    ),
    expenditure_by_head AS (
        -- Only expenditure incurred DURING the date range
        SELECT 
            m.project_id,
            'manpower' as head,
            SUM(m.total_cost) as expenditure
        FROM manpower m
        WHERE m.date_incurred BETWEEN start_date AND end_date
        GROUP BY m.project_id
        
        UNION ALL
        
        SELECT 
            e.project_id,
            'equipment' as head,
            SUM(e.total_cost) as expenditure
        FROM equipment e
        WHERE e.purchase_date BETWEEN start_date AND end_date
        GROUP BY e.project_id
        
        UNION ALL
        
        SELECT 
            be.project_id,
            be.head,
            SUM(be.amount) as expenditure
        FROM budget_expenditure be
        WHERE be.date_incurred BETWEEN start_date AND end_date
        GROUP BY be.project_id, be.head
    )
    SELECT 
        pb.project_id,
        pb.project_no,
        pb.title,
        pb.technical_group,
        pb.funding_agency,
        pb.head,
        pb.approved_budget,
        COALESCE(fh.funds_received, 0),
        COALESCE(eh.expenditure, 0),
        -- Budget Balance (uses full approved budget, not just period)
        (pb.approved_budget - COALESCE(eh.expenditure, 0)),
        -- Funds Balance (received - spent during period)
        (COALESCE(fh.funds_received, 0) - COALESCE(eh.expenditure, 0)),
        CASE 
            WHEN pb.approved_budget > 0 
            THEN (COALESCE(eh.expenditure, 0) / pb.approved_budget * 100)
            ELSE 0 
        END
    FROM project_budgets pb
    LEFT JOIN funds_by_head fh ON pb.project_id = fh.project_id AND pb.head = fh.head
    LEFT JOIN expenditure_by_head eh ON pb.project_id = eh.project_id AND pb.head = eh.head
    ORDER BY pb.project_no, pb.head;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION 2: Financial Year Filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_summary_financial_year(
    fy_year INT,  -- e.g., 2024 for FY 2024-25
    p_project_id INT DEFAULT NULL
)
RETURNS TABLE (
    project_id INT,
    project_no TEXT,
    title TEXT,
    technical_group TEXT,
    funding_agency TEXT,
    budget_head TEXT,
    approved_budget NUMERIC,
    funds_received NUMERIC,
    expenditure NUMERIC,
    budget_balance NUMERIC,
    funds_balance NUMERIC,
    utilization_percentage NUMERIC
) AS $$
DECLARE
    fy_start DATE;
    fy_end DATE;
BEGIN
    -- Indian Financial Year: April 1 to March 31
    fy_start := make_date(fy_year, 4, 1);
    fy_end := make_date(fy_year + 1, 3, 31);
    
    RETURN QUERY
    SELECT * FROM get_financial_summary_date_range(fy_start, fy_end, p_project_id);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION 3: Monthly Breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_summary_monthly(
    target_year INT,
    target_month INT,
    p_project_id INT DEFAULT NULL
)
RETURNS TABLE (
    project_id INT,
    project_no TEXT,
    title TEXT,
    technical_group TEXT,
    funding_agency TEXT,
    budget_head TEXT,
    approved_budget NUMERIC,
    funds_received NUMERIC,
    expenditure NUMERIC,
    budget_balance NUMERIC,
    funds_balance NUMERIC,
    utilization_percentage NUMERIC
) AS $$
DECLARE
    month_start DATE;
    month_end DATE;
BEGIN
    -- First day of the month
    month_start := make_date(target_year, target_month, 1);
    -- Last day of the month
    month_end := (month_start + INTERVAL '1 month - 1 day')::DATE;
    
    RETURN QUERY
    SELECT * FROM get_financial_summary_date_range(month_start, month_end, p_project_id);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION 4: Quarter Breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_summary_quarter(
    target_year INT,
    quarter INT,  -- 1, 2, 3, or 4
    p_project_id INT DEFAULT NULL
)
RETURNS TABLE (
    project_id INT,
    project_no TEXT,
    title TEXT,
    technical_group TEXT,
    funding_agency TEXT,
    budget_head TEXT,
    approved_budget NUMERIC,
    funds_received NUMERIC,
    expenditure NUMERIC,
    budget_balance NUMERIC,
    funds_balance NUMERIC,
    utilization_percentage NUMERIC
) AS $$
DECLARE
    quarter_start DATE;
    quarter_end DATE;
BEGIN
    -- Calculate quarter dates
    CASE quarter
        WHEN 1 THEN
            quarter_start := make_date(target_year, 1, 1);
            quarter_end := make_date(target_year, 3, 31);
        WHEN 2 THEN
            quarter_start := make_date(target_year, 4, 1);
            quarter_end := make_date(target_year, 6, 30);
        WHEN 3 THEN
            quarter_start := make_date(target_year, 7, 1);
            quarter_end := make_date(target_year, 9, 30);
        WHEN 4 THEN
            quarter_start := make_date(target_year, 10, 1);
            quarter_end := make_date(target_year, 12, 31);
        ELSE
            RAISE EXCEPTION 'Quarter must be 1, 2, 3, or 4';
    END CASE;
    
    RETURN QUERY
    SELECT * FROM get_financial_summary_date_range(quarter_start, quarter_end, p_project_id);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- VIEW: Monthly Expenditure Trend (for all projects)
-- ============================================================================

CREATE OR REPLACE VIEW vw_monthly_expenditure_trend AS
WITH monthly_data AS (
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        DATE_TRUNC('month', m.date_incurred)::DATE as month,
        'manpower' as head,
        SUM(m.total_cost) as amount
    FROM projects p
    JOIN manpower m ON p.project_id = m.project_id
    WHERE m.date_incurred IS NOT NULL
    GROUP BY p.project_id, p.project_no, p.title, DATE_TRUNC('month', m.date_incurred)
    
    UNION ALL
    
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        DATE_TRUNC('month', e.purchase_date)::DATE,
        'equipment',
        SUM(e.total_cost)
    FROM projects p
    JOIN equipment e ON p.project_id = e.project_id
    WHERE e.purchase_date IS NOT NULL
    GROUP BY p.project_id, p.project_no, p.title, DATE_TRUNC('month', e.purchase_date)
    
    UNION ALL
    
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        DATE_TRUNC('month', be.date_incurred)::DATE,
        be.head,
        SUM(be.amount)
    FROM projects p
    JOIN budget_expenditure be ON p.project_id = be.project_id
    WHERE be.date_incurred IS NOT NULL
    GROUP BY p.project_id, p.project_no, p.title, DATE_TRUNC('month', be.date_incurred), be.head
)
SELECT 
    project_id,
    project_no,
    title,
    month,
    head,
    amount,
    SUM(amount) OVER (PARTITION BY project_id, head ORDER BY month) as cumulative_amount
FROM monthly_data
ORDER BY project_id, month, head;


-- ============================================================================
-- VIEW: Yearly Summary
-- ============================================================================

CREATE OR REPLACE VIEW vw_yearly_expenditure_summary AS
WITH yearly_data AS (
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        EXTRACT(YEAR FROM m.date_incurred) as year,
        'manpower' as head,
        SUM(m.total_cost) as amount
    FROM projects p
    JOIN manpower m ON p.project_id = m.project_id
    WHERE m.date_incurred IS NOT NULL
    GROUP BY p.project_id, p.project_no, p.title, EXTRACT(YEAR FROM m.date_incurred)
    
    UNION ALL
    
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        EXTRACT(YEAR FROM e.purchase_date),
        'equipment',
        SUM(e.total_cost)
    FROM projects p
    JOIN equipment e ON p.project_id = e.project_id
    WHERE e.purchase_date IS NOT NULL
    GROUP BY p.project_id, p.project_no, p.title, EXTRACT(YEAR FROM e.purchase_date)
    
    UNION ALL
    
    SELECT 
        p.project_id,
        p.project_no,
        p.title,
        EXTRACT(YEAR FROM be.date_incurred),
        be.head,
        SUM(be.amount)
    FROM projects p
    JOIN budget_expenditure be ON p.project_id = be.project_id
    WHERE be.date_incurred IS NOT NULL
    GROUP BY p.project_id, p.project_no, p.title, EXTRACT(YEAR FROM be.date_incurred), be.head
)
SELECT 
    project_id,
    project_no,
    title,
    year,
    head,
    amount
FROM yearly_data
ORDER BY project_id, year, head;

CREATE OR REPLACE FUNCTION get_project_financial_summary_as_of_date(as_of_date DATE)
RETURNS TABLE (
    project_id INT,
    project_no TEXT,
    title TEXT,
    technical_group TEXT,
    funding_agency TEXT,
    budget_head TEXT,
    approved_budget NUMERIC,
    funds_received NUMERIC,
    expenditure NUMERIC,
    budget_balance NUMERIC,
    funds_balance NUMERIC,
    utilization_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH project_budgets AS (
        SELECT 
            p.project_id,
            p.project_no,
            p.title,
            tg.name as technical_group,
            fa.name as funding_agency,
            ba.head,
            ba.allocated_amount as approved_budget
        FROM projects p
        LEFT JOIN technical_groups tg ON p.technical_group_id = tg.group_id
        LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
        INNER JOIN budget_allocation ba ON p.project_id = ba.project_id
    ),
    funds_by_head AS (
        -- All funds received UP TO the as_of_date (cumulative)
        SELECT 
            fr.project_id,
            fr.head,
            SUM(fr.amount) as funds_received
        FROM funds_received fr
        WHERE fr.date_received <= as_of_date
        GROUP BY fr.project_id, fr.head
    ),
    expenditure_by_head AS (
        -- All expenditure incurred UP TO the as_of_date (cumulative)
        SELECT 
            m.project_id,
            'manpower' as head,
            SUM(m.total_cost) as expenditure
        FROM manpower m
        WHERE m.date_incurred <= as_of_date OR m.date_incurred IS NULL
        GROUP BY m.project_id
        
        UNION ALL
        
        SELECT 
            e.project_id,
            'equipment' as head,
            SUM(e.total_cost) as expenditure
        FROM equipment e
        WHERE e.purchase_date <= as_of_date OR e.purchase_date IS NULL
        GROUP BY e.project_id
        
        UNION ALL
        
        SELECT 
            be.project_id,
            be.head,
            SUM(be.amount) as expenditure
        FROM budget_expenditure be
        WHERE be.date_incurred <= as_of_date OR be.date_incurred IS NULL
        GROUP BY be.project_id, be.head
    )
    SELECT 
        pb.project_id,
        pb.project_no,
        pb.title,
        pb.technical_group,
        pb.funding_agency,
        pb.head,
        pb.approved_budget,
        COALESCE(fh.funds_received, 0),
        COALESCE(eh.expenditure, 0),
        (pb.approved_budget - COALESCE(eh.expenditure, 0)),
        (COALESCE(fh.funds_received, 0) - COALESCE(eh.expenditure, 0)),
        CASE 
            WHEN pb.approved_budget > 0 
            THEN (COALESCE(eh.expenditure, 0) / pb.approved_budget * 100)
            ELSE 0 
        END
    FROM project_budgets pb
    LEFT JOIN funds_by_head fh ON pb.project_id = fh.project_id AND pb.head = fh.head
    LEFT JOIN expenditure_by_head eh ON pb.project_id = eh.project_id AND pb.head = eh.head
    ORDER BY pb.project_no, pb.head;
END;
$$ LANGUAGE plpgsql;

-- Run this SQL to create the report_logs table
CREATE TABLE IF NOT EXISTS report_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    generated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_size INTEGER,
    included_sections VARCHAR(500)
);

CREATE INDEX idx_report_logs_project ON report_logs(project_id);
CREATE INDEX idx_report_logs_generated_at ON report_logs(generated_at DESC);

TRUNCATE TABLE report_logs RESTART IDENTITY CASCADE;

-- ============================================================================
-- UC SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- This migration adds support for Utilization Certificate (UC) generation
-- Run this after your existing schema is in place

-- ============================================================================
-- STEP 1: Create project_installments table
-- ============================================================================

CREATE TABLE project_installments (
    installment_id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    sanction_number TEXT NOT NULL,
    sanction_date DATE NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    date_received DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_installment UNIQUE(project_id, installment_number),
    CONSTRAINT unique_project_sanction UNIQUE(project_id, sanction_number),
    CONSTRAINT positive_amount CHECK (total_amount > 0),
    CONSTRAINT positive_installment_number CHECK (installment_number > 0)
);

CREATE INDEX idx_installments_project ON project_installments(project_id);
CREATE INDEX idx_installments_sanction ON project_installments(sanction_number);

COMMENT ON TABLE project_installments IS 'Tracks grant installments received from funding agencies';
COMMENT ON COLUMN project_installments.total_amount IS 'Total installment amount (sum of all 6 budget heads)';

-- ============================================================================
-- STEP 2: Add installment_id to funds_received
-- ============================================================================

ALTER TABLE funds_received 
ADD COLUMN installment_id INT REFERENCES project_installments(installment_id) ON DELETE CASCADE;

CREATE INDEX idx_funds_received_installment ON funds_received(installment_id);

COMMENT ON COLUMN funds_received.installment_id IS 'Links to the installment this fund belongs to';

-- ============================================================================
-- STEP 3: Create utilization_certificates table
-- ============================================================================

CREATE TABLE utilization_certificates (
    uc_id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    uc_number TEXT UNIQUE NOT NULL,
    financial_year TEXT NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    
    opening_balance NUMERIC(14,2) DEFAULT 0,

    interest_earned NUMERIC(14,2) DEFAULT 0,
    interest_deposited NUMERIC(14,2) DEFAULT 0,
    
    total_grants_received NUMERIC(14,2) DEFAULT 0,
    total_expenditure NUMERIC(14,2) DEFAULT 0,
    closing_balance NUMERIC(14,2) DEFAULT 0,
    
    grant_general NUMERIC(14,2) DEFAULT 0,      -- consumables+travel+contingency+overhead
    grant_salary NUMERIC(14,2) DEFAULT 0,        -- manpower (Recurring)
    grant_capital_assets NUMERIC(14,2) DEFAULT 0, -- equipment (Non-Recurring)

    expenditure_recurring NUMERIC(14,2) DEFAULT 0,     -- Salaries + General
    expenditure_non_recurring NUMERIC(14,2) DEFAULT 0, -- Equipment
    
    status TEXT CHECK (status IN ('draft', 'submitted', 'approved')) DEFAULT 'draft',
    generated_date DATE DEFAULT CURRENT_DATE,
    generated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    submitted_date DATE,
    approved_date DATE,
    
    pi_name TEXT,
    pi_signature_date DATE,
    admin_name TEXT,
    admin_signature_date DATE,
    head_name TEXT,
    head_signature_date DATE,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_financial_year UNIQUE(project_id, financial_year),
    CONSTRAINT valid_period CHECK (period_to > period_from)
);

CREATE INDEX idx_uc_project ON utilization_certificates(project_id);
CREATE INDEX idx_uc_financial_year ON utilization_certificates(financial_year);
CREATE INDEX idx_uc_status ON utilization_certificates(status);

COMMENT ON TABLE utilization_certificates IS 'Stores Utilization Certificate (UC) data for each financial year';
COMMENT ON COLUMN utilization_certificates.opening_balance IS 'Unspent balance from previous financial year';
COMMENT ON COLUMN utilization_certificates.closing_balance IS 'Balance to carry forward to next financial year';

-- ============================================================================
-- STEP 4: Create uc_statement_of_expenditure table
-- ============================================================================

CREATE TABLE uc_statement_of_expenditure (
    soe_id SERIAL PRIMARY KEY,
    uc_id INT NOT NULL REFERENCES utilization_certificates(uc_id) ON DELETE CASCADE,
    head TEXT NOT NULL CHECK (
        head IN (
            'equipment',
            'salaries',
            'consumables',
            'travels',
            'contingencies',
            'overheads'
        )
    ),
    approved_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
    expenditure_incurred NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_expenditure NUMERIC(14,2) NOT NULL DEFAULT 0,
    
    CONSTRAINT unique_uc_head UNIQUE(uc_id, head)
);

CREATE INDEX idx_soe_uc ON uc_statement_of_expenditure(uc_id);

COMMENT ON TABLE uc_statement_of_expenditure IS 'Detailed expenditure breakdown for UC Statement of Expenditure (SoE)';

-- ============================================================================
-- STEP 5: Create helper views
-- ============================================================================

-- View: Installment summary with breakdown validation
CREATE OR REPLACE VIEW vw_installment_summary AS
SELECT 
    i.installment_id,
    i.project_id,
    p.project_no,
    p.title,
    i.installment_number,
    i.sanction_number,
    i.sanction_date,
    i.date_received,
    i.total_amount as declared_total,
    COALESCE(SUM(fr.amount), 0) as breakdown_total,
    i.total_amount - COALESCE(SUM(fr.amount), 0) as difference,
    CASE 
        WHEN ABS(i.total_amount - COALESCE(SUM(fr.amount), 0)) < 0.01 THEN 'Balanced'
        ELSE 'Mismatch'
    END as validation_status,
    COUNT(fr.fund_id) as number_of_heads
FROM project_installments i
JOIN projects p ON i.project_id = p.project_id
LEFT JOIN funds_received fr ON i.installment_id = fr.installment_id
GROUP BY i.installment_id, i.project_id, p.project_no, p.title,
         i.installment_number, i.sanction_number, i.sanction_date,
         i.date_received, i.total_amount;

COMMENT ON VIEW vw_installment_summary IS 'Validates that installment total matches sum of budget head breakdowns';

-- View: UC Summary
CREATE OR REPLACE VIEW vw_uc_summary AS
SELECT 
    uc.uc_id,
    uc.uc_number,
    uc.financial_year,
    p.project_id,
    p.project_no,
    p.title,
    fa.name as funding_agency,
    uc.period_from,
    uc.period_to,
    uc.opening_balance,
    uc.total_grants_received,
    uc.total_expenditure,
    uc.closing_balance,
    uc.grant_general,
    uc.grant_salary,
    uc.grant_capital_assets,
    uc.expenditure_recurring,
    uc.expenditure_non_recurring,
    uc.status,
    uc.generated_date,
    u.full_name as generated_by_name
FROM utilization_certificates uc
JOIN projects p ON uc.project_id = p.project_id
LEFT JOIN funding_agencies fa ON p.funding_agency_id = fa.agency_id
LEFT JOIN users u ON uc.generated_by = u.user_id
ORDER BY uc.financial_year DESC, p.project_no;

-- ============================================================================
-- STEP 6: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_installments_updated_at
    BEFORE UPDATE ON project_installments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uc_updated_at
    BEFORE UPDATE ON utilization_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Sample data (optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
-- Sample installment for project_id = 1
INSERT INTO project_installments (project_id, installment_number, sanction_number, 
    sanction_date, total_amount, date_received, remarks)
VALUES 
    (1, 1, '4(4)/2021-ITEA', '2021-03-23', 8801000, '2024-09-08', '1st installment'),
    (1, 2, '4(4)/2021-ITEA-2', '2024-01-15', 1250000, '2024-09-10', '2nd installment');

-- Link existing funds_received to installments (if you have data)
-- UPDATE funds_received SET installment_id = 1 WHERE project_id = 1 AND date_received = '2024-09-08';
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check installment validation
-- SELECT * FROM vw_installment_summary WHERE validation_status = 'Mismatch';

-- Check UC summary
-- SELECT * FROM vw_uc_summary;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON project_installments TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON utilization_certificates TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON uc_statement_of_expenditure TO your_app_user;
-- GRANT SELECT ON vw_installment_summary TO your_app_user;
-- GRANT SELECT ON vw_uc_summary TO your_app_user;