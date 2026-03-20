"use client";

import React, { useState } from 'react';
import styles from './ReportsHub.module.css';
import MasterListReport from './MasterListReport';
import CustomReportBuilder from './CustomReportBuilder';

interface ReportsHubProps {
  phase: string;
}

export default function ReportsHub({ phase }: ReportsHubProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const availableReports = [
    {
      id: 'master-list',
      title: 'Master List Report',
      description: 'Comprehensive view of all active projects grouped by Category and Thrust.',
      icon: 'format_list_bulleted'
    },
    {
      id: 'custom-report',
      title: 'Customizable Data Report',
      description: 'Build your own report by selecting specific columns and filters.',
      icon: 'tune'
    }
  ];

  const handleOpenReport = (id: string) => {
    setSelectedReport(id);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  const renderSelectedReport = () => {
    if (selectedReport === 'master-list') return <MasterListReport phase={phase} />;
    if (selectedReport === 'custom-report') return <CustomReportBuilder phase={phase} />;
    return null;
  };

  if (selectedReport) {
    return (
      <div className={styles.reportViewWrapper}>
        <div className={styles.reportViewHeader}>
          <button onClick={handleCloseReport} className={styles.backBtn}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Reports Hub
          </button>
        </div>
        {renderSelectedReport()}
      </div>
    );
  }

  return (
    <div className={styles.hubContainer}>
      <div className={styles.hubHeader}>
        <h1>{phase} Reports Center</h1>
        <p>Select a report type to generate, view, and print.</p>
      </div>

      <div className={styles.cardsGrid}>
        {availableReports.map(report => (
          <div key={report.id} className={styles.reportCard} onClick={() => handleOpenReport(report.id)}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}>
                <span className="material-symbols-outlined">{report.icon}</span>
              </div>
              <h2>{report.title}</h2>
            </div>
            <p className={styles.cardBody}>{report.description}</p>
            <div className={styles.cardFooter}>
              <span>Generate Report</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
