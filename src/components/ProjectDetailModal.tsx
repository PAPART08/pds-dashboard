"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface ProjectDetailModalProps {
  projectId: string | null;
  onClose: () => void;
}

interface ProjectDetail {
  id: string;
  alternateId?: string;
  projectName: string;
  projectAmount: number;
  projectCategory: string;
  cityMunicipality: string;
  status: string;
  phase: string;
  thrust: string;
  subProgramCode: string;
  implementingOffice: string;
  districtEngineeringOffice: string;
  legislativeDistrict: string;
  operatingUnit: string;
  startYear: number;
  programStage: string;
  tier: string;
  rank: number;
  justification: string;
  createdAt: string;
  components: ComponentDetail[];
  specificDetails: SpecificDetail[];
}

interface SpecificDetail {
  compId: string;
  infraId: string;
  startLimit: string;
  endLimit: string;
  length: number;
  scope: string;
  target: number;
  cost: number;
  lanes: number;
}

interface ComponentDetail {
  compIdDisplay: string;
  compType: string;
  infraType: string;
  infraName: string;
  typeOfWork: string;
  targetUnit: string;
  physicalTarget: number;
  compAmount: number;
  unitCost: number;
  plannedStartDate: string;
  plannedEndDate: string;
}

export default function ProjectDetailModal({ projectId, onClose }: ProjectDetailModalProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const { data: p, error: pErr } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
        if (pErr) throw pErr;

        const { data: comps } = await supabase
          .from('project_components')
          .select('*')
          .eq('project_id', projectId)
          .order('comp_id_display', { ascending: true });

        const { data: specs } = await supabase
          .from('project_infra_activities')
          .select('*')
          .eq('project_id', projectId)
          .order('comp_id_ref', { ascending: true });

        setProject({
          id: p.id,
          alternateId: p.alternate_id,
          projectName: p.project_name || 'Untitled Project',
          projectAmount: p.project_amount || 0,
          projectCategory: p.project_category || 'N/A',
          cityMunicipality: p.city_municipality || 'N/A',
          status: p.status || 'Draft',
          phase: p.phase || 'RBP',
          thrust: p.thrust || 'N/A',
          subProgramCode: p.sub_program_code || 'N/A',
          implementingOffice: p.implementing_office || 'N/A',
          districtEngineeringOffice: p.district_engineering_office || 'N/A',
          legislativeDistrict: p.legislative_district || 'N/A',
          operatingUnit: p.operating_unit || 'N/A',
          startYear: p.start_year || 2025,
          programStage: p.program_stage || 'N/A',
          tier: p.tier || 'N/A',
          rank: p.rank || 0,
          justification: p.justification || 'N/A',
          createdAt: p.created_at,
          components: (comps || []).map((c: any) => ({
            compIdDisplay: c.comp_id_display || '',
            compType: c.comp_type || '',
            infraType: c.infra_type || '',
            infraName: c.infra_name || '',
            typeOfWork: c.type_of_work || '',
            targetUnit: c.target_unit || '',
            physicalTarget: c.physical_target || 0,
            compAmount: c.comp_amount || 0,
            unitCost: c.unit_cost || 0,
            plannedStartDate: c.planned_start_date || '',
            plannedEndDate: c.planned_end_date || '',
          })),
          specificDetails: (specs || []).map((s: any) => ({
            compId: s.comp_id_ref || '',
            infraId: s.infra_item || '',
            startLimit: s.start_station_limit || '',
            endLimit: s.end_station_limit || '',
            length: s.length_m || 0,
            scope: s.detailed_scope_of_work || '',
            target: s.target_amount || 0,
            cost: s.cost_per_line || 0,
            lanes: s.num_lanes || 0,
          })),
        });
      } catch (err) {
        console.error('Failed to fetch project detail:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [projectId]);

  const handleDownloadPdf = async () => {
    if (!printRef.current || !project) return;

    // Use browser print-to-PDF with a dedicated print stylesheet
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups to download the PDF.');
      return;
    }

    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Detail - ${project.alternateId || project.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 11px; }
            h1 { font-size: 18px; color: #1e40af; margin-bottom: 4px; }
            h2 { font-size: 13px; color: #334155; margin-top: 18px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
            .header-meta { color: #64748b; font-size: 10px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 12px; }
            .field { display: flex; flex-direction: column; padding: 4px 0; }
            .field-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 2px; }
            .field-value { font-size: 11px; font-weight: 600; color: #1e293b; }
            .cost-highlight { font-size: 16px; font-weight: 800; color: #0369a1; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; }
            td { padding: 5px 8px; border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
            .badge-rbp { background: #dbeafe; color: #1e40af; }
            .badge-nep { background: #d1fae5; color: #065f46; }
            .badge-gaa { background: #ffedd5; color: #9a3412; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
            @media print { body { padding: 12px; } }
          </style>
        </head>
        <body>
          ${content}
          <div class="footer">Generated from PDS Dashboard • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  if (!projectId) return null;

  const getPhaseBadgeClass = (phase: string) => {
    switch (phase) {
      case 'RBP': return 'badge-rbp';
      case 'NEP': return 'badge-nep';
      case 'GAA': return 'badge-gaa';
      default: return 'badge-rbp';
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        backgroundColor: '#fff', borderRadius: '16px',
        width: '90%', maxWidth: '820px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
        animation: 'modalSlideIn 0.3s ease-out',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--dpwh-blue, #1e40af)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>description</span>
              Project Details
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {project?.alternateId || projectId?.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={isLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: '#fff', color: '#334155', fontSize: '12px', fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { if (!isLoading) { (e.target as HTMLElement).style.borderColor = '#3b82f6'; (e.target as HTMLElement).style.color = '#3b82f6'; } }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.borderColor = '#e2e8f0'; (e.target as HTMLElement).style.color = '#334155'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_as_pdf</span>
              Download PDF
            </button>
            <button
              onClick={onClose}
              style={{
                width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '18px', transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { (e.target as HTMLElement).style.background = '#fee2e2'; (e.target as HTMLElement).style.color = '#ef4444'; }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.background = '#fff'; (e.target as HTMLElement).style.color = '#64748b'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ overflow: 'auto', padding: '24px', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '16px', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
              <p style={{ fontSize: '13px' }}>Loading project details...</p>
            </div>
          ) : !project ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>error_outline</span>
              <p>Could not load project details.</p>
            </div>
          ) : (
            <div ref={printRef}>
              {/* Print Header */}
              <h1>{project.projectName}</h1>
              <div className="header-meta" style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
                {project.alternateId || project.id.substring(0, 8).toUpperCase()} • FY {project.startYear} •{' '}
                <span
                  style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                    background: project.phase === 'RBP' ? '#dbeafe' : project.phase === 'NEP' ? '#d1fae5' : '#ffedd5',
                    color: project.phase === 'RBP' ? '#1e40af' : project.phase === 'NEP' ? '#065f46' : '#9a3412',
                  }}
                >
                  {project.phase}
                </span>{' '}
                •{' '}
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  background: '#f1f5f9', color: '#475569',
                }}>
                  {project.status}
                </span>
              </div>

              {/* Cost Highlight */}
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '12px',
                padding: '16px 20px', marginBottom: '20px', border: '1px solid #bfdbfe',
              }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Project Cost
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                  ₱ {project.projectAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* General Information */}
              <h2>General Information</h2>
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: '20px' }}>
                {[
                  { label: 'Project Category', value: project.projectCategory },
                  { label: 'City / Municipality', value: project.cityMunicipality },
                  { label: 'Implementing Office', value: project.implementingOffice },
                  { label: 'District Engineering Office', value: project.districtEngineeringOffice },
                  { label: 'Legislative District', value: project.legislativeDistrict },
                  { label: 'Operating Unit', value: project.operatingUnit },
                  { label: 'Sub-Program Code', value: project.subProgramCode },
                  { label: 'Thrust', value: project.thrust },
                  { label: 'Program Stage', value: project.programStage },
                  { label: 'Priority Tier', value: project.tier },
                  { label: 'Priority Rank', value: String(project.rank) },
                  { label: 'Fiscal Year', value: String(project.startYear) },
                ].map((field, i) => (
                  <div key={i} style={{ padding: '6px 0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{field.label}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{field.value}</div>
                  </div>
                ))}
              </div>

              {/* Justification */}
              {project.justification && project.justification !== 'N/A' && (
                <>
                  <h2>Justification</h2>
                  <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.6, marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {project.justification}
                  </p>
                </>
              )}

              {/* Components Table */}
              {project.components.length > 0 && (
                <>
                  <h2>Project Components ({project.components.length})</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '8px' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>ID</th>
                          <th style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Type</th>
                          <th style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Infrastructure</th>
                          <th style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Work Type</th>
                          <th style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'right', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Target</th>
                          <th style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'right', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Cost (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.components.map((c, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{c.compIdDisplay}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{c.compType}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{c.infraName || c.infraType}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{c.typeOfWork}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{c.physicalTarget} {c.targetUnit}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{c.compAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Specific Details Table */}
              {project.specificDetails.length > 0 && (
                <>
                  <h2 style={{ marginTop: '24px' }}>Component Specific Details ({project.specificDetails.length})</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '8px' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Comp ID</th>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Infra ID</th>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Limits / Chainage</th>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'right', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Length</th>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Scope</th>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'right', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Target</th>
                          <th style={{ background: '#f8fafc', color: '#475569', fontWeight: 700, textAlign: 'right', padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: '9px', textTransform: 'uppercase' }}>Cost (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.specificDetails.map((s, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#0f172a' }}>{s.compId}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{s.infraId || '-'}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{s.startLimit && s.endLimit ? `${s.startLimit} - ${s.endLimit}` : '-'}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{s.length > 0 ? `${s.length}m` : '-'}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.scope}>{s.scope || '-'}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{s.target}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{s.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
