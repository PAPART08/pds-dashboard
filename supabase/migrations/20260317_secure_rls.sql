-- Migration: Secure RLS policies for tasks and employees tables

-- 1. Secure Employers RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.employees;
CREATE POLICY "Allow select for authenticated users" ON public.employees
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow update for self" ON public.employees;
CREATE POLICY "Allow update for self" ON public.employees
    FOR UPDATE USING (id = auth.uid());


-- 2. Helper functions for Tasks RLS
CREATE OR REPLACE FUNCTION public.get_current_user_name() 
RETURNS text AS $$
    SELECT name FROM public.employees WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_position() 
RETURNS text AS $$
    SELECT position FROM public.employees WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- 3. Secure Tasks RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Allow update based on role or assignee" ON public.tasks;
DROP POLICY IF EXISTS "Allow delete based on role or assignee" ON public.tasks;

-- Allow all authenticated users to view tasks
CREATE POLICY "Allow select for authenticated users" ON public.tasks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to create tasks (or restrict to admins, but generally anyone can create tasks in this app based on 'projects' flow)
CREATE POLICY "Allow insert for authenticated users" ON public.tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Restrict updates to the assigned user or higher privileges
CREATE POLICY "Allow update based on role or assignee" ON public.tasks
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            assignee_name = public.get_current_user_name() OR 
            public.get_current_user_position() IN ('Section Chief', 'Admin', 'Unit Head', 'Planning Unit Head')
        )
    );

-- Restrict deletes similarly
CREATE POLICY "Allow delete based on role or assignee" ON public.tasks
    FOR DELETE USING (
        auth.role() = 'authenticated' AND (
            public.get_current_user_position() IN ('Section Chief', 'Admin', 'Unit Head', 'Planning Unit Head')
        )
    );
