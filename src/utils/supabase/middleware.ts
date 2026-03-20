import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Update the request cookies
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    
                    // Also clone the response to set the cookie
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    
                    // Set cookie on response
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    // Remove from request
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    
                    // Also clone timezone to set cookie as expired
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    
                    // Remove from response
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // This will refresh session if expired
    const { data: { user } } = await supabase.auth.getUser();

    // Check auth rules
    const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
    const isLoginRoute = request.nextUrl.pathname.startsWith('/login');

    if (isDashboardRoute && !user) {
        // Redirect unsigned in users trying to access dashboard
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    if (isLoginRoute && user) {
        // Redirect signed in users trying to access login
        // In a real app we might redirect based on role, for now falling back to default or what we had
        const url = request.nextUrl.clone();
        // Fallback to user-task, the dashboard layout handles specific role routing if needed
        url.pathname = '/dashboard/user-task'; 
        return NextResponse.redirect(url);
    }

    return response;
}
