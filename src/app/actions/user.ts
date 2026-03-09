"use server";

import { createClient } from "@supabase/supabase-js";

export async function createTeamMember(userData: any) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: "Missing Supabase configuration or Service Role Key." };
    }

    // Create a Supabase admin client using the service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    try {
        // 1. Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true, // Auto-confirm the email
            user_metadata: {
                full_name: userData.name,
                username: userData.username,
            },
        });

        if (authError) {
            console.error("Supabase Auth Error:", authError);
            return { success: false, error: authError.message };
        }

        const userId = authData.user.id;

        // 2. Insert the user into the custom 'employees' table
        const { data: dbData, error: dbError } = await supabaseAdmin
            .from("employees")
            .insert([
                {
                    id: userId,
                    name: userData.name,
                    username: userData.username,
                    email: userData.email,
                    position: userData.position,
                    unit: userData.unit,
                    user_type: userData.user_type || "User",
                    restrictions: userData.restrictions || [],
                    password: userData.password, // Still keeping it for legacy/fallback if needed later, but auth uses secure hashing
                },
            ])
            .select();

        if (dbError) {
            console.error("Supabase DB Error:", dbError);

            // Rollback: Delete the user from auth if DB insert fails
            await supabaseAdmin.auth.admin.deleteUser(userId);

            return { success: false, error: dbError.message };
        }

        return { success: true, data: dbData[0] };
    } catch (err: any) {
        console.error("Unexpected error creating user:", err);
        return { success: false, error: err.message || "An unexpected error occurred." };
    }
}

export async function updateTeamMember(userData: any) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: "Missing Supabase configuration or Service Role Key." };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
        // 1. Update Auth password if provided
        if (userData.password) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                userData.id,
                { password: userData.password }
            );
            if (authError) {
                console.error("Supabase Auth Update Error:", authError);
                return { success: false, error: authError.message };
            }
        }

        // 2. Update the custom 'employees' table
        const { error: dbError } = await supabaseAdmin
            .from("employees")
            .update({
                name: userData.name,
                username: userData.username,
                email: userData.email,
                position: userData.position,
                unit: userData.unit,
                user_type: userData.user_type,
                restrictions: userData.restrictions,
                password: userData.password, // Keep sync for existing logic
            })
            .eq("id", userData.id);

        if (dbError) {
            console.error("Supabase DB Update Error:", dbError);
            return { success: false, error: dbError.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Unexpected error updating user:", err);
        return { success: false, error: err.message || "An unexpected error occurred." };
    }
}

export async function deleteTeamMember(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: "Missing Supabase configuration or Service Role Key." };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
        // 1. Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            console.error("Supabase Auth Delete Error:", authError);
            return { success: false, error: authError.message };
        }

        // 2. Delete from 'employees' table
        const { error: dbError } = await supabaseAdmin
            .from("employees")
            .delete()
            .eq("id", userId);

        if (dbError) {
            console.error("Supabase DB Delete Error:", dbError);
            return { success: false, error: dbError.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Unexpected error deleting user:", err);
        return { success: false, error: err.message || "An unexpected error occurred." };
    }
}
