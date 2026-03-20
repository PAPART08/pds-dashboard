'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import NotificationCenter from '@/components/NotificationCenter';
import ChatDrawer from '@/components/chat/ChatDrawer';
import styles from './layout.module.css';
import { useAuth } from '@/context/AuthContext';
import { Activity, X } from 'lucide-react';
import { ActivityFeed } from '@/components/team-activity/ActivityFeed';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { profile, loading, session } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    useEffect(() => {
        if (isMounted && !loading) {
            if (!session) {
                console.log('[DashboardLayout] No session, redirecting to login');
                router.push('/login');
            }
        }
    }, [isMounted, loading, session, router]);

    // Don't render dashboard content or redirect until mounted to prevent hydration errors
    if (!isMounted || loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!session) return null;
    
    const currentUser = {
        name: profile?.name,
        role: profile?.position
    };

    const initials = currentUser.name
        ? currentUser.name.split(' ').map((n: string) => n[0]).join('')
        : 'U';

    const canViewActivity = profile && ['Admin', 'Section Chief', 'Unit Head', 'Planning Unit Head'].includes(profile.position);

    return (
        <div className={styles.layout}>
            <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
            <div className={`${styles.mainWrapper} ${isSidebarCollapsed ? styles.mainWrapperCollapsed : ''}`}>

                {/* Header: Premium Glass Panel */}
                <header className={styles.header}>
                    <div className="flex items-center gap-4">
                        <div className={styles.logoIconBox}>
                            <span className={`material-symbols-outlined ${styles.logoIcon}`}>engineering</span>
                        </div>
                        <div className={styles.headerTitleBox}>
                            <h2 className={styles.headerTitle}>
                                PLANNING & DESIGN <span className={styles.headerTitleHighlight}>PORTAL</span>
                            </h2>
                            <div className={styles.headerSubtitleBox}>
                                <span className={styles.headerDot}></span>
                                <span className={styles.headerSubtitle}>District Engineering Office • Active Session</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.headerRight}>
                        <div className={styles.userProfileHeader}>
                            <div className={styles.headerAvatar}>
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-md" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="hidden md:flex flex-col items-end">
                                <span className={styles.userNameHeader}>
                                    {currentUser.name || 'User'}
                                </span>
                                <span className={styles.userRoleHeader}>
                                    {currentUser.role || 'Loading...'}
                                </span>
                            </div>
                        </div>
                        
                        {canViewActivity && (
                            <button 
                                onClick={() => setIsActivityOpen(true)}
                                title="Team Activity Log"
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            >
                                <Activity className="w-5 h-5" />
                            </button>
                        )}
                        <NotificationCenter />
                    </div>
                </header>

                <main className={`${styles.mainContent} ${styles.customScrollbar}`}>
                    {children}
                </main>
                
                {/* Global Side Drawer Overlay */}
                {canViewActivity && (
                    <>
                        {/* Backdrop */}
                        {isActivityOpen && (
                            <div 
                                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
                                onClick={() => setIsActivityOpen(false)}
                            />
                        )}
                        
                        {/* Drawer Panel */}
                        <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-[450px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isActivityOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-blue-500" />
                                        Team Activity
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">Real-time audit log of system actions.</p>
                                </div>
                                <button 
                                    onClick={() => setIsActivityOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-0 bg-slate-50 dark:bg-slate-950/50">
                                <ActivityFeed global={true} hideHeader={true} />
                            </div>
                        </div>
                    </>
                )}
                
                {/* Global Chat Drawer */}
                <ChatDrawer />
            </div>
        </div>
    );
}
