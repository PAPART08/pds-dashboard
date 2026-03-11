import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jilacswgiuyasvposygg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbGFjc3dnaXV5YXN2cG9zeWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTg4NDcsImV4cCI6MjA4ODQ5NDg0N30.3Zgvh2rlJu0r37IrmJ2rG244R-d4DVaRcNvokaBMdOs';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Data fetching will fail.');
}

// Create a single supabase client for interacting with your database
const isBrowser = typeof window !== 'undefined';

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: isBrowser,
            autoRefreshToken: isBrowser,
            detectSessionInUrl: isBrowser
        }
    }
);
