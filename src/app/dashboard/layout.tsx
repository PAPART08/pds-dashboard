'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { profile, loading, session } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    useEffect(() => {
        if (isMounted && !loading && (!session || !profile)) {
            // Only redirect if absolutely sure there is no session and no profile found
            if (!session) {
                router.push('/login');
            }
        }
    }, [isMounted, loading, session, profile, router]);

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
                                {initials}
                            </div>
                            <div className="hidden md:flex flex-col items-end">
                                <span className={styles.userNameHeader}>
                                    {currentUser.name || 'User'}
                                </span>
                                <span className={styles.userRoleHeader}>
                                    {currentUser.role || 'Guest'}
                                </span>
                            </div>
                        </div>
                        <div className={styles.notificationBox}>
                            <span className={`material-symbols-outlined ${styles.notificationIcon}`}>notifications</span>
                            <span className={styles.notificationDot}></span>
                        </div>
                    </div>
                </header>

                <main className={`${styles.mainContent} ${styles.customScrollbar}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}
