-- Migration: Create tasks table and port assignments from projects JSONB columns

-- 1. Create the tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_name TEXT,
    task_type TEXT NOT NULL, -- 'PROJECT_LEAD' or 'DOC_COMPLIANCE'
    doc_code TEXT,           -- e.g., 'PR', 'DUPA'. NULL for PROJECT_LEAD
    status TEXT DEFAULT 'Drafting',
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Simple policy for authenticated users (adjust as needed for your specific PDS roles)
CREATE POLICY "Allow all access for authenticated users" ON public.tasks
    FOR ALL USING (auth.role() = 'authenticated');

-- 2. Migrate Project Leads (Unit Head assignments)
INSERT INTO public.tasks (project_id, assignee_name, task_type, deadline, status)
SELECT 
    id as project_id, 
    assigned_to as assignee_name, 
    'PROJECT_LEAD' as task_type,
    CASE 
        WHEN deadline IS NOT NULL AND deadline != '' AND deadline ~ '^\d{4}-\d{2}-\d{2}$' THEN deadline::DATE 
        ELSE NULL 
    END as deadline,
    'In Progress' as status
FROM public.projects
WHERE assigned_to IS NOT NULL AND assigned_to != '';

-- 3. Migrate Document Assignments
DO $$
DECLARE
    proj RECORD;
    d_code TEXT;
    a_name TEXT;
    d_status TEXT;
    d_deadline TEXT;
BEGIN
    FOR proj IN 
        SELECT id, doc_assignments, doc_statuses, doc_deadlines 
        FROM public.projects 
        WHERE doc_assignments IS NOT NULL AND doc_assignments != '{}'::jsonb 
    LOOP
        FOR d_code, a_name IN SELECT * FROM jsonb_each_text(proj.doc_assignments) LOOP
            -- Get status and deadline from the other JSON objects if they exist
            d_status := proj.doc_statuses->>d_code;
            d_deadline := proj.doc_deadlines->>d_code;
            
            INSERT INTO public.tasks (project_id, assignee_name, task_type, doc_code, status, deadline)
            VALUES (
                proj.id, 
                a_name, 
                'DOC_COMPLIANCE', 
                d_code, 
                COALESCE(d_status, 'Drafting'), 
                CASE 
                    WHEN d_deadline IS NOT NULL AND d_deadline != '' AND d_deadline ~ '^\d{4}-\d{2}-\d{2}$' THEN d_deadline::DATE 
                    ELSE NULL 
                END
            );
        END LOOP;
    END LOOP;
END $$;
