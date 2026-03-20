const { createClient } = require('@supabase/supabase-js');
const url = 'https://jilacswgiuyasvposygg.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // I will extract this from .env.local via grep
// Wait, I already saw it in .env.local
