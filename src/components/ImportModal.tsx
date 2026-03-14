'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { THRUST_TO_SUB_PROGRAM } from '@/lib/thrust-mapping';
import styles from './ImportModal.module.css';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (projects: any[], strategy: 'merge' | 'overwrite' | 'replace') => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [strategy, setStrategy] = useState<'merge' | 'overwrite' | 'replace'>('merge');

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            // Case-insensitive sheet lookup
            const sheetNames = Object.keys(workbook.Sheets);
            const dataSheetName = sheetNames.find(n => n.trim().toLowerCase() === 'project data');
            const workSheetName = sheetNames.find(n => n.trim().toLowerCase() === 'major items of work');

            if (!dataSheetName) {
                alert('Project Data sheet missing!');
                return;
            }

            const projectDataSheet = workbook.Sheets[dataSheetName];
            const majorWorkSheet = workSheetName ? workbook.Sheets[workSheetName] : null;

            const projectsJson: any[] = XLSX.utils.sheet_to_json(projectDataSheet);
            const workJson: any[] = majorWorkSheet ? XLSX.utils.sheet_to_json(majorWorkSheet) : [];

            // Helper to safely get mapped key ignoring case and trim
            const getVal = (obj: any, keyNames: string | string[]) => {
                const keys = Array.isArray(keyNames) ? keyNames : [keyNames];
                for (const key of keys) {
                    const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === key.toLowerCase());
                    if (foundKey) return obj[foundKey];
                }
                return undefined;
            };

            const UNIT_ALIASES = ['Unit of Measure', 'UOM', 'Unit', 'UoM', 'U.O.M.', 'Units', 'Measure'];
            const WORK_TYPE_ALIASES = ['Type of work', 'Detailed Scope of Work', 'Work Type', 'Scope', 'Activity Type', 'Scope of Work'];
            const COMP_TYPE_ALIASES = ['Component Type', 'Comp Type', 'Category of Work', 'Work Category', 'Category'];
            const INFRA_TYPE_ALIASES = ['Infrastructure Type', 'Infra Type', 'Infrastructure', 'Road/Bridge'];
            const INFRA_NAME_ALIASES = ['Infrastructure Name', 'Infra Name', 'Component Name', 'Infrastructure', 'Infra', 'Item Name', 'Infrastructure Item', 'Asset Name', 'Road ID', 'Bridge ID', 'Section ID', 'Component Description', 'Infrastructure ID', 'Infra ID', 'Asset ID'];
            const COMP_ID_ALIASES = ['Component ID', 'Comp ID', 'Comp. ID', 'Comp', 'Component', 'Item Number', 'Item'];
            const ORIGIN_ALIASES = ['Project Origin', 'Origin', 'Source of Project'];
            const FUNDING_ALIASES = ['Funding Agreement Name', 'Funding Name', 'Agreement Name', 'Funding Agreement'];
            const AGENCY_ALIASES = ['Originating Agency', 'Agency', 'Source Agency'];

            const INFRA_TYPE_MAP: Record<string, string> = {
                'R': 'Roads',
                'ROAD': 'Roads',
                'ROADS': 'Roads',
                'B': 'Bridges',
                'BRIDGE': 'Bridges',
                'BRIDGES': 'Bridges',
                'F_ROAD': 'Future Roads',
                'F_BRIDGE': 'Future Bridges',
                'FR': 'Future Roads',
                'FB': 'Future Bridges'
            };

            const normalizeInfraType = (val: any) => {
                const s = String(val || '').trim();
                const upper = s.toUpperCase();
                return INFRA_TYPE_MAP[upper] || s;
            };

            const normalizeId = (id: any) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            const guessUnit = (infraType: string, workType: string, existing: any) => {
                if (existing && String(existing).trim()) return existing;
                const type = (infraType || '').toLowerCase();
                const work = (workType || '').toLowerCase();
                
                if (type.includes('bridge')) return 'lm';
                if (type.includes('road')) return 'km';
                if (work.includes('asphalt') || work.includes('concrete')) return 'km';
                if (type.includes('building') || type.includes('school')) return 'sq.m';
                if (work.includes('rehabilitation') && type.includes('building')) return 'sq.m';
                if (type.includes('flood') || type.includes('drainage')) return 'lm';
                if (work.includes('construction') && type.includes('building')) return 'sq.m';
                
                return ''; // Leave empty if we can't be sure
            };

            // Pre-group all work items by Project ID into a Map — O(n+m) instead of O(n×m)
            const workByProjectId = new Map<string, any[]>();
            for (const wInput of workJson) {
                const w = new Proxy(wInput, { get: (t, k: string) => getVal(t, k) });
                // Robust ID extraction
                const rawWId = getVal(wInput, ['Project IDs', 'Project ID', 'ID', 'MYPS ID']);
                const wId = String(rawWId || '').trim();
                
                if (wId) {
                    if (!workByProjectId.has(wId)) workByProjectId.set(wId, []);
                    workByProjectId.get(wId)!.push(wInput);
                }
            }

            // Group work items by Project IDs
            const projectsWithWork = projectsJson.map(pInput => {
                // For 'p' input from Project Data
                const p = new Proxy(pInput, {
                    get: (target, prop: string) => getVal(target, prop)
                });

                const rawPId = getVal(pInput, ['Project IDs', 'Project ID', 'ID', 'MYPS ID']);
                const pId = String(rawPId || '').trim();

                const normPId = normalizeId(pId);
                // 1. Specific Details — fuzzy match via normalized IDs
                const matchedWork = Array.from(workByProjectId.values()).flat().filter((w: any) => normalizeId(getVal(w, ['Project IDs', 'Project ID', 'ID', 'MYPS ID'])) === normPId);
                const specificDetails = matchedWork.map(wInput => {
                    const w = new Proxy(wInput, { get: (t, k: string) => getVal(t, k) });
                    return {
                        compId: String(getVal(wInput, COMP_ID_ALIASES) || '').trim(),
                        infraId: String(getVal(wInput, INFRA_NAME_ALIASES) || '').trim(),
                        startChainage: getVal(wInput, ['Start Chainage', 'S. Chainage']),
                        endChainage: getVal(wInput, ['End Chainage', 'E. Chainage']),
                        length: getVal(wInput, ['Length', 'Length(m)', 'Length (m)']),
                        scope: getVal(wInput, WORK_TYPE_ALIASES),
                        target: getVal(wInput, ['Target Amount', 'Target', 'Physical Target']),
                        cost: getVal(wInput, ['Cost per Line', 'Cost']),
                        startX: getVal(wInput, ['Start X', 'S.X']),
                        startY: getVal(wInput, ['Start Y', 'S.Y']),
                        endX: getVal(wInput, ['End X', 'E.X']),
                        endY: getVal(wInput, ['End Y', 'E.Y']),
                        dominant: String(getVal(wInput, 'Dominant')).toLowerCase() === 'yes',
                        startLimit: getVal(wInput, ['Start Station Limit', 'Start Limit', 'S. Limit']),
                        endLimit: getVal(wInput, ['End Station Limit', 'End Limit', 'E. Limit']),
                        year: getVal(wInput, ['Year', 'Fiscal Year']),
                        infraType: normalizeInfraType(getVal(wInput, INFRA_TYPE_ALIASES)),
                        lanes: getVal(wInput, ['No. of Lanes', 'Lanes', 'Num Lanes']),
                        alternateId: getVal(wInput, ['Work Item ID', 'Activity ID', 'Alternate ID']),
                        programStage: getVal(wInput, ['Status', 'Program Stage', 'Status/Level of Readiness']),
                        originalRemarks: getVal(wInput, ['Original Remarks', 'Remarks']),
                        revisedRemarks: getVal(wInput, ['Revised Remarks'])
                    }
                });

                // 2. Components (Derived from Project Data AND Specific Details)
                const rawComponents: any[] = [];
                const pCompId = String(getVal(pInput, COMP_ID_ALIASES) || '').trim();
                const normCompId = normalizeId(pCompId);
                
                if (pCompId) {
                    const firstMatch = matchedWork.find(w => normalizeId(getVal(w, COMP_ID_ALIASES)) === normCompId);
                    const iType = normalizeInfraType(getVal(pInput, INFRA_TYPE_ALIASES) || getVal(firstMatch, INFRA_TYPE_ALIASES) || '');
                    const wType = getVal(pInput, WORK_TYPE_ALIASES) || getVal(firstMatch, WORK_TYPE_ALIASES) || '';
                    
                    rawComponents.push({
                        id: pCompId,
                        compType: normalizeInfraType(getVal(pInput, COMP_TYPE_ALIASES) || getVal(firstMatch, COMP_TYPE_ALIASES) || ''),
                        infraName: getVal(pInput, INFRA_NAME_ALIASES) || getVal(firstMatch, INFRA_NAME_ALIASES) || '',
                        infraType: iType,
                        workType: wType,
                        unit: guessUnit(iType, wType, getVal(pInput, UNIT_ALIASES) || getVal(firstMatch, UNIT_ALIASES)),
                        start: getVal(pInput, ['Start Date', 'Start']),
                        end: getVal(pInput, ['End Date', 'End']),
                        calendar: getVal(pInput, ['Calendar Days', 'Duration']),
                        alternateId: getVal(pInput, ['Component Alternate ID', 'Comp Alt ID', 'Alternate ID']) || getVal(firstMatch, ['Component Alternate ID', 'Comp Alt ID', 'Alternate ID']) || '',
                        programStage: getVal(pInput, ['Status', 'Program Stage', 'Status/Level of Readiness']) || getVal(firstMatch, ['Status', 'Program Stage', 'Status/Level of Readiness']) || ''
                    });
                }
 
                // Add any components found in specificDetails that aren't already there
                specificDetails.forEach(d => {
                    const normDCompId = normalizeId(d.compId);
                    if (d.compId && !rawComponents.find(c => normalizeId(c.id) === normDCompId)) {
                        const firstMatch = matchedWork.find(w => normalizeId(getVal(w, COMP_ID_ALIASES)) === normDCompId);
                        const iType = normalizeInfraType(getVal(firstMatch, INFRA_TYPE_ALIASES) || d.infraType || '');
                        const wType = getVal(firstMatch, WORK_TYPE_ALIASES) || '';
                        
                        rawComponents.push({
                            id: d.compId,
                            compType: normalizeInfraType(getVal(firstMatch, COMP_TYPE_ALIASES) || ''),
                            infraName: getVal(firstMatch, INFRA_NAME_ALIASES) || '',
                            infraType: iType,
                            workType: wType,
                            unit: guessUnit(iType, wType, getVal(firstMatch, UNIT_ALIASES)),
                            alternateId: getVal(firstMatch, ['Component Alternate ID', 'Comp Alt ID', 'Alternate ID']) || '',
                            programStage: getVal(firstMatch, ['Status', 'Program Stage', 'Status/Level of Readiness']) || ''
                        });
                    }
                });
 
                // Finalize components with aggregated costs/targets if needed
                const components = rawComponents.map(c => {
                    const related = specificDetails.filter((d: any) => d.compId === c.id);
                    const totalCost = related.reduce((sum: number, d: any) => sum + (Number(d.cost) || 0), 0);
                    const totalTarget = related.reduce((sum: number, d: any) => sum + (Number(d.target) || 0), 0);
                    
                    return {
                        ...c,
                        cost: totalCost,
                        target: totalTarget,
                        unitCost: totalTarget > 0 ? totalCost / totalTarget : 0,
                    };
                });

                return {
                    id: crypto.randomUUID(), 
                    alternateId: pId,
                    projectDescription: p['Project Name'],
                    totalCost: p['Amount'],
                    category: p['Project Category']?.toString().trim() || '',
                    thrust: p['Thrust']?.toString().trim() || '',
                    subProgramCode: p['Thrust'] ? THRUST_TO_SUB_PROGRAM[p['Thrust'].toString().trim()] || '' : '',
                    io: p['Implementing Office'],
                    municipality: p['City / Municipality'],
                    barangay: p['Barangay'] || '',
                    deo: p['District Engineering Office'],
                    ld: p['Legislative District'],
                    ou: p['Operating Unit'],
                    region: p['Reporting Region'],
                    isRegionwide: p['Region Wide'] === 'Yes',
                    fiscalYear: p['Start Year']?.toString(),
                    priorityRank: p['Rank']?.toString(),
                    priorityTier: p['Tier'],
                    projectOrigin: getVal(pInput, ORIGIN_ALIASES),
                    fundingAgreementName: getVal(pInput, FUNDING_ALIASES),
                    originatingAgency: getVal(pInput, AGENCY_ALIASES),
                    justification: p['Project Notes'],
                    programStage: p['Status/Level of Readiness'],
                    specificDetails,
                    components
                };
            });

            setPreview(projectsWithWork);
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Bulk Import Projects</h2>
                    <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>

                <div className={styles.body}>
                    <div className={styles.uploadSection}>
                        <p>Upload MYPS Import File (.xlsx)</p>
                        <input type="file" accept=".xlsx" onChange={handleFileChange} className={styles.fileInput} />
                    </div>

                    {preview.length > 0 && (
                        <div className={styles.previewSection}>
                            <p>Found <strong>{preview.length}</strong> projects. How would you like to handle conflicts?</p>

                            <div className={styles.strategyOptions}>
                                <label className={strategy === 'merge' ? styles.active : ''}>
                                    <input type="radio" value="merge" checked={strategy === 'merge'} onChange={() => setStrategy('merge')} />
                                    <span><strong>Merge</strong> (Keep existing, add new IDs)</span>
                                </label>
                                <label className={strategy === 'overwrite' ? styles.active : ''}>
                                    <input type="radio" value="overwrite" checked={strategy === 'overwrite'} onChange={() => setStrategy('overwrite')} />
                                    <span><strong>Overwrite</strong> (Update existing with same IDs)</span>
                                </label>
                                <label className={strategy === 'replace' ? styles.active : ''}>
                                    <input type="radio" value="replace" checked={strategy === 'replace'} onChange={() => setStrategy('replace')} />
                                    <span><strong>Replace All</strong> (Clear all and import new list)</span>
                                </label>
                            </div>

                            <div className={styles.previewList}>
                                {preview.slice(0, 5).map((p, i) => (
                                    <div key={i} className={styles.previewItem}>
                                        <span className={styles.pId}>{p.alternateId}</span>
                                        <span className={styles.pName}>{p.projectDescription}</span>
                                    </div>
                                ))}
                                {preview.length > 5 && <div className={styles.more}>+ {preview.length - 5} more projects</div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.btnSecondary}>Cancel</button>
                    <button
                        onClick={() => onImport(preview, strategy)}
                        className={styles.btnPrimary}
                        disabled={!file || preview.length === 0}
                    >
                        Start Import
                    </button>
                </div>
            </div>
        </div>
    );
}
