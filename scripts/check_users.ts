import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkUsers() {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error(error);
        return;
    }
    data.users.forEach(u => console.log(u.id, u.email, u.user_metadata));
}

checkUsers();
