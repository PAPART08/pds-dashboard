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
        const setData = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
                // Clear legacy localStorage for compatibility
                localStorage.removeItem('currentUser');
            }
            setLoading(false);
        });

        setData();

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
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear all states manually to be safe and ensure UI updates
            setSession(null);
            setUser(null);
            setProfile(null);
            localStorage.removeItem('currentUser');
            router.push('/login');
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
