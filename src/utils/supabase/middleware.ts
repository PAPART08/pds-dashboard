import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jilacswgiuyasvposygg.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbGFjc3dnaXV5YXN2cG9zeWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTg4NDcsImV4cCI6MjA4ODQ5NDg0N30.3Zgvh2rlJu0r37IrmJ2rG244R-d4DVaRcNvokaBMdOs',
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set({ name, value, ...options });
                        response.cookies.set({ name, value, ...options });
                    });
                },
            },
        }
    );

    // Use getSession() instead of getUser() to decode locally
    // avoids Edge API network fetch timeouts which mistakenly invalidate Edge cookies!
    await supabase.auth.getSession();

    return response;
}
