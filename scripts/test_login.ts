import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function testLogin() {
    console.log("Testing login with admin credentials...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@dpwh.gov.ph",
        password: "password123",
    });

    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login successful! User ID:", data.user?.id);
    }
}

testLogin();
