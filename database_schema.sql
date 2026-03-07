-- Final Database Schema for RIF Dashboard
-- Based on Project_Database_Format.csv, Components_database_formats.csv, and Infra_Activity_database_Formats.csv

-- 1. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alternate_id TEXT UNIQUE, -- Corresponds to "Project IDs" and "Alternate ID"
    project_name TEXT,
    project_amount NUMERIC,
    project_category TEXT,
    thrust TEXT,
    project_origin TEXT,
    funding_agreement_name TEXT,
    implementing_office TEXT,
    city_municipality TEXT,
    district_engineering_office TEXT,
    legislative_district TEXT,
    operating_unit TEXT,
    originating_agency TEXT,
    thrust_code TEXT,
    region_wide BOOLEAN,
    start_year INTEGER,
    reporting_region TEXT,
    program_stage TEXT,
    tier TEXT,
    rank INTEGER,
    justification TEXT,
    boundary_code TEXT,
    sub_program_code TEXT,
    asd_1 TEXT, -- New fields ASD-1 to ASD-11
    asd_2 TEXT,
    asd_3 TEXT,
    asd_4 TEXT,
    asd_5 TEXT,
    asd_6 TEXT,
    asd_7 TEXT,
    asd_8 TEXT,
    asd_9 TEXT,
    asd_10 TEXT,
    asd_11 TEXT,
    selection BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Components Table
CREATE TABLE project_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    comp_id_display TEXT, -- Corresponds to "Component ID"
    comp_type TEXT,      -- Corresponds to "Component Type"
    comp_amount NUMERIC, -- Corresponds to "Component Amount"
    planned_start_date DATE,
    planned_end_date DATE,
    start_year INTEGER,
    infra_type TEXT,     -- Corresponds to "Infrastructure Type"
    infra_name TEXT,     -- Corresponds to "Infrastructure Name"
    type_of_work TEXT,   -- Corresponds to "Type of work"
    target_unit TEXT,
    physical_target NUMERIC,
    alternate_id TEXT,
    program_stage TEXT
);

-- 3. Infra Activities (Specific Details) Table
CREATE TABLE project_infra_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    comp_id_ref TEXT, -- References comp_id_display
    infra_item TEXT,  -- Corresponds to "Infrastructure Item"
    start_station_limit TEXT,
    end_station_limit TEXT,
    start_chainage TEXT,
    end_chainage TEXT,
    start_x TEXT,     -- Added Start/End X/Y
    start_y TEXT,
    end_x TEXT,
    end_y TEXT,
    length_m NUMERIC, -- Corresponds to "Length"
    detailed_scope_of_work TEXT,
    target_amount NUMERIC,
    dominant BOOLEAN,
    cost_per_line NUMERIC,
    year INTEGER,
    alternate_id TEXT,
    program_stage TEXT,
    original_remarks TEXT,
    revised_remarks TEXT,
    infra_type TEXT
);
