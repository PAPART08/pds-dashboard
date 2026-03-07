'use client';

import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <div className={styles.mainWrapper}>

                {/* Header: Premium Glass Panel */}
                <header className={styles.header}>
                    <div className={styles.headerTitleBox}>
                        <h2 className={styles.headerTitle}>
                            Planning & Design <span className={styles.headerTitleHighlight}>Portal</span>
                        </h2>
                        <div className={styles.headerSubtitleBox}>
                            <span className={styles.headerDot}></span>
                            <span className={styles.headerSubtitle}>District Engineering Office • Active Session</span>
                        </div>
                    </div>

                    <div className={styles.headerRight}>
                        <div className={styles.cycleBadge}>
                            <span className={styles.cycleText}>FY 2025 Budget Cycle</span>
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
