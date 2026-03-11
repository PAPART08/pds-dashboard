import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

async function resetPasswords() {
    console.log("Resetting passwords...");

    const usersToReset = [
        { email: 'jade@gmail.com', newPassword: 'password123' },
        { email: 'trish@dpwh.gov.ph', newPassword: 'password123' },
        { email: 'admin@dpwh.gov.ph', newPassword: 'password123' }
    ];

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    for (const targetUser of usersToReset) {
        const userDetails = data.users.find(u => u.email === targetUser.email || u.email?.toLowerCase() === targetUser.email.toLowerCase());

        if (userDetails) {
            console.log(`Found ${targetUser.email} (ID: ${userDetails.id}). Updating Auth password...`);
            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
                userDetails.id,
                { password: targetUser.newPassword }
            );

            if (updateAuthError) {
                console.error(`Failed to update Auth password for ${targetUser.email}:`, updateAuthError);
            } else {
                console.log(`Successfully updated Auth password for ${targetUser.email}`);

                // Keep the 'employees' table synchronized just in case
                const { error: dbError } = await supabaseAdmin
                    .from('employees')
                    .update({ password: targetUser.newPassword })
                    .eq('id', userDetails.id);

                if (dbError) {
                    console.error(`Failed to sync DB password for ${targetUser.email}:`, dbError);
                } else {
                    console.log(`Synchronized DB password for ${targetUser.email}`);
                }
            }
        } else {
            console.log(`User ${targetUser.email} not found in Auth pool.`);
        }
    }
}

resetPasswords();
