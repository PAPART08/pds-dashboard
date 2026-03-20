"use client";

import React, { useEffect } from 'react';
import styles from './ReportViewerModal.module.css';

interface ReportViewerModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

export default function ReportViewerModal({ onClose, children }: ReportViewerModalProps) {
  useEffect(() => {
    // Prevent scrolling on the body while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Report Viewer</h2>
          <div className={styles.modalActions}>
            <button className={styles.printBtn} onClick={handlePrint}>
              <span className="material-symbols-outlined">print</span>
              Print / Save PDF
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}
