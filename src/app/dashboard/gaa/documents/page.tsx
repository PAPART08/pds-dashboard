"use client";

import React, { useState } from 'react';
import styles from '../../rbp/master-list/page.module.css';

export default function GAADocuments() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.headerTitle} style={{color: 'var(--dpwh-orange)'}}>GAA Document Tracking</h1>
          <p className={styles.headerSubtitle}>Manage and track required final release documents for GAA-enacted projects.</p>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className={styles.toolbar}>
           <div className={styles.searchBox}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search GAA Projects for final documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className={styles.tableWrapper} style={{minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>handshake</span>
            <h3 style={{color: 'white', marginBottom: '0.5rem'}}>GAA Release Tracking coming soon</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '500px' }}>
              The GAA phase allows attaching final approved budgets and implementation notices, retaining full visibility on what was originally requested during NEP and RBP.
            </p>
        </div>
      </div>
    </div>
  );
}
