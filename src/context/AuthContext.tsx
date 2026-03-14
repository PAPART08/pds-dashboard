'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Employee } from '@/lib/types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Employee | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('Auth event:', event, 'User:', currentSession?.user?.id);
            
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            
            if (currentSession?.user) {
                // Fetch profile only if session has changed meaningfully
                await fetchProfile(currentSession.user.id);
            } else {
                setProfile(null);
                // Clear legacy localStorage for compatibility
                localStorage.removeItem('currentUser');
            }
            
            // Only set loading to false after the initial check is complete
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile for ID:', userId);
                console.error('Supabase Error:', error);
                return;
            }

            if (!data) {
                console.warn('No profile found for authenticated user ID:', userId);
                // Attempt to fallback to session metadata if profile is missing
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                if (user) {
                    const fallbackProfile: Employee = {
                        id: user.id,
                        name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
                        position: user.user_metadata?.position || 'Regular Member',
                        unit: user.user_metadata?.unit || 'Planning & Design',
                        user_type: user.user_metadata?.user_type || 'User',
                        email: user.email,
                        created_at: new Date().toISOString()
                    };
                    setProfile(fallbackProfile);
                }
                return;
            }

            setProfile(data as Employee);
            
            // Sync with legacy localStorage for compatibility during transition
            const userData = {
                email: data.email,
                name: data.name,
                role: data.position,
                user_type: data.user_type,
                route: getRedirectRoute(data.position)
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));

        } catch (error: any) {
            console.error('Profile fetch unexpected error:', error?.message || error);
        }
    };

    const getRedirectRoute = (role: string) => {
        switch (role) {
            case 'Admin': return '/dashboard/team';
            case 'Section Chief': return '/dashboard/modules';
            case 'Unit Head': return '/dashboard/unit-head-task';
            case 'Planning Unit Head': return '/dashboard/rbp-progress';
            case 'Planning Engineer': return '/dashboard/planning-member-task';
            case 'Regular Member':
            case 'Unit Member':
            default: return '/dashboard/user-task';
        }
    };

    const signOut = async () => {
        try {
            // Aggressively clear any Supabase session tokens from localStorage 
            // to prevent ghost sessions on reloads (Fixes local logout issue)
            if (typeof window !== 'undefined') {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') && key.endsWith('-auth-token') || key === 'currentUser')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            if (typeof window !== 'undefined') {
                // 1. Vaporize all local databases completely
                localStorage.clear();
                sessionStorage.clear();
                
                // 2. Kill all cookies by forcefully expiring them
                const cookies = document.cookie.split(";");
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i];
                    const eqPos = cookie.indexOf("=");
                    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                }
            }

            // Clear all React states manually
            setSession(null);
            setUser(null);
            setProfile(null);
            
            // 3. Cache-busting hard redirect
            window.location.href = `/login?logged_out=${new Date().getTime()}`;
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
