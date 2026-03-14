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
        let mounted = true;

        const handleAuthStateChange = async (currentSession: Session | null) => {
            if (!mounted) return;

            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                // Initialize with metadata fallback (fast) to prevent null check failures
                // but keep 'loading' true while we fetch definitive DB data.
                const tempProfile: Employee = {
                    id: currentUser.id,
                    name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User',
                    position: currentUser.user_metadata?.position, 
                    unit: currentUser.user_metadata?.unit || 'Planning & Design',
                    user_type: currentUser.user_metadata?.user_type || 'User',
                    email: currentUser.email || '',
                    created_at: new Date().toISOString()
                };
                setProfile(tempProfile);

                // Fetch real profile from DB (definitive)
                // We keep 'loading' true during this fetch to avoid 'Guest' flashes
                await fetchProfile(currentUser.id);
            } else {
                setProfile(null);
                localStorage.removeItem('currentUser');
            }

            if (mounted) {
                setLoading(false);
            }
        };

        const initializeAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                await handleAuthStateChange(currentSession);
            } catch (error) {
                console.error('Error fetching initial session:', error);
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Auth check timed out. Forcing loading to false.');
                setLoading(false);
            }
        }, 5000); // Reduced timeout to 5s for better UX

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('Auth event:', event, 'User:', currentSession?.user?.id);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await handleAuthStateChange(currentSession);
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfile(null);
                localStorage.removeItem('currentUser');
                if (mounted) setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
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
                console.warn('No profile found in employees table for ID:', userId);
                // Fallback to basic session info if DB profile is missing
                if (user) {
                    const fallbackProfile: Employee = {
                        id: user.id,
                        name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
                        position: user.user_metadata?.position || 'Regular Member', // Keep default here as absolute final fallback
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
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear React states
            setSession(null);
            setUser(null);
            setProfile(null);
            
            // Hard redirect to login page to clear any in-memory state
            window.location.href = '/login';
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
