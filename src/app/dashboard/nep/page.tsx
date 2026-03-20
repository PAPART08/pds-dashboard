"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../rbp/page.module.css'; // Reusing RBP styles for consistency

export default function NEPDashboard() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalBudget: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNEPStats() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('project_amount')
          .eq('phase', 'NEP');

        if (error) throw error;

        const totalProjects = data.length;
        const totalBudget = data.reduce((sum, p) => sum + (Number(p.project_amount) || 0), 0);

        setStats({ totalProjects, totalBudget });
      } catch (err) {
        console.error('Error fetching NEP stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNEPStats();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>NEP Overview Dashboard</h1>
          <p className={styles.pageSubtitle}>National Expenditure Program phase analytics and project tracking.</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingState}>
          <span className="material-symbols-outlined className={styles.spinner}">sync</span>
          <p>Loading NEP dashboard data...</p>
        </div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--dpwh-green, #10b981)' }}>
              <span className="material-symbols-outlined">folder_shared</span>
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total NEP Projects</p>
              <h3 className={styles.statValue}>{stats.totalProjects}</h3>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--dpwh-green, #10b981)' }}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total NEP Allocation</p>
              <h3 className={styles.statValue}>
                ₱{(stats.totalBudget / 1000000).toFixed(2)}M
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
