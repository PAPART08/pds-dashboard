-- Add foreign key constraint to messages.user_id referencing employees.id
-- This allows Supabase auto-joins for queries like: .select('*, employees(name)')

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_user_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages 
        ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;
