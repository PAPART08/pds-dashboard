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
    const fetchPromiseTracker = React.useRef<Map<string, Promise<void>>>(new Map());
    const router = useRouter();

    useEffect(() => {
        let mounted = true;

        const handleAuthStateChange = async (currentSession: Session | null) => {
            if (!mounted) return;

            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);
            setSession(currentSession);

            if (currentUser) {
                console.log('[AuthContext] User detected:', currentUser.email);
                
                // Fast metadata sync - prevents Guest flashes if metadata is populated
                if (currentUser.user_metadata?.position) {
                    setProfile(prev => ({
                        ...(prev || {}),
                        id: currentUser.id,
                        name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User',
                        position: currentUser.user_metadata?.position,
                        unit: currentUser.user_metadata?.unit || 'Planning & Design',
                        user_type: currentUser.user_metadata?.user_type || 'User',
                        email: currentUser.email || '',
                        created_at: prev?.created_at || new Date().toISOString()
                    } as Employee));
                    
                    // If we have metadata, we can release the loading state immediately
                    // The DB fetch will update the profile details in the background
                    if (mounted) setLoading(false);
                }

                // Definitive DB fetch - do NOT await if we already released the loading state
                const fetchTask = fetchProfile(currentUser);
                if (loading) {
                    await fetchTask;
                }
            } else {
                setProfile(null);
                fetchPromiseTracker.current.clear();
                localStorage.removeItem('currentUser');
            }

            if (mounted) {
                setLoading(false);
            }
        };

        // Listen for all auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('[AuthContext] Event:', event);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
                await handleAuthStateChange(currentSession);
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfile(null);
                fetchPromiseTracker.current.clear();
                localStorage.removeItem('currentUser');
                if (mounted) setLoading(false);
            }
        });

        // Initialize session on mount
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            handleAuthStateChange(currentSession);
        });

        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[AuthContext] Safety timeout hit at 15s. Releasing UI.');
                setLoading(false);
            }
        }, 15000); // Increased to 15s

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (currentUserItem: User) => {
        const userId = currentUserItem?.id;
        if (!userId) return;

        if (fetchPromiseTracker.current.has(userId)) {
            console.log('[AuthContext] Fetch already in progress/completed for:', userId);
            await fetchPromiseTracker.current.get(userId);
            return;
        }

        const fetchPromise = (async () => {
            console.log('[AuthContext] Fetching DB profile for:', userId);
            try {
                const fetchQuery = supabase
                    .from('employees')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                const { data, error } = await Promise.race([
                    fetchQuery,
                    new Promise<{data: any, error: any}>((resolve) => 
                        setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout', isTimeout: true } }), 8000)
                    )
                ]);

                if (error || !data) {
                    if (error && !(error as any).isTimeout) {
                        console.error('[AuthContext] DB Error:', error.message);
                    } else if (error && (error as any).isTimeout) {
                        console.warn('[AuthContext] DB Fetch timed out. Using metadata/cache fallback.');
                    } else {
                        console.warn('[AuthContext] No DB record found.');
                    }
                    
                    // CRITICAL FALLBACK: If DB fails or times out, use metadata to at least let the user into the app
                    // Only update if current profile is null or position is empty/Guest
                    setProfile(prev => {
                        // If we already have a valid position (e.g. from previous successful fetch or metadata sync), keep it
                        if (prev && prev.position && prev.position !== 'Guest') return prev;
                        
                        const metadata = currentUserItem?.user_metadata || {};
                        return {
                            id: userId,
                            name: metadata.full_name || metadata.name || metadata.displayName || 'User',
                            position: metadata.position || 'Guest',
                            unit: metadata.unit || 'Planning & Design',
                            user_type: metadata.user_type || 'User',
                            email: currentUserItem?.email || '',
                            created_at: new Date().toISOString()
                        } as Employee;
                    });
                    return;
                }

                console.log('[AuthContext] Profile Loaded:', data.name, '(', data.position, ')');
                setProfile(data as Employee);
                
                localStorage.setItem('currentUser', JSON.stringify({
                    email: data.email,
                    name: data.name,
                    role: data.position,
                    user_type: data.user_type
                }));

            } catch (err: any) {
                console.error('[AuthContext] Unexpected fetch error:', err);
                fetchPromiseTracker.current.delete(userId);
            }
        })();

        fetchPromiseTracker.current.set(userId, fetchPromise);
        await fetchPromise;
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
