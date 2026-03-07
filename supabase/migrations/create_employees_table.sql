-- Create tracking for the roles and permissions
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    unit TEXT NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'User',
    restrictions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: you might want to insert initial data
INSERT INTO public.employees (id, name, position, unit, user_type, restrictions) VALUES
('eb11025a-4b95-4eb8-b217-0610f4435cc1', 'Engr. Antonio Reyes', 'Section Chief', 'Planning & Design', 'Admin', ARRAY['RBP Encoding', 'Tech. Review', 'Final Approval']),
('eb11025a-4b95-4eb8-b217-0610f4435cc2', 'Engr. Maria Santos', 'Unit Head', 'Design', 'User', ARRAY['Tech. Review']),
('eb11025a-4b95-4eb8-b217-0610f4435cc3', 'Engr. Juan Dela Cruz', 'Engineer II', 'Planning', 'User', ARRAY['RBP Encoding', 'Master List Management']),
('eb11025a-4b95-4eb8-b217-0610f4435cc4', 'Engr. Sarah Lee', 'Engineer I', 'Design', 'User', ARRAY['Document Preparation']),
('eb11025a-4b95-4eb8-b217-0610f4435cc5', 'Estimator Johnson', 'Cost Estimator', 'Estimating', 'User', ARRAY['DUPA Preparation']),
('eb11025a-4b95-4eb8-b217-0610f4435cc6', 'Designer Gomez', 'Lead Designer', 'Design', 'User', ARRAY['Plan Preparation']),
('eb11025a-4b95-4eb8-b217-0610f4435cc7', 'Programmer Reyes', 'Project Programmer', 'Planning', 'User', ARRAY['Scheduling'])
ON CONFLICT DO NOTHING;
