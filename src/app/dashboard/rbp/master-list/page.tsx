"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';

// Define the Project interface based on our database and UI needs
interface Project {
  id: string;
  alternateId?: string;
  title: string;
  location: string;
  costValue: number;
  stage: string;
  status: string;
  createdAt: string;
  fiscalYear: string;
}

export default function MasterList() {
  // --- State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // --- Data Fetching ---
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const localDataRaw = JSON.parse(localStorage.getItem('rbp_projects') || '[]');

      const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

      let supabaseData: any[] = [];
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          supabaseData = data.map(p => ({
            id: p.id,
            alternateId: p.alternate_id,
            title: p.project_name || 'Untitled Project',
            location: p.city_municipality || 'Unspecified Location',
            costValue: p.project_amount || 0,
            stage: 'Preparation',
            status: 'Draft',
            createdAt: p.created_at,
            fiscalYear: (p.start_year || 2025).toString()
          }));
        }
      }

      const formattedLocal = localDataRaw.map((p: any) => ({
        id: p.id,
        alternateId: p.alternateId,
        title: p.projectDescription || 'No Description',
        location: p.municipality || 'Unspecified',
        costValue: p.totalCost || 0,
        stage: 'Preparation',
        status: 'Draft',
        createdAt: p.createdAt || new Date().toISOString(),
        fiscalYear: p.fiscalYear || '2025'
      }));

      const combined = [...supabaseData, ...formattedLocal].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setProjects(combined);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, altId?: string) => {
    if (!confirm(`Are you sure you want to delete project ${altId || id}?`)) return;

    try {
      // 1. Local storage delete
      const localProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
      const filtered = localProjects.filter((p: any) => p.id !== id);
      localStorage.setItem('rbp_projects', JSON.stringify(filtered));

      // 2. Supabase delete
      const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

      if (isSupabaseConfigured) {
        await supabase.from('projects').delete().eq('id', id);
      }

      fetchProjects();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed');
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
    let end = Math.min(totalPages, start + maxPagesToShow - 1);

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
  };

  return (
    <div className={styles.container} onClick={closeAllDropdowns}>
      {/* Page Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.headerTitle}>RBP Master List (A-1)</h1>
          <p className={styles.headerSubtitle}>Comprehensive view of all Regional Budget Proposals.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/dashboard/rbp/new" className={styles.btnPrimary}>
            <span className={`material-symbols-outlined ${styles.btnPrimaryIcon}`}>add</span>
            Add New Project
          </Link>
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
              placeholder="Search by ID, Title, or Location..."
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
                <th className={styles.th}>Project Details</th>
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
                        ? "No projects found in database. Start by adding a new project."
                        : "No projects match your current filters and search term."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.projectId}>{project.alternateId || project.id.substring(0, 8).toUpperCase()}</div>
                      <div className={styles.projectTitle} style={{ marginTop: '0.5rem' }}>{project.title}</div>
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
                        <Link href={`/dashboard/rbp/${project.id}`} className={styles.actionBtn} title="View Details">
                          <span className={`material-symbols-outlined ${styles.actionIcon}`}>visibility</span>
                        </Link>
                        <Link href={`/dashboard/rbp/new?id=${project.id}`} className={styles.actionBtn} title="Edit Project">
                          <span className={`material-symbols-outlined ${styles.actionIcon}`}>edit</span>
                        </Link>
                        <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} title="Delete Project" onClick={() => handleDelete(project.id, project.alternateId)}>
                          <span className={`material-symbols-outlined ${styles.actionIcon}`}>delete</span>
                        </button>
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
      <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
    </div>
  );
}
