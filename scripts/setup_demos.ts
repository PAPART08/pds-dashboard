import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

async function setupDemoAccounts() {
    const demousers = [
        { email: 'chief@dpwh.gov.ph', password: 'password123', name: 'Carlos Santos', username: 'chief', position: 'Section Chief', unit: 'Planning & Design', user_type: 'User' },
        { email: 'head@dpwh.gov.ph', password: 'password123', name: 'Antonio Reyes', username: 'head', position: 'Unit Head', unit: 'Planning & Design', user_type: 'User' },
        { email: 'user@dpwh.gov.ph', password: 'password123', name: 'Maria Dela Cruz', username: 'user', position: 'Regular Member', unit: 'Planning & Design', user_type: 'User' },
        { email: 'planning@dpwh.gov.ph', password: 'password123', name: 'James Rodriguez', username: 'planning', position: 'Planning Unit', unit: 'Planning & Design', user_type: 'User' }
    ];

    for (const user of demousers) {
        console.log(`Setting up ${user.email}...`);

        // 1. Create/Update Auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                full_name: user.name,
                username: user.username
            }
        });

        if (authError) {
            if (authError.message.includes("already registered")) {
                console.log(`${user.email} already exists in Auth. Updating password...`);
                // Get user by email to get ID
                const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = listData?.users.find(u => u.email === user.email);
                if (existingUser) {
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: user.password });
                }
            } else {
                console.error(`Error for ${user.email}:`, authError.message);
                continue;
            }
        }

        const userId = authData?.user?.id || (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === user.email)?.id;

        if (userId) {
            // 2. Sync to employees table
            const { error: dbError } = await supabaseAdmin
                .from('employees')
                .upsert({
                    id: userId,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    position: user.position,
                    unit: user.unit,
                    user_type: user.user_type,
                    password: user.password
                }, { onConflict: 'id' });

            if (dbError) {
                console.error(`DB Error for ${user.email}:`, dbError.message);
            } else {
                console.log(`Success for ${user.email}`);
            }
        }
    }
}

setupDemoAccounts();
