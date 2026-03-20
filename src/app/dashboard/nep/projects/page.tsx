"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';
import { exportProjectsToExcel } from '@/lib/excel-export';
import { useAuth } from '@/context/AuthContext';
import ProjectDetailModal from '@/components/ProjectDetailModal';

// Define the Project interface based on our database and UI needs
interface Project {
  id: string;
  alternateId?: string;
  title: string;
  location: string;
  costValue: number;
  stage: string;
  status: string;
  isEpa: boolean;
  createdAt: string;
  fiscalYear: string;
}

export default function NEPProjectsList() {
  // --- State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile, loading: authLoading } = useAuth();
  
  const userRole = profile?.position || '';
  const isWorkspaceUser = userRole === 'Unit Member' || userRole === 'Regular Member';
  const userName = profile?.name || '';
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // UI State for custom dropdowns
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // --- Data Fetching ---
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      // Fetch exclusively from Supabase where phase='NEP'
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('phase', 'NEP')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        let filteredData = data;
        
        if (isWorkspaceUser && userName) {
            const { data: tasks } = await supabase
                .from('tasks')
                .select('project_id')
                .eq('assignee_name', userName);
                
            const assignedProjectIds = new Set(tasks?.map(t => t.project_id) || []);
            
            filteredData = data.filter(p => {
                let isLegacyAssigned = false;
                if (p.doc_assignments) {
                    isLegacyAssigned = Object.values(p.doc_assignments).some(
                        (assignee: any) => typeof assignee === 'string' && assignee.toLowerCase().trim() === userName.toLowerCase().trim()
                    );
                }
                return assignedProjectIds.has(p.id) || isLegacyAssigned;
            });
        }

        const mappedData = filteredData.map(p => ({
          id: p.id,
          alternateId: p.alternate_id,
          title: p.project_name || 'Untitled Project',
          location: p.city_municipality || 'Unspecified Location',
          costValue: p.project_amount || 0,
          stage: 'NEP Implementation',
          status: p.status || 'Draft',
          isEpa: p.is_epa || false,
          createdAt: p.created_at,
          fiscalYear: (p.start_year || 2025).toString(),
        }));

        setProjects(mappedData);
      }
    } catch (err) {
      console.error('Error fetching NEP projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProjects();
    }
  }, [authLoading, userName, isWorkspaceUser]);

  const handleDelete = async (id: string, altId?: string) => {
    if (!(await window.customConfirm(`Are you sure you want to delete NEP project ${altId || id}? This will revert it back to the RBP phase migration queue.`))) return;

    try {
      // 1. Revert the parent RBP project's status back to 'Approved' so it can be migrated again
      if (altId) {
        await supabase
          .from('projects')
          .update({ status: 'Approved' })
          .eq('alternate_id', altId)
          .eq('phase', 'RBP');
      }

      // 2. Delete the NEP project clone
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;

      fetchProjects();
    } catch (err) {
      console.error('Delete/Revert failed:', err);
      alert('Failed to delete project and revert migration.');
    }
  };

  const handleToggleEpa = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_epa: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Optimitic update
      setProjects(prev => prev.map(p => p.id === id ? { ...p, isEpa: !currentStatus } : p));
    } catch (err) {
      console.error('Toggle EPA failed:', err);
      alert('Failed to update EPA status.');
    }
  };

  // --- Derived Data (Filters & Pagination) ---

  // Get unique options for filter dropdowns
  const uniqueLocations = useMemo(() => Array.from(new Set(projects.map(p => p.location))).sort(), [projects]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(projects.map(p => p.status))).sort(), [projects]);
  const uniqueYears = useMemo(() => Array.from(new Set(projects.map(p => p.fiscalYear))).sort((a, b) => Number(b) - Number(a)), [projects]);

  // Apply Filters & Search
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = searchTerm === '' ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesLocation = locationFilter === 'All' || p.location === locationFilter;
      const matchesYear = yearFilter === 'All' || p.fiscalYear === yearFilter;

      return matchesSearch && matchesStatus && matchesLocation && matchesYear;
    });
  }, [projects, searchTerm, statusFilter, locationFilter, yearFilter]);

  // Apply Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, yearFilter]);

  // --- Handlers ---
  const handleExportMYPS = async () => {
    setIsExportDropdownOpen(false);
    setIsLoading(true);
    try {
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) {
        alert('No projects to export.');
        setIsLoading(false);
        return;
      }
      
      // Fetch full project data
      const { data: projs, error: pError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);
      if (pError) throw pError;

      const { data: comps, error: cError } = await supabase
        .from('project_components')
        .select('*')
        .in('project_id', projectIds);
      if (cError) throw cError;

      const { data: specs, error: sError } = await supabase
        .from('project_infra_activities')
        .select('*')
        .in('project_id', projectIds);
      if (sError) throw sError;

      const fullProjects = projs.map(p => ({
        id: p.id,
        alternateId: p.alternate_id,
        projectDescription: p.project_name,
        projectAmount: p.project_amount,
        category: p.project_category,
        thrust: p.thrust,
        projectOrigin: p.project_origin,
        fundingAgreementName: p.funding_agreement_name,
        io: p.implementing_office,
        municipality: p.city_municipality,
        deo: p.district_engineering_office,
        ld: p.legislative_district,
        ou: p.operating_unit,
        originatingAgency: p.originating_agency,
        isRegionwide: p.region_wide,
        fiscalYear: (p.start_year || 2025).toString(),
        region: p.reporting_region,
        programStage: p.program_stage,
        priorityTier: p.tier,
        priorityRank: p.rank,
        justification: p.justification,
        asd1: p.asd_1, asd2: p.asd_2, asd3: p.asd_3, asd4: p.asd_4, asd5: p.asd_5,
        asd6: p.asd_6, asd7: p.asd_7, asd8: p.asd_8, asd9: p.asd_9, asd10: p.asd_10,
        asd11: p.asd_11,
        
        components: comps.filter(c => c.project_id === p.id).map(c => ({
          id: c.comp_id_display,
          compType: c.comp_type,
          infraType: c.infra_type,
          infraName: c.infra_name,
          workType: c.type_of_work,
          unit: c.target_unit,
          target: c.physical_target,
          cost: c.comp_amount,
          unitCost: c.unit_cost,
          start: c.planned_start_date,
          end: c.planned_end_date,
          calendar: c.pip_calendar_days,
          alternateId: c.alternate_id,
          programStage: c.program_stage
        })),

        specificDetails: specs.filter(s => s.project_id === p.id).map(s => ({
          compId: s.comp_id_ref,
          infraId: s.infra_item,
          startLimit: s.start_station_limit || s.start_limit,
          endLimit: s.end_station_limit || s.end_limit,
          startChainage: s.start_chainage,
          endChainage: s.end_chainage,
          startX: s.start_x,
          startY: s.start_y,
          endX: s.end_x,
          endY: s.end_y,
          length: s.length_m,
          scope: s.detailed_scope_of_work,
          target: s.target_amount,
          cost: s.cost_per_line,
          lanes: s.num_lanes,
          dominant: s.dominant,
          alternateId: s.alternate_id,
          programStage: s.program_stage,
          originalRemarks: s.original_remarks,
          revisedRemarks: s.revised_remarks,
          infraType: s.infra_type
        }))
      }));

      exportProjectsToExcel(fullProjects);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export projects.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helpers ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className={`${styles.badge} ${styles.badgeApproved}`}>Approved</span>;
      case 'Under Review':
        return <span className={`${styles.badge} ${styles.badgeUnderReview}`}>Under Review</span>;
      case 'Draft':
        return <span className={`${styles.badge} ${styles.badgeDraft}`}>Draft</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgeDraft}`}>{status}</span>;
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generates the sequence of page numbers to show (e.g. 1 2 3 ... 8)
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    let start = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const end = Math.min(totalPages, start + maxPagesToShow - 1);

    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Close dropdowns when clicking outside (simplified for now as inline handlers)
  const closeAllDropdowns = () => {
    setIsStatusDropdownOpen(false);
    setIsLocationDropdownOpen(false);
    setIsYearDropdownOpen(false);
    setIsExportDropdownOpen(false);
  };

  return (
    <div className={styles.container} onClick={closeAllDropdowns}>
      {/* Page Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.headerTitle} style={{color: 'var(--dpwh-green, #10b981)'}}>All NEP Projects</h1>
          <p className={styles.headerSubtitle}>Comprehensive view of all active projects in the National Expenditure Program phase.</p>
        </div>

        <div className={styles.headerActions} style={{ position: 'relative' }}>
          <button
            className={styles.btnPrimary} style={{ backgroundColor: 'var(--dpwh-green, #10b981)' }}
            onClick={(e) => { e.stopPropagation(); setIsExportDropdownOpen(!isExportDropdownOpen); }}
          >
            <span className={`material-symbols-outlined ${styles.btnPrimaryIcon}`}>download</span>
            Export
            <span className={`material-symbols-outlined ${styles.btnPrimaryIcon}`} style={{ marginLeft: '4px' }}>arrow_drop_down</span>
          </button>

          {isExportDropdownOpen && (
            <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto', minWidth: '180px', marginTop: '0.5rem' }}>
              <button
                className={styles.dropdownItem}
                onClick={handleExportMYPS}
              >
                <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>table_chart</span>
                MYPS Import File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <div className={styles.glassCard}>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox} onClick={e => e.stopPropagation()}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search NEP Projects by ID, Title, or Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup} onClick={e => e.stopPropagation()}>
            {/* Year Filter */}
            <div style={{ position: 'relative' }}>
              <button
                className={`${styles.filterBtn} ${yearFilter !== 'All' ? styles.filterBtnActive : ''}`}
                onClick={() => { closeAllDropdowns(); setIsYearDropdownOpen(!isYearDropdownOpen); }}
              >
                <span className={`material-symbols-outlined ${styles.filterIcon}`}>calendar_today</span>
                {yearFilter === 'All' ? 'Fiscal Year' : yearFilter}
              </button>
              {isYearDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <button className={styles.dropdownItem} onClick={() => { setYearFilter('All'); setIsYearDropdownOpen(false); }}>All Years</button>
                  {uniqueYears.map(year => (
                    <button key={year} className={styles.dropdownItem} onClick={() => { setYearFilter(year); setIsYearDropdownOpen(false); }}>{year}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div style={{ position: 'relative' }}>
              <button
                className={`${styles.filterBtn} ${statusFilter !== 'All' ? styles.filterBtnActive : ''}`}
                onClick={() => { closeAllDropdowns(); setIsStatusDropdownOpen(!isStatusDropdownOpen); }}
              >
                <span className={`material-symbols-outlined ${styles.filterIcon}`}>filter_alt</span>
                {statusFilter === 'All' ? 'Status' : statusFilter}
              </button>
              {isStatusDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <button className={styles.dropdownItem} onClick={() => { setStatusFilter('All'); setIsStatusDropdownOpen(false); }}>All Statuses</button>
                  {uniqueStatuses.map(status => (
                    <button key={status} className={styles.dropdownItem} onClick={() => { setStatusFilter(status); setIsStatusDropdownOpen(false); }}>{status}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Location Filter */}
            <div style={{ position: 'relative' }}>
              <button
                className={`${styles.filterBtn} ${locationFilter !== 'All' ? styles.filterBtnActive : ''}`}
                onClick={() => { closeAllDropdowns(); setIsLocationDropdownOpen(!isLocationDropdownOpen); }}
              >
                <span className={`material-symbols-outlined ${styles.filterIcon}`}>location_on</span>
                {locationFilter === 'All' ? 'Location' : locationFilter}
              </button>
              {isLocationDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <button className={styles.dropdownItem} onClick={() => { setLocationFilter('All'); setIsLocationDropdownOpen(false); }}>All Locations</button>
                  {uniqueLocations.map(loc => (
                    <button key={loc} className={styles.dropdownItem} onClick={() => { setLocationFilter(loc); setIsLocationDropdownOpen(false); }}>{loc}</button>
                  ))}
                </div>
              )}
            </div>

            {(searchTerm || statusFilter !== 'All' || locationFilter !== 'All' || yearFilter !== 'All') && (
               <button
                 className={styles.filterBtn}
                 onClick={() => {
                   setSearchTerm('');
                   setStatusFilter('All');
                   setLocationFilter('All');
                   setYearFilter('All');
                 }}
                 style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
               >
                 <span className={`material-symbols-outlined ${styles.filterIcon}`} style={{ color: 'var(--danger)' }}>close</span>
                 Clear Filters
               </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>NEP Project Details</th>
                <th className={styles.th}>Location</th>
                <th className={styles.th}>Total Cost (PHP)</th>
                <th className={styles.th}>Stage</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                      <p>Loading projects database...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}>search_off</span>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {projects.length === 0
                        ? "No NEP projects found. Start by migrating projects from RBP."
                        : "No projects match your current filters and search term."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.projectId}>{project.alternateId || project.id.substring(0, 8).toUpperCase()}</div>
                      <div className={styles.projectTitle} style={{ marginTop: '0.5rem' }}>
                        {project.title}
                        {project.isEpa && (
                          <span style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: 'var(--dpwh-orange)', color: 'white', borderRadius: '4px' }}>EPA</span>
                        )}
                      </div>
                      <div className={styles.projectSubtitle}>FY {project.fiscalYear}</div>
                    </td>
                    <td className={styles.td}>{project.location}</td>
                    <td className={styles.td}>
                      <span className={styles.costStr}>₱{project.costValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className={styles.td}>{project.stage}</td>
                    <td className={styles.td}>
                      {getStatusBadge(project.status)}
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                        {!isWorkspaceUser && (
                          <button 
                            onClick={() => handleToggleEpa(project.id, project.isEpa)}
                            className={styles.actionBtn} 
                            title={project.isEpa ? 'Remove EPA Status' : 'Mark as EPA'}
                            style={{ color: project.isEpa ? 'var(--dpwh-orange)' : 'var(--text-muted)' }}
                          >
                            <span className={`material-symbols-outlined ${styles.actionIcon}`} style={{ fontVariationSettings: project.isEpa ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          </button>
                        )}
                        {isWorkspaceUser ? (
                          <button className={styles.actionBtn} onClick={() => setSelectedProjectId(project.id)} title="View Project Details">
                            <span className={`material-symbols-outlined ${styles.actionIcon}`}>visibility</span>
                          </button>
                        ) : (
                          <>
                            <Link href={`/dashboard/rbp/new?id=${project.id}&phase=NEP`} className={styles.actionBtn} title="Edit Project Details">
                              <span className={`material-symbols-outlined ${styles.actionIcon}`}>edit</span>
                            </Link>
                            <Link href={`/dashboard/nep/${project.id}`} className={styles.actionBtn} title="View Tracking Setup">
                              <span className={`material-symbols-outlined ${styles.actionIcon}`}>visibility</span>
                            </Link>
                            <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} title="Delete NEP Project" onClick={() => handleDelete(project.id, project.alternateId)}>
                              <span className={`material-symbols-outlined ${styles.actionIcon}`}>delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredProjects.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.pageInfo}>
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredProjects.length)}</strong> of <strong>{filteredProjects.length}</strong> projects
            </div>
            <div className={styles.pageControls}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <span className={`material-symbols-outlined ${styles.pageBtnIcon}`}>chevron_left</span>
              </button>

              {getPageNumbers().map(pageNum => (
                <button
                  key={pageNum}
                  className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <span className={`material-symbols-outlined ${styles.pageBtnIcon}`}>chevron_right</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}

      <style jsx>{`
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
