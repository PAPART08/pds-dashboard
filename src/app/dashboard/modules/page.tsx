'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './modules.module.css';

export default function ModuleSelection() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const router = useRouter();
    const { session, loading } = useAuth();

    useEffect(() => {
        // Auth Check
        if (!loading) {
            if (!session) {
                router.push('/login');
                return;
            }
            setIsCheckingAuth(false);
        }

        // Dark Mode Check
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            setIsDarkMode(true);
        } else {
            document.documentElement.classList.remove('dark');
            setIsDarkMode(false);
        }
    }, [router]);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setIsDarkMode(true);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="font-medium text-slate-500 animate-pulse uppercase tracking-[0.2em] text-xs">Verifying Session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mesh-gradient min-h-screen relative">
            <div className={styles.container}>

                <header className={`${styles.header} animate-fade-in`}>
                    <div className={styles.headerTop}>
                        <div className={styles.logoBox}>
                            <span className={`material-symbols-outlined ${styles.logoIcon}`}>engineering</span>
                        </div>
                        <div>
                            <h1 className={styles.title}>
                                DPWH <span className={styles.titleHighlight}>Task Management</span>
                            </h1>
                        </div>
                    </div>
                    <p className={styles.subtitle}>
                        Streamlining the workflow between the Regional Budget Proposal (RBP) and General Appropriations Act (GAA) stages for the District Engineering Office.
                    </p>
                </header>

                <div className={`${styles.grid} animate-slide-up`}>

                    <div className={`glass-card ${styles.card} ${styles.cardRBP}`}>
                        <div className={styles.glowRBP}></div>
                        <div className={styles.cardContent}>
                            <div className={styles.iconBoxRBP}>
                                <span className="material-symbols-outlined text-3xl" style={{ fontSize: '1.875rem' }}>account_balance_wallet</span>
                            </div>
                            <h2 className={styles.cardTitle}>
                                RBP Stage Module
                            </h2>
                            <p className={styles.cardText}>
                                Manage budget proposals, encode project details, and track supporting documents through the technical review queue. Efficiently transition from initial concept to regional approval.
                            </p>
                            <Link className={styles.btnRBP} href="/dashboard/rbp">
                                <span>Access RBP Stage</span>
                                <span className={`material-symbols-outlined ${styles.btnIcon}`}>arrow_forward</span>
                            </Link>
                        </div>
                    </div>

                    <div className={`glass-card ${styles.card} ${styles.cardGAA}`}>
                        <div className={styles.glowGAA}></div>
                        <div className={styles.cardContent}>
                            <div className={styles.iconBoxGAA}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.875rem' }}>analytics</span>
                            </div>
                            <h2 className={styles.cardTitle}>
                                GAA Stage Module
                            </h2>
                            <p className={styles.cardText}>
                                Track funded projects transitioning from the RBP stage. Monitor physical targets, financial targets, and timelines. Ensure project delivery aligns with the General Appropriations Act.
                            </p>
                            <Link className={styles.btnGAA} href="/dashboard/gaa">
                                <span>Access GAA Stage</span>
                                <span className={`material-symbols-outlined ${styles.btnIcon}`}>arrow_forward</span>
                            </Link>
                        </div>
                    </div>

                </div>

                <footer className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <div className={styles.statusItem}>
                            <span className={styles.pulse}></span>
                            <span>System Online</span>
                        </div>
                        <div className={styles.statusItem}>
                            <span className={`material-symbols-outlined ${styles.secureIcon}`}>verified_user</span>
                            <span>Secure Access</span>
                        </div>
                    </div>
                    <div className={styles.footerRight}>
                        <button
                            className={styles.themeToggle}
                            onClick={toggleDarkMode}
                        >
                            {isDarkMode ? (
                                <span className="material-symbols-outlined block" style={{ color: '#F59E0B' }}>light_mode</span>
                            ) : (
                                <span className="material-symbols-outlined block" style={{ color: '#0C3E7C' }}>dark_mode</span>
                            )}
                        </button>
                        <div className={styles.versionBadge}>
                            v2.4.0-release
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
