"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './MasterListReport.module.css';

const sortCategories = (a: [string, any], b: [string, any]) => {
  const normalize = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('oo1')) return 1;
    if (c.includes('oo2')) return 2;
    if (c.includes('cssp') || c.includes('convergence')) return 3;
    if (c.includes('local') || c.includes('basic')) return 4;
    return 5;
  };
  return normalize(a[0]) - normalize(b[0]);
};

const getCategoryName = (cat: string) => {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('oo1')) return 'OO1: Ensure Safe And Reliable National Road System';
  if (lower.includes('oo2')) return 'OO2: Protect Lives And Properties Against Major Floods';
  if (lower.includes('cssp') || lower.includes('convergence') || lower.includes('special support')) return 'Convergence And Special Support Program (CSSP)';
  if (lower.includes('local') || lower.includes('basic')) return 'Local Program';
  
  // fallback for others
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

interface MasterListReportProps {
  phase: string;
}

export default function MasterListReport({ phase }: MasterListReportProps) {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [phase]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch valid projects for this phase
      let query = supabase
        .from('projects')
        .select('*')
        .eq('phase', phase)
        .eq('is_included_in_master_list', true)
        .order('created_at', { ascending: false });

      const { data: projects, error: pError } = await query;
      if (pError) throw pError;

      if (!projects || projects.length === 0) {
        setReportData([]);
        setIsLoading(false);
        return;
      }

      const projectIds = projects.map((p) => p.id);

      // 2. Fetch components
      const { data: components, error: cError } = await supabase
        .from('project_components')
        .select('*')
        .in('project_id', projectIds);

      if (cError) throw cError;

      // Group projects
      // The hierarchy requested: Region -> DEO -> Category -> Thrust -> Project -> Components
      // Subtotals need to be calculated at DEO, Category, and Thrust levels.
      const grouped: Record<string, any> = {};

      projects.forEach((proj) => {
        const region = proj.reporting_region || 'Unspecified Region';
        const deo = proj.district_engineering_office || 'Unspecified DEO';
        const category = proj.project_category || 'Unspecified Category';
        const thrust = proj.thrust || 'Unspecified Program';

        if (!grouped[region]) grouped[region] = { deos: {}, total: 0, count: 0 };
        if (!grouped[region].deos[deo]) grouped[region].deos[deo] = { categories: {}, total: 0, count: 0 };
        if (!grouped[region].deos[deo].categories[category]) grouped[region].deos[deo].categories[category] = { thrusts: {}, total: 0, count: 0 };
        if (!grouped[region].deos[deo].categories[category].thrusts[thrust]) grouped[region].deos[deo].categories[category].thrusts[thrust] = { projects: [], total: 0, count: 0 };

        const projComps = (components || []).filter((c) => c.project_id === proj.id);
        const projItem = { ...proj, components: projComps };
        
        const projAmount = projItemsAmount(projItem);
        
        grouped[region].deos[deo].categories[category].thrusts[thrust].projects.push(projItem);
        grouped[region].deos[deo].categories[category].thrusts[thrust].total += projAmount;
        grouped[region].deos[deo].categories[category].thrusts[thrust].count += 1;
        grouped[region].deos[deo].categories[category].total += projAmount;
        grouped[region].deos[deo].categories[category].count += 1;
        grouped[region].deos[deo].total += projAmount;
        grouped[region].deos[deo].count += 1;
        grouped[region].total += projAmount;
        grouped[region].count += 1;
      });

      setReportData([grouped]);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const projItemsAmount = (proj: any) => {
     let sum = 0;
     if (proj.components && proj.components.length > 0) {
        sum = proj.components.reduce((acc: number, c: any) => acc + (c.comp_amount || 0), 0);
     } else {
        sum = proj.project_amount || 0;
     }
     return sum;
  };

  const handleDownload = async () => {
    const wrapper = document.getElementById('report-container-wrapper');
    const element = document.getElementById('master-list-report-content');
    if (!element || !wrapper) return;

    // Trigger downloading state class to strip web-only CSS min-heights and margins
    wrapper.classList.add(styles.isDownloading);
    element.style.backgroundImage = 'none';

    // Small delay to ensure CSS applies before canvas screenshot
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const html2pdf = (await import('html2pdf.js')).default;
    const currentYear = new Date().getFullYear() + 1;
    const opt = {
      margin: 10, // Let jsPDF handle 10mm margins natively to prevent DOM overflows
      filename: `FY${currentYear}_Master_List_Report.pdf`,
      image: { type: 'jpeg' as const, quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1200 },
      jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: 'css' }, // Strip 'avoid-all' to eliminate plugin ghost pages
    };

    await html2pdf().set(opt).from(element).save();
    
    // Restore state
    element.style.backgroundImage = '';
    wrapper.classList.remove(styles.isDownloading);
  };

  const currentYear = new Date().getFullYear() + 1; // FY usually next year
  const phaseLabel = phase === 'NEP' ? 'National Expenditure Program' : phase === 'GAA' ? 'General Appropriations Act' : 'Regional Budget Proposal';

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '2rem' }}>sync</span>
          <p>Loading Master List Report...</p>
        </div>
      );
    }

    if (reportData.length === 0 || !reportData[0]) {
      return (
        <div className={styles.reportPaper}>
          <div className={styles.reportHeader}>
            <h1>FY {currentYear} ANNUAL INFRASTRUCTURE PROGRAM</h1>
            <h2>Based on {phaseLabel}</h2>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem' }}>No approved projects found.</div>
        </div>
      );
    }

    // Flatten hierarchy
    const flatRows: any[] = [];
    Object.entries(reportData[0]).forEach(([region, regionData]: any) => {
      Object.entries(regionData.deos).forEach(([deo, deoData]: any) => {
        flatRows.push({ type: 'deo', data: deo, count: deoData.count, total: deoData.total });
        Object.entries(deoData.categories).sort(sortCategories).forEach(([cat, catData]: any) => {
          flatRows.push({ type: 'cat', data: getCategoryName(cat), count: catData.count, total: catData.total });
          Object.entries(catData.thrusts).forEach(([thrust, thrustData]: any) => {
            flatRows.push({ type: 'thrust', data: thrust, total: thrustData.total });
            thrustData.projects.forEach((proj: any, idx: number) => {
              flatRows.push({ type: 'proj', data: proj, index: idx });
              if (proj.components && proj.components.length > 0) {
                proj.components.forEach((comp: any) => {
                  flatRows.push({ type: 'comp', data: comp, projOu: proj.operating_unit, projOffice: proj.implementing_office });
                });
              } else {
                flatRows.push({ type: 'empty-comp' });
              }
            });
          });
        });
      });
    });

    // Chunk into pages 
    const MAX_PAGE_HEIGHT = 780; // Conservative pixels per A4 body (account for header + margins)
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;

    for (const row of flatRows) {
      // Dynamic height estimation based on exact character lengths wrapping on 7.5pt fonts!
      let h = 35;
      if (row.type === 'comp') {
        const descLines = Math.ceil((row.data.infra_name?.length || 0) / 45); // column roughly fits 45 chars
        const workLines = Math.ceil((row.data.type_of_work?.length || 0) / 25); // column 25 chars
        const officeLines = Math.ceil(((row.projOu?.length || 0) + (row.projOffice?.length || 0)) / 25);
        const maxLines = Math.max(1, descLines, workLines, officeLines);
        h = Math.max(35, maxLines * 14 + 10); // 14px per line + padding
      } else if (row.type === 'proj') {
        const titleLines = Math.ceil((row.data.project_name?.length || 0) / 80);
        h = Math.max(50, titleLines * 16 + 20);
      } else {
        h = 45; // DEO, Category, Thrust rows
      }
      
      // Orphan control: If we are near the bottom and about to start a new Project or Header, jump to next page
      const needsMoreSpace = (row.type === 'proj' || row.type === 'cat' || row.type === 'deo') && (MAX_PAGE_HEIGHT - currentHeight < 120);
      
      if ((currentHeight + h > MAX_PAGE_HEIGHT || needsMoreSpace) && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      currentPage.push(row);
      currentHeight += h;
    }
    if (currentPage.length > 0) pages.push(currentPage);

    const renderRow = (row: any, i: number) => {
      if (row.type === 'deo') {
        return (
          <tr key={`deo-${i}`}>
            <td colSpan={3} className={styles.deoRow}>{row.data}</td>
            <td className={styles.deoRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>{row.count || 0}</td>
            <td className={styles.deoRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>projects</td>
            <td className={styles.deoRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>{(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
            <td className={styles.deoRow}></td>
          </tr>
        );
      }
      if (row.type === 'cat') {
        return (
          <tr key={`cat-${i}`}>
            <td colSpan={3} className={styles.categoryRow}>{row.data}</td>
            <td className={styles.categoryRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>{row.count || 0}</td>
            <td className={styles.categoryRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>projects</td>
            <td className={styles.categoryRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>{(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
            <td className={styles.categoryRow}></td>
          </tr>
        );
      }
      if (row.type === 'thrust') {
        return (
          <tr key={`thrust-${i}`}>
            <td colSpan={3} className={styles.thrustRow}>{row.data}</td>
            <td className={styles.thrustRow} style={{ whiteSpace: 'nowrap', textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline' }}></td>
            <td className={styles.thrustRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}></td>
            <td className={styles.thrustRow} style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' }}>{(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
            <td className={styles.thrustRow}></td>
          </tr>
        );
      }
      if (row.type === 'proj') {
        return (
          <tr key={`proj-${row.data.id}-${i}`} className={styles.projectTitleRow}>
            <td colSpan={5}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{row.index + 1}. {row.data.alternate_id || 'UACS PENDING'}</span>
                <span style={{ fontWeight: 'bold', marginTop: '4px' }}>{row.data.project_name || 'Untitled Project'}</span>
              </div>
            </td>
            <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', paddingTop: '16px', textDecoration: 'underline' }}>
              {(row.data.project_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </td>
            <td style={{ textAlign: 'right' }}></td>
          </tr>
        );
      }
      if (row.type === 'comp') {
        return (
          <tr key={`comp-${row.data.id}-${i}`} className={styles.componentRow}>
            <td className={styles.idCell}>{row.data.comp_id_display || row.data.alternate_id || 'NEW'}</td>
            <td>{row.data.infra_name || '-'}</td>
            <td>{row.data.type_of_work || '-'}</td>
            <td style={{ textAlign: 'center' }}>{row.data.target_unit || '-'}</td>
            <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{row.data.physical_target ? parseFloat(row.data.physical_target.toString()).toLocaleString() : '-'}</td>
            <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{(row.data.comp_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
            <td style={{ textAlign: 'right' }}>{row.projOu || '-'} <br/> {row.projOffice || '-'}</td>
          </tr>
        );
      }
      if (row.type === 'empty-comp') {
        return (
          <tr key={`empty-${i}`} className={styles.componentRow}>
            <td colSpan={7} style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>No components logged.</td>
          </tr>
        );
      }
      return null;
    };

    const HeaderLayout = () => (
      <>
        <tr>
          <th colSpan={7} style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <div className={styles.reportHeader}>
              <h1>FY {currentYear} ANNUAL INFRASTRUCTURE PROGRAM</h1>
              <h2>Based on {phaseLabel}</h2>
            </div>
          </th>
        </tr>
        <tr>
          <th style={{ width: '15%' }}>UACS / Sub Program<br/>Project Component ID</th>
          <th style={{ width: '25%' }}>Project Component Description</th>
          <th style={{ width: '15%' }}>Type of Work</th>
          <th style={{ width: '8%', textAlign: 'center' }}>Target Unit</th>
          <th style={{ width: '10%', textAlign: 'right' }}>Physical Target</th>
          <th style={{ width: '12%', textAlign: 'right' }}>Amount (PHP)</th>
          <th style={{ width: '15%', textAlign: 'right' }}>Operating Unit / Implementing Office</th>
        </tr>
      </>
    );

    return (
      <div id="master-list-report-content" className={styles.reportContent}>
        {pages.map((pageRows, pageIndex) => (
          <div 
            key={`page-${pageIndex}`} 
            className={styles.reportPaper} 
            style={{ 
              pageBreakAfter: pageIndex === pages.length - 1 ? 'auto' : 'always', 
              breakAfter: pageIndex === pages.length - 1 ? 'auto' : 'page',
              marginBottom: pageIndex === pages.length - 1 ? '0' : '24px'
            }}
          >
            <table className={styles.reportTable}>
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <HeaderLayout />
              </thead>
              <tbody>
                {pageRows.map((row, i) => renderRow(row, i))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="report-container-wrapper" className={styles.reportContainerWrapper}>
      <div className={styles.actionBar}>
        <button className={styles.printBtn} onClick={handleDownload} style={{ backgroundColor: '#0f172a' }}>
          <span className="material-symbols-outlined">download</span>
          Download PDF
        </button>
      </div>
      
      {renderContent()}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
