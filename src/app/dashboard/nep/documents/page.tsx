"use client";

import React, { useState } from 'react';
import styles from '../projects/page.module.css';

export default function NEPDocuments() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.headerTitle} style={{color: 'var(--dpwh-green, #10b981)'}}>NEP Document Tracking</h1>
          <p className={styles.headerSubtitle}>Manage and track required documents (POW, DUPA, ABC, DED) for projects in the NEP phase.</p>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className={styles.toolbar}>
           <div className={styles.searchBox}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search NEP Projects for documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className={styles.tableWrapper} style={{minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>construction</span>
            <h3 style={{color: 'white', marginBottom: '0.5rem'}}>Document Tracking system coming soon</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '500px' }}>
              The NEP document tracking module will allow uploading new POW, DUPA, and ABC documents, while providing a reference view to the original RBP documents.
            </p>
        </div>
      </div>
    </div>
  );
}
