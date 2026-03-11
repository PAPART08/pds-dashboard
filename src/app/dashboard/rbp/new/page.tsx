'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import codes from '@/lib/codes.json';
import { exportToExcel } from '@/lib/excel-export';
import infraCodes from '@/lib/infra_codes.json';
import { THRUST_TO_SUB_PROGRAM } from '@/lib/thrust-mapping';
import styles from './page.module.css';

export default function NewProjectEntry() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core Form State
  const [formData, setFormData] = useState({
    id: '', // For Edit mode
    region: '',
    deo: '',
    ld: '',
    municipality: '',
    barangay: '',
    ou: '',
    io: '',
    isRegionwide: false,
    alternateId: '',
    fiscalYear: '2025',
    thrust: '',
    category: '',
    projectDescription: '',
    projectAmount: 0,
    projectOrigin: '',
    fundingAgreementName: '',
    originatingAgency: '',
    thrustCode: '',
    programStage: '',
    priorityTier: '',
    priorityRank: '',
    justification: '',
    boundaryCode: '',
    subProgramCode: '',
    asd1: '', asd2: '', asd3: '', asd4: '', asd5: '', asd6: '', asd7: '', asd8: '', asd9: '', asd10: '', asd11: '',
  });

  const [components, setComponents] = useState([
    { id: 'C1-01', compType: '', infraType: '', infraName: '', workType: '', unit: '', target: 0, cost: 0, unitCost: 0, start: '', end: '', calendar: 0, alternateId: '', programStage: '' },
  ]);

  const [specificDetails, setSpecificDetails] = useState([
    { compId: 'C1-01', infraId: '', startLimit: '', endLimit: '', startChainage: '', endChainage: '', startX: '', startY: '', endX: '', endY: '', length: 0, scope: '', target: 0, cost: 0, lanes: 0, dominant: false, alternateId: '', programStage: '', originalRemarks: '', revisedRemarks: '', infraType: '' }
  ]);

  // Derived Dropdown Data
  const regions = useMemo(() => codes.regions || [], []);
  const deos = useMemo(() => formData.region ? (codes.deos as any)[formData.region] || [] : [], [formData.region]);
  const municipalities = useMemo(() => formData.deo ? (codes.municipalities as any)[formData.deo] || [] : [], [formData.deo]);
  const barangays = useMemo(() => {
    if (!formData.municipality) return [];
    const rawBrgys = (codes as any).barangays || {};

    // Direct match (if ever it exactly matches)
    if (rawBrgys[formData.municipality]) return rawBrgys[formData.municipality];

    // Fallback fuzzy matching for RIF formats (e.g. "CITY OF MAASIN (CAPITAL) (SOUTHERN LEYTE)")
    const normalized = formData.municipality.toLowerCase();

    // Specific hardcoded matches for common variations
    if (normalized.includes('maasin')) return rawBrgys['CITY OF MAASIN (Capital)'] || rawBrgys['CITY OF MAASIN'] || [];

    for (const key of Object.keys(rawBrgys)) {
      // Extract base name ignoring parentheses: "CITY OF MAASIN (Capital)" -> "city of maasin"
      const baseKey = key.split('(')[0].trim().toLowerCase();
      if (normalized.includes(baseKey) && baseKey.length > 3) {
        return rawBrgys[key];
      }
    }

    return [];
  }, [formData.municipality]);

  const offices = useMemo(() => (codes as any).offices || [], []);
  const implementingOffices = useMemo(() => formData.region ? (codes.deos as any)[formData.region] || [] : [], [formData.region]);
  const legislativeDistricts = useMemo(() => formData.deo ? ((codes as any).deo_to_ld?.[formData.deo] || []) : [], [formData.deo]);
  const projectCategories = useMemo(() => (codes as any).project_categories || [], []);
  const trusts = useMemo(() => formData.category ? (codes.trusts_mapping as any)[formData.category] || [] : [], [formData.category]);
  const fiscalYears = useMemo(() => (codes as any).fiscal_years || [], []);

  const infraTypesForThrust = useMemo(() => formData.thrust ? ((codes as any).thrust_infra?.[formData.thrust] || []) : [], [formData.thrust]);
  const componentTypes = useMemo(() => (codes as any).component_types || [], []);

  // Check for Edit Mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    if (projectId) {
      loadProject(projectId);
    }
  }, []);

  // Sync Sub-Program Code with Thrust
  useEffect(() => {
    if (formData.thrust && THRUST_TO_SUB_PROGRAM[formData.thrust]) {
      const code = THRUST_TO_SUB_PROGRAM[formData.thrust];
      if (formData.subProgramCode !== code) {
        setFormData(prev => ({ ...prev, subProgramCode: code }));
      }
    }
  }, [formData.thrust]);

  const loadProject = async (id: string) => {
    try {
      // Try local storage first
      const localProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
      const localP = localProjects.find((p: any) => p.id === id);
      if (localP) {
        setFormData(localP);
        setComponents(localP.components || []);
        setSpecificDetails(localP.specificDetails || []);
        return;
      }

      // Try Supabase
      const { data: project, error: pError } = await supabase.from('projects').select('*').eq('id', id).single();
      if (pError) throw pError;

      const { data: comps, error: cError } = await supabase.from('project_components').select('*').eq('project_id', id);
      if (cError) throw cError;

      const { data: specs, error: sError } = await supabase.from('project_infra_activities').select('*').eq('project_id', id);
      if (sError) throw sError;

      setFormData({
        id: project.id,
        region: project.reporting_region || '',
        deo: project.district_engineering_office || '',
        ld: project.legislative_district || '',
        municipality: project.city_municipality || '',
        barangay: project.barangay || '',
        ou: project.operating_unit || '',
        io: project.implementing_office || '',
        isRegionwide: project.region_wide || false,
        alternateId: project.alternate_id || '',
        fiscalYear: (project.start_year || 2025).toString(),
        thrust: project.thrust || '',
        category: project.project_category || '',
        projectDescription: project.project_name || '',
        projectAmount: project.project_amount || 0,
        projectOrigin: project.project_origin || '',
        fundingAgreementName: project.funding_agreement_name || '',
        originatingAgency: project.originating_agency || '',
        thrustCode: project.thrust_code || '',
        programStage: project.program_stage || '',
        priorityTier: project.tier || '',
        priorityRank: (project.rank || '').toString(),
        justification: project.justification || '',
        boundaryCode: project.boundary_code || '',
        subProgramCode: project.sub_program_code || '',
        asd1: project.asd_1 || '', asd2: project.asd_2 || '', asd3: project.asd_3 || '', asd4: project.asd_4 || '',
        asd5: project.asd_5 || '', asd6: project.asd_6 || '', asd7: project.asd_7 || '', asd8: project.asd_8 || '',
        asd9: project.asd_9 || '', asd10: project.asd_10 || '', asd11: project.asd_11 || '',
      });

      setComponents(comps.map(c => ({
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
        alternateId: c.alternate_id || '',
        programStage: c.program_stage || ''
      })));

      setSpecificDetails(specs.map(s => ({
        compId: s.comp_id_ref,
        infraId: s.infra_item,
        startLimit: s.start_limit,
        endLimit: s.end_limit,
        startChainage: s.start_chainage,
        endChainage: s.end_chainage,
        startX: s.start_x || '',
        startY: s.start_y || '',
        endX: s.end_x || '',
        endY: s.end_y || '',
        length: s.length_m,
        scope: s.detailed_scope_of_work,
        target: s.target_amount,
        cost: s.cost_per_line,
        lanes: s.num_lanes || 0,
        dominant: s.dominant || false,
        alternateId: s.alternate_id || '',
        programStage: s.program_stage || '',
        originalRemarks: s.original_remarks || '',
        revisedRemarks: s.revised_remarks || '',
        infraType: s.infra_type || ''
      })));

    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  // Handle Save
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // 1. Check if Supabase is properly configured
      const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

      if (!isSupabaseConfigured) {
        console.warn('Supabase not configured. Using localStorage fallback.');

        const projectId = formData.id || crypto.randomUUID();
        const newProject = {
          ...formData,
          id: projectId,
          components,
          specificDetails,
          totalCost,
          createdAt: formData.id ? (formData as any).createdAt : new Date().toISOString()
        };

        const existingProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
        let updatedList;
        if (formData.id) {
          updatedList = existingProjects.map((p: any) => p.id === formData.id ? newProject : p);
        } else {
          updatedList = [...existingProjects, newProject];
        }
        localStorage.setItem('rbp_projects', JSON.stringify(updatedList));

        alert(formData.id ? 'Project updated locally!' : 'Project saved locally!');
        if (!formData.id) {
          setFormData(prev => ({ ...prev, id: projectId }));
        }
        return;
      }

      // 1. Prepare Project Record
      const projectRecord = {
        alternate_id: formData.alternateId,
        project_name: formData.projectDescription,
        project_amount: formData.projectAmount || totalCost,
        project_category: formData.category,
        thrust: formData.thrust,
        project_origin: formData.projectOrigin,
        funding_agreement_name: formData.fundingAgreementName,
        implementing_office: formData.io,
        city_municipality: formData.municipality,
        barangay: formData.barangay,
        district_engineering_office: formData.deo,
        legislative_district: formData.ld,
        operating_unit: formData.ou,
        originating_agency: formData.originatingAgency,
        thrust_code: formData.thrustCode,
        region_wide: formData.isRegionwide,
        start_year: parseInt(formData.fiscalYear),
        reporting_region: formData.region,
        program_stage: formData.programStage,
        tier: formData.priorityTier,
        rank: formData.priorityRank ? parseInt(formData.priorityRank as string) : null,
        justification: formData.justification,
        boundary_code: formData.boundaryCode,
        sub_program_code: formData.subProgramCode,
        asd_1: formData.asd1, asd_2: formData.asd2, asd_3: formData.asd3, asd_4: formData.asd4,
        asd_5: formData.asd5, asd_6: formData.asd6, asd_7: formData.asd7, asd_8: formData.asd8,
        asd_9: formData.asd9, asd_10: formData.asd10, asd_11: formData.asd11,
      };

      let projectId = formData.id;

      if (projectId) {
        // UPDATE
        const { error: pError } = await supabase.from('projects').update(projectRecord).eq('id', projectId);
        if (pError) throw pError;

        // Delete old sub-records and re-insert (simple way to sync)
        await supabase.from('project_components').delete().eq('project_id', projectId);
        await supabase.from('project_infra_activities').delete().eq('project_id', projectId);
      } else {
        // INSERT
        const { data: project, error: pError } = await supabase.from('projects').insert([projectRecord]).select().single();
        if (pError) throw pError;
        projectId = project.id;
      }

      // 2. Insert Components
      if (components.length > 0) {
        const componentsToInsert = components.map(c => ({
          project_id: projectId,
          comp_id_display: c.id,
          comp_type: c.compType,
          comp_amount: c.cost,
          planned_start_date: c.start || null,
          planned_end_date: c.end || null,
          start_year: parseInt(formData.fiscalYear),
          infra_type: c.infraType,
          infra_name: c.infraName,
          type_of_work: c.workType,
          target_unit: c.unit,
          physical_target: c.target,
          unit_cost: c.unitCost,
          alternate_id: c.alternateId,
          program_stage: c.programStage
        }));
        const { error: cError } = await supabase.from('project_components').insert(componentsToInsert);
        if (cError) throw cError;
      }

      // 3. Insert Specific Details
      if (specificDetails.length > 0) {
        const specificsToInsert = specificDetails.map(s => ({
          project_id: projectId,
          comp_id_ref: s.compId,
          infra_item: s.infraId,
          start_station_limit: s.startLimit,
          end_station_limit: s.endLimit,
          start_chainage: s.startChainage,
          end_chainage: s.endChainage,
          start_x: s.startX,
          start_y: s.startY,
          end_x: s.endX,
          end_y: s.endY,
          length_m: s.length,
          detailed_scope_of_work: s.scope,
          target_amount: s.target,
          cost_per_line: s.cost,
          dominant: s.dominant,
          year: parseInt(formData.fiscalYear),
          alternate_id: s.alternateId,
          program_stage: s.programStage,
          original_remarks: s.originalRemarks,
          revised_remarks: s.revisedRemarks,
          infra_type: s.infraType
        }));
        const { error: sError } = await supabase.from('project_infra_activities').insert(specificsToInsert);
        if (sError) throw sError;
      }

      alert('Project saved successfully to Supabase!');
    } catch (err: any) {
      console.error('Save failed:', err, JSON.stringify(err));

      // Secondary fallback on error
      if (err.message?.includes('failed to fetch') || err.name === 'TypeError') {
        const newProject = {
          ...formData, // Already contains id if exists
          id: formData.id || crypto.randomUUID(),
          components,
          specificDetails,
          totalCost,
          error: err.message,
          createdAt: new Date().toISOString()
        };
        const existingProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
        localStorage.setItem('rbp_projects', JSON.stringify([...existingProjects, newProject]));
        alert('Supabase connection failed. Project saved locally instead.');
      } else {
        alert('Error saving project: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Reset dependent fields
      if (field === 'region') { next.deo = ''; next.io = ''; }
      if (field === 'deo') { next.municipality = ''; next.ld = ''; }
      if (field === 'municipality') next.barangay = '';
      if (field === 'category') next.thrust = '';
      if (field === 'thrust') {
        // We probably shouldn't just reset components, but component infra type relies on it
      }
      return next;
    });
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const newComps = [...components];
    let updatedComp = { ...newComps[index], [field]: value };

    // Auto-fill Unit if workType changes
    if (field === 'workType') {
      const uom = (codes.uoms as any)[value];
      if (uom) updatedComp.unit = uom;
    }

    newComps[index] = updatedComp;
    setComponents(newComps);
  };

  const updateSpecificDetail = (index: number, field: string, value: any) => {
    const newDetails = [...specificDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setSpecificDetails(newDetails);
  };

  // Sync Component Totals from Specific Details
  useEffect(() => {
    setComponents(prevComps => {
      return prevComps.map(comp => {
        const relatedDetails = specificDetails.filter(d => d.compId === comp.id);
        const totalTarget = relatedDetails.reduce((sum, d) => sum + (d.target || 0), 0);
        const totalCost = relatedDetails.reduce((sum, d) => sum + (d.cost || 0), 0);
        const unitCost = totalTarget > 0 ? totalCost / totalTarget : 0;

        return {
          ...comp,
          target: totalTarget,
          cost: totalCost,
          unitCost: unitCost
        };
      });
    });
  }, [specificDetails]);

  const addComponent = () => {
    const nextId = `C${components.length + 1}-01`;
    setComponents([...components, { id: nextId, compType: '', infraType: '', infraName: '', workType: '', unit: '', target: 0, cost: 0, unitCost: 0, start: '', end: '', calendar: 0, alternateId: '', programStage: '' }]);
  };

  const removeComponent = (index: number) => {
    if (components.length > 1) {
      setComponents(components.filter((_, i) => i !== index));
    }
  };

  const addSpecificDetail = () => {
    setSpecificDetails([...specificDetails, { compId: 'C1-01', infraId: '', startLimit: '', endLimit: '', startChainage: '', endChainage: '', startX: '', startY: '', endX: '', endY: '', length: 0, scope: '', target: 0, cost: 0, lanes: 0, dominant: false, alternateId: '', programStage: '', originalRemarks: '', revisedRemarks: '', infraType: '' }]);
  };

  const removeSpecificDetail = (index: number) => {
    if (specificDetails.length > 1) {
      setSpecificDetails(specificDetails.filter((_, i) => i !== index));
    }
  };

  const totalCost = components.reduce((sum, comp) => sum + comp.cost, 0);

  const getInfraNameOptions = (infraType: string) => {
    if (!infraType) return [];
    
    // determine key: prefer DEO if exists, else Region
    const geoKey = formData.deo ? formData.deo : formData.region;
    const lookupField = formData.deo ? 'deo' : (formData.region ? 'region' : null);
    
    if (!geoKey || !lookupField) return [];

    const getList = (prefix: string) => {
      const db = (infraCodes as any)[`${lookupField}_to_${prefix}`];
      return db ? (db[geoKey] || []) : [];
    };

    if (infraType === 'Roads') {
      return [
        { label: 'National Roads', options: getList('national_roads') },
        { label: 'Future Roads', options: getList('future_roads') }
      ];
    } else if (infraType === 'Bridges') {
      return [
        { label: 'National Bridges', options: getList('national_bridges') },
        { label: 'Future Bridges', options: getList('future_bridges') }
      ];
    }

    // Default or other infra types
    return [];
  };

  const getInfraIdOptions = (compId: string) => {
    if (!compId) return [];
    const comp = components.find(c => c.id === compId);
    if (!comp || !comp.infraName) return [];
    
    const db = infraCodes as any;
    if (comp.infraType === 'Roads') {
      return [
        ...(db.road_name_to_sections?.[comp.infraName] || []),
        ...(db.future_road_to_sections?.[comp.infraName] || [])
      ];
    } else if (comp.infraType === 'Bridges') {
      return [
        ...(db.bridge_name_to_ids?.[comp.infraName] || []),
        ...(db.future_bridge_to_ids?.[comp.infraName] || [])
      ];
    }
    return [];
  };

  const generateDescription = () => {
    const grouped = specificDetails.reduce((acc, det) => {
      if (!det.compId) return acc;
      const comp = components.find(c => c.id === det.compId);
      if (!comp || !comp.infraName) return acc;

      const key = `${comp.id}_${comp.infraName}`;
      if (!acc[key]) {
        acc[key] = {
          infraName: comp.infraName,
          infraType: comp.infraType,
          details: []
        };
      }
      acc[key].details.push(det);
      return acc;
    }, {} as any);

    const descParts: string[] = [];
    for (const key of Object.keys(grouped)) {
      const g = grouped[key];
      if (g.infraType === 'Roads') {
        const chains = g.details
          .filter((d: any) => d.startLimit || d.endLimit)
          .map((d: any) => `${d.startLimit || '?'} - ${d.endLimit || '?'}`)
          .join(', ');
        if (chains) {
          descParts.push(`${g.infraName} - ${chains}`);
        } else {
          descParts.push(g.infraName);
        }
      } else if (g.infraType === 'Bridges') {
        const d0 = g.details[0]; // Take first bridge detail
        if (d0) {
           const infraIdText = d0.infraId ? `(${d0.infraId})` : '';
           const scopeText = d0.scope ? `along ${d0.scope}` : '';
           descParts.push(`${g.infraName} ${infraIdText} ${scopeText}`.trim().replace(/\s+/g, ' '));
        } else {
           descParts.push(g.infraName);
        }
      } else {
        descParts.push(g.infraName);
      }
    }

    if (descParts.length > 0) {
      setFormData(prev => ({
        ...prev,
        projectDescription: descParts.join('; ')
      }));
    }
  };

  return (
    <>
      <div className={styles.container}>

        {/* Header / Nav */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard/rbp" className={styles.backBtn}>
              <span className={`material-symbols-outlined ${styles.headerIcon}`}>arrow_back_ios_new</span>
            </Link>
            <div className={styles.headerTitleBox}>
              <h1 className={styles.headerTitle}>RIF v.9.0</h1>
              <p className={styles.headerSubtitle}>Regional Budget Proposal (RBP)</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={`material-symbols-outlined ${styles.headerIcon}`}>notifications</span>
            <div className={styles.backBtn}>
              <span className="material-symbols-outlined">person</span>
            </div>
          </div>
        </header>

        {/* Location / Office Information */}
        <section className={styles.glassCard}>
          <div className={styles.sectionHeader}>
            <span className={`material-symbols-outlined ${styles.sectionIcon}`}>location_on</span>
            <h2 className={styles.sectionTitle}>Location / Office Information</h2>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Region</label>
              <select
                className={styles.input}
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
              >
                <option value="">Select Region</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Implementing Office (IO)</label>
              <select
                className={styles.input}
                value={formData.io}
                onChange={(e) => handleInputChange('io', e.target.value)}
                disabled={!formData.region}
              >
                <option value="">Select IO</option>
                {implementingOffices.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>DEO</label>
                <select
                  className={styles.input}
                  value={formData.deo}
                  onChange={(e) => handleInputChange('deo', e.target.value)}
                  disabled={!formData.region}
                >
                  <option value="">Select DEO</option>
                  {deos.map((d: any) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>LD (Legislative District)</label>
                <select
                  className={styles.input}
                  value={formData.ld}
                  onChange={(e) => handleInputChange('ld', e.target.value)}
                  disabled={!formData.deo}
                >
                  <option value="">Select LD</option>
                  {legislativeDistricts.map((ld: string) => <option key={ld} value={ld}>{ld}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Municipality</label>
                <select
                  className={styles.input}
                  value={formData.municipality}
                  onChange={(e) => handleInputChange('municipality', e.target.value)}
                  disabled={!formData.deo}
                >
                  <option value="">Select Mun.</option>
                  {municipalities.map((m: any) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Barangay</label>
                <select
                  className={styles.input}
                  value={formData.barangay || ''}
                  onChange={(e) => handleInputChange('barangay', e.target.value)}
                  disabled={!formData.municipality}
                >
                  <option value="">Select Brgy.</option>
                  {barangays.map((b: string) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Operating Unit (OU)</label>
                <select
                  className={styles.input}
                  value={formData.ou}
                  onChange={(e) => handleInputChange('ou', e.target.value)}
                >
                  <option value="">Select OU</option>
                  {offices.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                {/* Empty block to keep layout grid balanced if necessary, or put Regionwide checkbox here */}
              </div>
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="regionwide"
                  className={styles.checkbox}
                  checked={formData.isRegionwide}
                  onChange={(e) => handleInputChange('isRegionwide', e.target.checked)}
                />
                <label htmlFor="regionwide" className={styles.label} style={{ margin: 0 }}>Regionwide</label>
              </div>
            </div>
          </div>
        </section>

        {/* General Details */}
        <section className={styles.glassCard}>
          <div className={styles.sectionHeader}>
            <span className={`material-symbols-outlined ${styles.sectionIcon}`}>description</span>
            <h2 className={styles.sectionTitle}>General Details</h2>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Alternate ID</label>
                <input
                  type="text"
                  placeholder="ID No."
                  className={styles.input}
                  value={formData.alternateId}
                  onChange={(e) => handleInputChange('alternateId', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Fiscal Year</label>
                <select
                  className={styles.input}
                  value={formData.fiscalYear}
                  onChange={(e) => handleInputChange('fiscalYear', e.target.value)}
                >
                  <option value="">Select Year</option>
                  {fiscalYears.map((y: string) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Thrust</label>
              <select
                className={styles.input}
                value={formData.thrust}
                onChange={(e) => handleInputChange('thrust', e.target.value)}
              >
                <option value="">Select Sub-Program (Thrust)</option>
                {trusts.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.input}
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select Project Category</option>
                {projectCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Project Description</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                placeholder="Enter full project description..."
                value={formData.projectDescription}
                onChange={(e) => handleInputChange('projectDescription', e.target.value)}
              ></textarea>
            </div>
          </div>
        </section>

        {/* Priority & Justification */}
        <section className={styles.glassCard}>
          <div className={styles.sectionHeader}>
            <span className={`material-symbols-outlined ${styles.sectionIcon}`}>low_priority</span>
            <h2 className={styles.sectionTitle}>Priority & Justification</h2>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tier</label>
                <input
                  type="text"
                  placeholder="Tier"
                  className={styles.input}
                  value={formData.priorityTier}
                  onChange={(e) => handleInputChange('priorityTier', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Rank</label>
                <input
                  type="number"
                  placeholder="Rank"
                  className={styles.input}
                  value={formData.priorityRank}
                  onChange={(e) => handleInputChange('priorityRank', e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Justification</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                placeholder="Enter justification..."
                value={formData.justification}
                onChange={(e) => handleInputChange('justification', e.target.value)}
              ></textarea>
            </div>
          </div>
        </section>

        {/* Component Details */}
        <section className={`${styles.glassCard} p-0 overflow-hidden`}>
          <div className={styles.tableHeader}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <span className={`material-symbols-outlined ${styles.sectionIcon}`}>view_quilt</span>
              <h2 className={styles.sectionTitle}>Component Details</h2>
            </div>
            <button className={styles.btnAdd} onClick={addComponent}>
              <span className="material-symbols-outlined">add</span>
              Add Component
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Comp ID</th>
                  <th className={styles.th}>Comp Type</th>
                  <th className={styles.th}>Infra Type</th>
                  <th className={styles.th}>Infra Name</th>
                  <th className={styles.th}>Type of Work</th>
                  <th className={styles.th}>UOM</th>
                  <th className={styles.th}>Target</th>
                  <th className={styles.th}>Cost (PHP)</th>
                  <th className={styles.th}>Unit Cost</th>
                  <th className={styles.th}>Start</th>
                  <th className={styles.th}>End</th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp, idx) => (
                  <tr key={idx}>
                    <td className={styles.td}><input type="text" className={styles.tableInput} value={comp.id || ''} onChange={(e) => updateComponent(idx, 'id', e.target.value)} /></td>
                    <td className={styles.td}>
                      <select className={styles.tableInput} value={comp.compType || ''} onChange={(e) => updateComponent(idx, 'compType', e.target.value)}>
                        <option value="">Type</option>
                        {componentTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <select className={styles.tableInput} value={comp.infraType || ''} onChange={(e) => updateComponent(idx, 'infraType', e.target.value)} disabled={!formData.thrust}>
                        <option value="">Select</option>
                        {infraTypesForThrust.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <select className={styles.tableInput} value={comp.infraName || ''} onChange={(e) => updateComponent(idx, 'infraName', e.target.value)} disabled={!comp.infraType}>
                        <option value="">Select Infra</option>
                        {getInfraNameOptions(comp.infraType).map((group, gIdx) => (
                          <optgroup key={gIdx} label={group.label}>
                            {group.options.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <select className={styles.tableInput} value={comp.workType || ''} onChange={(e) => updateComponent(idx, 'workType', e.target.value)} disabled={!comp.infraType}>
                        <option value="">Select Type of Work</option>
                        {comp.infraType && ((codes as any).infra_to_tow?.[comp.infraType] || []).map((w: string) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} value={comp.unit || ''} onChange={(e) => updateComponent(idx, 'unit', e.target.value)} /></td>
                    <td className={styles.td}><input type="number" className={styles.tableInput} value={comp.target || 0} readOnly disabled /></td>
                    <td className={styles.tdCost}><input type="number" className={styles.tableInput} style={{ textAlign: 'right' }} value={comp.cost || 0} readOnly disabled /></td>
                    <td className={styles.td}><input type="number" className={styles.tableInput} value={(comp.unitCost || 0).toFixed(2)} readOnly disabled /></td>
                    <td className={styles.td}><input type="date" className={styles.tableInput} value={comp.start || ''} onChange={(e) => updateComponent(idx, 'start', e.target.value)} /></td>
                    <td className={styles.td}><input type="date" className={styles.tableInput} value={comp.end || ''} onChange={(e) => updateComponent(idx, 'end', e.target.value)} /></td>
                    <td className={styles.td}>
                      <button className={styles.btnIconOnly} onClick={() => removeComponent(idx)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Component Specific Details */}
        <section className={`${styles.glassCard} p-0 overflow-hidden`}>
          <div className={styles.tableHeader} style={{ padding: '1.5rem 1.5rem 0.5rem 1.5rem' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0, padding: 0 }}>
              <span className={`material-symbols-outlined ${styles.sectionIcon}`}>analytics</span>
              <h2 className={styles.sectionTitle}>Component Specific Details</h2>
            </div>
            <button className={styles.btnAdd} onClick={addSpecificDetail}>
              <span className="material-symbols-outlined">add</span>
              Add Detail
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Comp ID</th>
                  <th className={styles.th}>Infra ID</th>
                  <th className={styles.th}>Start Limit</th>
                  <th className={styles.th}>End Limit</th>
                  <th className={styles.th}>S. Chainage</th>
                  <th className={styles.th}>E. Chainage</th>
                  <th className={styles.th}>S.X</th>
                  <th className={styles.th}>S.Y</th>
                  <th className={styles.th}>E.X</th>
                  <th className={styles.th}>E.Y</th>
                  <th className={styles.th}>Length(m)</th>
                  <th className={styles.th}>Work/Scope</th>
                  <th className={styles.th}>Target</th>
                  <th className={styles.th}>Cost(PHP)</th>
                  <th className={styles.th}>Lanes</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {specificDetails.map((det, idx) => (
                  <tr key={idx}>
                    <td className={styles.td}>
                      <select className={styles.tableInput} value={det.compId || ''} onChange={(e) => updateSpecificDetail(idx, 'compId', e.target.value)}>
                        <option value="">Select ID</option>
                        {components.filter(c => c.id).map(c => (
                          <option key={c.id} value={c.id}>{c.id}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <input 
                        type="text" 
                        className={styles.tableInput} 
                        value={det.infraId || ''} 
                        onChange={(e) => updateSpecificDetail(idx, 'infraId', e.target.value)} 
                        list={`infra-ids-${idx}`}
                        placeholder="ID"
                      />
                      <datalist id={`infra-ids-${idx}`}>
                        {getInfraIdOptions(det.compId).map((opt: string) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} value={det.startLimit || ''} onChange={(e) => updateSpecificDetail(idx, 'startLimit', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} value={det.endLimit || ''} onChange={(e) => updateSpecificDetail(idx, 'endLimit', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} value={det.startChainage || ''} onChange={(e) => updateSpecificDetail(idx, 'startChainage', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} value={det.endChainage || ''} onChange={(e) => updateSpecificDetail(idx, 'endChainage', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} placeholder="S.X" value={det.startX || ''} onChange={(e) => updateSpecificDetail(idx, 'startX', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} placeholder="S.Y" value={det.startY || ''} onChange={(e) => updateSpecificDetail(idx, 'startY', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} placeholder="E.X" value={det.endX || ''} onChange={(e) => updateSpecificDetail(idx, 'endX', e.target.value)} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} placeholder="E.Y" value={det.endY || ''} onChange={(e) => updateSpecificDetail(idx, 'endY', e.target.value)} /></td>
                    <td className={styles.td}><input type="number" className={styles.tableInput} value={det.length || 0} placeholder="Length" onChange={(e) => updateSpecificDetail(idx, 'length', parseFloat(e.target.value))} /></td>
                    <td className={styles.td}><input type="text" className={styles.tableInput} placeholder="Scope of Work" value={det.scope || ''} onChange={(e) => updateSpecificDetail(idx, 'scope', e.target.value)} /></td>
                    <td className={styles.td}><input type="number" className={styles.tableInput} value={det.target || 0} placeholder="Target" onChange={(e) => updateSpecificDetail(idx, 'target', parseFloat(e.target.value))} /></td>
                    <td className={styles.tdCost}><input type="number" className={styles.tableInput} style={{ textAlign: 'right' }} value={det.cost || 0} placeholder="Cost" onChange={(e) => updateSpecificDetail(idx, 'cost', parseFloat(e.target.value))} /></td>
                    <td className={styles.td}><input type="number" className={styles.tableInput} value={det.lanes || 0} onChange={(e) => updateSpecificDetail(idx, 'lanes', parseInt(e.target.value))} /></td>
                    <td className={styles.td}>
                      <button className={styles.btnIconOnly} onClick={() => removeSpecificDetail(idx)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Floating Action Bar */}
      <div className={styles.floatingBar}>
        <button className={`${styles.btnPrimary} ${styles.btnGreen}`} onClick={() => exportToExcel(formData, components, specificDetails)}>
          <span className="material-symbols-outlined">download</span>
          Download Excel (RBP)
        </button>

        <button className={`${styles.btnPrimary} ${styles.btnOrange}`} onClick={generateDescription}>
          <span className="material-symbols-outlined">auto_awesome</span>
          Generate Description
        </button>

        <div className={styles.rowBtns}>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Project'}
          </button>
          <button className={styles.btnSecondary} onClick={() => window.location.reload()}>
            Clear
          </button>
          <button
            className={styles.btnDanger}
            onClick={() => {
              if (formData.id) {
                // We need a local way to delete too, but let's just use the dashboard for now or add it here
                if (confirm('Are you sure you want to delete this project?')) {
                  const localProjects = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
                  const filtered = localProjects.filter((p: any) => p.id !== formData.id);
                  localStorage.setItem('rbp_projects', JSON.stringify(filtered));
                  window.location.href = '/dashboard/rbp';
                }
              }
            }}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </>
  );
}
