"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../rbp/master-list/page.module.css'; // Reusing table styles
import { supabase } from '@/lib/supabase';
import { getNepGaaDocs } from '@/lib/supporting-docs';
import { useAuth } from '@/context/AuthContext';

interface Project {
  id: string;
  alternateId?: string;
  title: string;
  location: string;
  costValue: number;
  status: string;
  fiscalYear: string;
}

export default function MigrateNepToGaa() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMigrating, setIsMigrating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEligibleNepProjects = async () => {
    setIsLoading(true);
    try {
      // Fetch GAA alternate IDs to exclude
      const { data: gaaProjects, error: gaaError } = await supabase
        .from('projects')
        .select('parent_project_id')
        .eq('phase', 'GAA')
        .not('parent_project_id', 'is', null);

      if (gaaError) throw gaaError;
      const migratedParentIds = new Set(gaaProjects.map((p) => p.parent_project_id));

      // Fetch NEP projects that are 'Approved' or 'Migrated' (in case their GAA child gets deleted)
      const { data, error } = await supabase
        .from('projects')
        .select('id, alternate_id, project_name, city_municipality, project_amount, status, start_year')
        .eq('phase', 'NEP')
        .in('status', ['Approved', 'Migrated'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData = data
          .filter(p => !migratedParentIds.has(p.id)) // Pre-filter already migrated
          .map((p) => ({
            id: p.id,
            alternateId: p.alternate_id,
            title: p.project_name || 'Untitled Project',
            location: p.city_municipality || 'Unspecified Location',
            costValue: p.project_amount || 0,
            status: p.status || 'Draft',
            fiscalYear: (p.start_year || 2025).toString(),
          }));

        setProjects(mappedData);
      }
    } catch (err) {
      console.error('Error fetching eligible NEP projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleNepProjects();
  }, []);

  const handleMigrate = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one project to migrate.');
      return;
    }

    if (!(await window.customConfirm(`Are you sure you want to migrate ${selectedIds.size} project(s) to the final GAA phase?`))) {
      return;
    }

    setIsMigrating(true);
    const idsToMigrate = Array.from(selectedIds);
    let successCount = 0;

    try {
      // Find the highest current GAA sequence
      const { data: existingGaa } = await supabase
         .from('projects')
         .select('alternate_id')
         .eq('phase', 'GAA');

      let maxSequence = -1;
      if (existingGaa) {
         existingGaa.forEach(row => {
            if (row.alternate_id) {
               const match = row.alternate_id.match(/\d+$/);
               if (match) {
                 const num = parseInt(match[0], 10);
                 if (num > maxSequence) maxSequence = num;
               }
            }
         });
      }
      let nextSequence = maxSequence === -1 ? 1 : maxSequence + 1;

      for (const nepId of idsToMigrate) {
        const { data: originalProject, error: projError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', nepId)
          .single();

        if (projError || !originalProject) continue;

        const { id, created_at, ...projectDataWithoutReadonly } = originalProject;
        
        let newAlternateId = projectDataWithoutReadonly.alternate_id || '';
        if (newAlternateId.includes('NEPR') || newAlternateId.includes('BPR')) {
           const prefixLength = newAlternateId.search(/\d+$/);
           const basePrefix = prefixLength > -1 ? newAlternateId.substring(0, prefixLength) : newAlternateId;
           const newPrefix = basePrefix.replace(/NEPR|BPR/, 'GAAR');
           newAlternateId = `${newPrefix}${String(nextSequence).padStart(5, '0')}`;
        } else {
           // Fallback if not matching expected pattern
           newAlternateId = `27GAARVIIIN${String(nextSequence).padStart(5, '0')}`;
        }
        nextSequence++;
        
         const nepGaaDocs = getNepGaaDocs();
         const initialStatuses: Record<string, string> = {};
         nepGaaDocs.forEach(doc => {
            initialStatuses[doc.code] = 'Draft';
         });

        const gaaProjectData = {
          ...projectDataWithoutReadonly,
          alternate_id: newAlternateId,
          parent_project_id: nepId,
          phase: 'GAA',
          status: 'Draft',
          doc_assignments: {},
          doc_statuses: initialStatuses,
          doc_uploads: {},
          doc_deadlines: {},
          doc_history: {}
        };

        const { data: insertedProject, error: insertProjError } = await supabase
          .from('projects')
          .insert([gaaProjectData])
          .select('id')
          .single();

        if (insertProjError || !insertedProject) continue;

        const newGaaId = insertedProject.id;

        const { data: components, error: compError } = await supabase.from('project_components').select('*').eq('project_id', nepId);
        if (!compError && components && components.length > 0) {
          const newComponents = components.map(c => {
             const { id, project_id, ...compData } = c;
             return { ...compData, project_id: newGaaId };
          });
          await supabase.from('project_components').insert(newComponents);
        }

        const { data: activities, error: actError } = await supabase.from('project_infra_activities').select('*').eq('project_id', nepId);
        if (!actError && activities && activities.length > 0) {
           const newActivities = activities.map(a => {
              const { id, project_id, ...actData } = a;
              return { ...actData, project_id: newGaaId };
           });
           await supabase.from('project_infra_activities').insert(newActivities);
        }

        await supabase.from('projects').update({ status: 'Migrated' }).eq('id', nepId);
        successCount++;
      }

      alert(`Successfully migrated ${successCount} out of ${idsToMigrate.length} projects to GAA.`);
      
      setSelectedIds(new Set());
      await fetchEligibleNepProjects();
      router.push('/dashboard/gaa/projects');

    } catch (err) {
      console.error('Migration crash:', err);
      alert('A critical error occurred during the migration process.');
    } finally {
      setIsMigrating(false);
    }
  };


  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredProjects.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredProjects.map(p => p.id)));
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      return searchTerm === '' ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [projects, searchTerm]);


  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.headerTitle} style={{color: 'var(--dpwh-orange)'}}>Migrate Approved NEP Projects</h1>
          <p className={styles.headerSubtitle}>Select approved National proposals to copy into the final General Appropriations Act pipeline.</p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.btnPrimary} 
            style={{ backgroundColor: selectedIds.size > 0 ? 'var(--dpwh-orange)' : '#9ca3af', cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed' }}
            onClick={handleMigrate}
            disabled={selectedIds.size === 0 || isMigrating}
          >
            {isMigrating ? (
               <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', marginRight: '4px' }}>sync</span>
            ) : (
                <span className={`material-symbols-outlined ${styles.btnPrimaryIcon}`}>move_up</span>
            )}
            {isMigrating ? 'Migrating...' : `Migrate ${selectedIds.size} Project(s)`}
          </button>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search Approved NEP Projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filterGroup}>
              <span style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>
                  Only showing projects where Phase = &apos;NEP&apos; and Status = &apos;Approved&apos;.
              </span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    title="Select All"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredProjects.length}
                    onChange={selectAll}
                    disabled={isLoading || filteredProjects.length === 0}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </th>
                <th className={styles.th}>Project Details</th>
                <th className={styles.th}>Location</th>
                <th className={styles.th}>NEP Cost (PHP)</th>
                <th className={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                      <p>Scanning for approved NEP projects...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}>inventory_2</span>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {projects.length === 0
                        ? "No approved NEP projects ready for migration to GAA yet."
                        : "No projects match your current search term."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    className={styles.tr} 
                    style={{ cursor: 'pointer', backgroundColor: selectedIds.has(project.id) ? 'rgba(249, 115, 22, 0.05)' : 'transparent' }}
                    onClick={() => toggleSelection(project.id)}
                  >
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                       <input 
                         type="checkbox" 
                         checked={selectedIds.has(project.id)}
                         onChange={() => {}} 
                         style={{ transform: 'scale(1.2)', pointerEvents: 'none' }}
                       />
                    </td>
                    <td className={styles.td}>
                      <div className={styles.projectId}>{project.alternateId || project.id.substring(0, 8).toUpperCase()}</div>
                      <div className={styles.projectTitle} style={{ marginTop: '0.5rem' }}>{project.title}</div>
                      <div className={styles.projectSubtitle}>FY {project.fiscalYear}</div>
                    </td>
                    <td className={styles.td}>{project.location}</td>
                    <td className={styles.td}>
                      <span className={styles.costStr}>₱{project.costValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${styles.badgeApproved}`}>{project.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
