'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';
import ImportModal from '@/components/ImportModal';

interface Project {
  id: string;
  alternateId?: string;
  projectDescription: string;
  category: string;
  municipality: string;
  totalCost: number;
  status?: string;
  createdAt: string;
  isIncludedInMasterList?: boolean;
}

export default function RBPStagePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from localStorage
      const localDataRaw = JSON.parse(localStorage.getItem('rbp_projects') || '[]');

      // 2. Fetch from Supabase
      const isSupabaseConfigured = true;

      let supabaseData: Project[] = [];
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          supabaseData = data.map(p => ({
            id: p.id,
            alternateId: p.alternate_id,
            projectDescription: p.project_name || 'No Description',
            category: p.project_category || 'N/A',
            municipality: p.city_municipality || 'N/A',
            totalCost: p.project_amount || 0,
            status: 'Drafting',
            createdAt: p.created_at,
            isIncludedInMasterList: p.is_included_in_master_list || false
          }));
        }
      }

      const formattedLocal = localDataRaw.map((p: any) => ({
        id: p.id,
        alternateId: p.alternateId,
        projectDescription: p.projectDescription || 'No Description',
        category: p.category || 'N/A',
        municipality: p.municipality || 'N/A',
        totalCost: p.totalCost || 0,
        status: 'Drafting',
        createdAt: p.createdAt || new Date().toISOString(),
        isIncludedInMasterList: p.isIncludedInMasterList || false
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
      // Delete from local storage
      const localProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
      const filtered = localProjects.filter((p: any) => p.id !== id);
      localStorage.setItem('rbp_projects', JSON.stringify(filtered));

      // Delete from Supabase
      const isSupabaseConfigured = true;

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) console.error('Supabase delete error:', error);
      }

      await fetchProjects();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed');
    }
  };

  const toggleMasterListInclusion = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic upate
      setProjects(projects.map(p => p.id === id ? { ...p, isIncludedInMasterList: !currentStatus } : p));

      // Local storage
      const localProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
      const index = localProjects.findIndex((p: any) => p.id === id);
      if (index !== -1) {
        localProjects[index].isIncludedInMasterList = !currentStatus;
        localStorage.setItem('rbp_projects', JSON.stringify(localProjects));
      }

      // Supabase
      const isSupabaseConfigured = true;

      if (isSupabaseConfigured) {
        await supabase.from('projects').update({ is_included_in_master_list: !currentStatus }).eq('id', id);
      }
    } catch (err) {
      console.error('Failed to toggle master list inclusion', err);
      alert('Update failed');
    }
  };

  const handleImport = async (importedProjects: any[], strategy: 'merge' | 'overwrite' | 'replace') => {
    try {
      const localProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
      let newList: any[] = [];

      if (strategy === 'replace') {
        newList = importedProjects;
      } else if (strategy === 'overwrite') {
        const existingMap = new Map(localProjects.map((p: any) => [p.alternateId, p]));
        importedProjects.forEach(p => {
          existingMap.set(p.alternateId, p);
        });
        newList = Array.from(existingMap.values());
      } else {
        // Merge
        const existingIds = new Set(localProjects.map((p: any) => p.alternateId));
        const toAdd = importedProjects.filter(p => !existingIds.has(p.alternateId));
        newList = [...localProjects, ...toAdd];
      }

      localStorage.setItem('rbp_projects', JSON.stringify(newList));

      // Supabase Sync (Simplified for now)
      const isSupabaseConfigured = true;

      if (isSupabaseConfigured) {
        if (strategy === 'replace') {
          await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        for (const p of importedProjects) {
          const projectRecord = {
            alternate_id: p.alternateId,
            project_name: p.projectDescription,
            project_amount: p.totalCost,
            project_category: p.category,
            thrust: p.thrust,
            sub_program_code: p.subProgramCode,
            implementing_office: p.io,
            city_municipality: p.municipality,
            district_engineering_office: p.deo,
            legislative_district: p.ld,
            operating_unit: p.ou,
            region_wide: p.isRegionwide,
            start_year: parseInt(p.fiscalYear),
            reporting_region: p.region,
            rank: p.priorityRank ? parseInt(p.priorityRank) : null,
            tier: p.priorityTier,
            justification: p.justification
          };

          if (strategy === 'overwrite') {
            const { error } = await supabase.from('projects').upsert(projectRecord, { onConflict: 'alternate_id' });
            // We should also handle components/details...
          } else {
            await supabase.from('projects').insert([projectRecord]);
          }
        }
      }

      setIsImportOpen(false);
      fetchProjects();
      alert(`Import successful! ${importedProjects.length} projects processed.`);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed');
    }
  };

  // --- Derived Data (Filters & Pagination) ---

  const uniqueStatuses = useMemo(() => Array.from(new Set(projects.map(p => p.status || 'Drafting'))).sort(), [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = searchTerm === '' ||
        p.projectDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const pStatus = p.status || 'Drafting';
      const matchesStatus = statusFilter === 'All' || pStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className={styles.container}>

      {/* Header Section */}
      <section className={styles.header}>
        <h1 className={styles.title}>RBP Stage</h1>
        <p className={styles.subtitle}>Manage and initialize project details for the RBP cycle.</p>
      </section>

      {/* Control Bar */}
      <section className={styles.controlBar}>
        <div className={styles.searchWrapper}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            placeholder="Search by ID, Name..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.actionButtons}>
          <div style={{ position: 'relative' }}>
            <select
              className={styles.btnFilter}
              style={{ appearance: 'none', paddingRight: '2.5rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <span
              className="material-symbols-outlined"
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '1.25rem' }}
            >
              expand_more
            </span>
          </div>
          <button className={styles.btnFilter} onClick={() => setIsImportOpen(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>upload</span>
            <span>Import</span>
          </button>
          <Link href="/dashboard/rbp/new" className={styles.btnEncode}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>add_circle</span>
            <span>Encode Project</span>
          </Link>
        </div>
      </section>

      {/* Data Table Card */}
      <section className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Project ID</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Location</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Cost (M)</th>
                <th className={styles.th} style={{ textAlign: 'center' }}>Master List</th>
                <th className={styles.th} style={{ textAlign: 'center' }}>Status</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading projects...</td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    {projects.length === 0 ? "No projects found. Start by encoding a project." : "No projects match your current search/filters."}
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.projectId}>{project.alternateId || (project.id ? project.id.substring(0, 8).toUpperCase() : 'N/A')}</span>
                    </td>
                    <td className={styles.td}>
                      <p className={styles.projectDesc}>{project.projectDescription}</p>
                      <p className={styles.projectSubDesc}>{project.category}</p>
                    </td>
                    <td className={styles.td}>
                      <p className={styles.location}>{project.municipality}</p>
                    </td>
                    <td className={styles.td}>
                      <p className={styles.cost}>{project.totalCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={project.isIncludedInMasterList || false}
                            onChange={() => toggleMasterListInclusion(project.id, project.isIncludedInMasterList || false)}
                            style={{ display: 'none' }}
                          />
                          <div
                            style={{
                              width: '36px', height: '20px', backgroundColor: project.isIncludedInMasterList ? 'var(--dpwh-blue)' : '#e5e7eb',
                              borderRadius: '9999px', position: 'relative', transition: 'background-color 0.2s',
                              display: 'flex', alignItems: 'center', padding: '2px'
                            }}
                          >
                            <div
                              style={{
                                width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                                transition: 'transform 0.2s', transform: project.isIncludedInMasterList ? 'translateX(16px)' : 'translateX(0)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                            />
                          </div>
                        </label>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.badgeWrapper}>
                        <span className={`${styles.badge} ${styles.badgeDrafting}`}>
                          {project.status || 'Drafting'}
                        </span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <Link href={`/dashboard/rbp/new?id=${project.id}`} className={styles.actionBtn}>
                          <span className={`material-symbols-outlined ${styles.actionIcon}`}>edit</span>
                        </Link>
                        <button className={styles.actionBtn} onClick={() => handleDelete(project.id, project.alternateId)}>
                          <span className={`material-symbols-outlined ${styles.actionIcon}`} style={{ color: 'var(--danger)' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {!isLoading && filteredProjects.length > 0 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} Projects
            </span>
            <div className={styles.pageControls}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{ opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ opacity: currentPage === totalPages ? 0.3 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
