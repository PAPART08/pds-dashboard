"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../rbp/page.module.css'; // Reusing RBP styles for consistency

export default function GAADashboard() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalBudget: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGAAStats() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('project_amount')
          .eq('phase', 'GAA');

        if (error) throw error;

        const totalProjects = data.length;
        const totalBudget = data.reduce((sum, p) => sum + (Number(p.project_amount) || 0), 0);

        setStats({ totalProjects, totalBudget });
      } catch (err) {
        console.error('Error fetching GAA stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGAAStats();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>GAA Overview Dashboard</h1>
          <p className={styles.pageSubtitle}>General Appropriations Act phase analytics and project tracking.</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingState}>
          <span className="material-symbols-outlined className={styles.spinner}">sync</span>
          <p>Loading GAA dashboard data...</p>
        </div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--dpwh-orange, #f97316)' }}>
              <span className="material-symbols-outlined">folder_shared</span>
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total GAA Projects</p>
              <h3 className={styles.statValue}>{stats.totalProjects}</h3>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--dpwh-orange, #f97316)' }}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total GAA Allocation</p>
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
