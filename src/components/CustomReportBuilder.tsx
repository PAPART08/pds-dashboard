"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './MasterListReport.module.css'; // Reusing similar styles

interface CustomReportBuilderProps {
  phase: string;
}

export default function CustomReportBuilder({ phase }: CustomReportBuilderProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Customization options
  const [columns, setColumns] = useState({
    uacs: true,
    title: true,
    location: true,
    amount: true,
    status: true,
    category: false,
    thrust: false,
    operatingUnit: false,
  });

  const [filters, setFilters] = useState({
    status: 'All',
    limitThrust: 'All',
  });

  const [uniqueStatuses, setUniqueStatuses] = useState<string[]>([]);
  const [uniqueThrusts, setUniqueThrusts] = useState<string[]>([]);

  useEffect(() => {
    fetchBaseData();
  }, [phase]);

  const fetchBaseData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('phase', phase)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProjects(data);
        const statuses = Array.from(new Set(data.map(p => p.status))).filter(Boolean) as string[];
        const thrusts = Array.from(new Set(data.map(p => p.thrust))).filter(Boolean) as string[];
        
        setUniqueStatuses(['All', ...statuses]);
        setUniqueThrusts(['All', ...thrusts]);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleColumn = (col: keyof typeof columns) => {
    setColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const filteredProjects = projects.filter(p => {
    const matchStatus = filters.status === 'All' || p.status === filters.status;
    const matchThrust = filters.limitThrust === 'All' || p.thrust === filters.limitThrust;
    return matchStatus && matchThrust;
  });

  const handlePrint = async () => {
    const element = document.getElementById('custom-report-content');
    if (!element) return;

    element.style.padding = '0';
    element.style.maxWidth = 'none';

    // Dynamically import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    const opt = {
      margin: [10, 5, 10, 5] as [number, number, number, number],
      filename: `Custom_Report_${phase}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        windowWidth: 900,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    await html2pdf().set(opt).from(element).save();
    
    // Restore styling
    element.style.padding = '';
    element.style.maxWidth = '';
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '2rem' }}>sync</span>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className={styles.reportContainerWrapper}>
      {/* Controls Section - Hidden when printing via CSS */}
      <div className="report-controls" style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Report Customization Builder</h3>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
             <span className="material-symbols-outlined">download</span>
             Download / Print Report
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Include Columns</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {Object.entries(columns).map(([key, value]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={value} 
                    onChange={() => handleToggleColumn(key as keyof typeof columns)}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Filters</h4>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Status</label>
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Thrust / Program</label>
                <select 
                  value={filters.limitThrust} 
                  onChange={(e) => setFilters(prev => ({ ...prev, limitThrust: e.target.value }))}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {uniqueThrusts.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="custom-report-content" className={styles.reportPaper}>
        <div className={styles.reportHeader}>
          <h1>CUSTOMIZED PROJECT REPORT</h1>
          <h2>Phase: {phase} | Filtered by {filters.status === 'All' ? 'All Statuses' : filters.status}</h2>
          <p style={{ marginTop: '8px', color: '#666', fontStyle: 'italic' }}>Total Projects: {filteredProjects.length}</p>
        </div>

        {filteredProjects.length > 0 ? (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                {columns.uacs && <th>UACS / ID</th>}
                {columns.title && <th>Project Title</th>}
                {columns.category && <th>Category</th>}
                {columns.thrust && <th>Program / Thrust</th>}
                {columns.location && <th>Location</th>}
                {columns.operatingUnit && <th>Operating Unit</th>}
                {columns.amount && <th style={{ textAlign: 'right' }}>Amount (PHP)</th>}
                {columns.status && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p, idx) => (
                <tr key={p.id}>
                  {columns.uacs && <td>{p.alternate_id || p.id.substring(0,8)}</td>}
                  {columns.title && <td>{p.project_name || 'Untitled'}</td>}
                  {columns.category && <td>{p.project_category || '-'}</td>}
                  {columns.thrust && <td>{p.thrust || '-'}</td>}
                  {columns.location && <td>{p.city_municipality || '-'}</td>}
                  {columns.operatingUnit && <td>{p.operating_unit || '-'}</td>}
                  {columns.amount && <td style={{ textAlign: 'right' }}>₱{(p.project_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                  {columns.status && <td>{p.status}</td>}
                </tr>
              ))}
              <tr>
                <td colSpan={10} style={{ borderTop: '2px solid #000', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 'bold' }}>
                    {columns.amount && (
                      <span style={{ marginRight: '16px' }}>
                        Grand Total: ₱{filteredProjects.reduce((sum, p) => sum + (p.project_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>No projects match the selected filters.</div>
        )}
      </div>

      <style jsx>{`
        /* Hide controls when printing */
        @media print {
          .report-controls {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
