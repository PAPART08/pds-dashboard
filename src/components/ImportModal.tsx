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

            const projectDataSheet = workbook.Sheets['Project Data'];
            const majorWorkSheet = workbook.Sheets['Major Items of Work'];

            if (!projectDataSheet) {
                alert('Project Data sheet missing!');
                return;
            }

            const projectsJson: any[] = XLSX.utils.sheet_to_json(projectDataSheet);
            const workJson: any[] = XLSX.utils.sheet_to_json(majorWorkSheet);

            // Group work items by Project IDs
            const projectsWithWork = projectsJson.map(pInput => {
                // Helper to safely get mapped key ignoring case and trim
                const getVal = (obj: any, keyName: string) => {
                    const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
                    return foundKey ? obj[foundKey] : undefined;
                };

                // For 'p' input from Project Data
                const p = new Proxy(pInput, {
                    get: (target, prop: string) => getVal(target, prop)
                });

                const pId = p['Project IDs'] || p['Project ID'];
                const specificDetails = workJson.filter(wInput => {
                    const w = new Proxy(wInput, { get: (t, k: string) => getVal(t, k) });
                    return (w['Project IDs'] || w['Project ID']) === pId;
                }).map(wInput => {
                    const w = new Proxy(wInput, { get: (t, k: string) => getVal(t, k) });
                    return {
                        compId: w['Component ID'],
                        infraId: w['Infrastructure Item'],
                        startChainage: w['Start Chainage'],
                        endChainage: w['End Chainage'],
                        length: w['Length'],
                        scope: w['Type of work'] || w['Detailed Scope of Work'],
                        target: w['Target Amount'],
                        cost: w['Cost per Line'],
                        startX: w['Start X'],
                        startY: w['Start Y'],
                        endX: w['End X'],
                        endY: w['End Y'],
                        dominant: w['Dominant'] === 'Yes',
                        startLimit: w['Start Station Limit'],
                        endLimit: w['End Station Limit'],
                        year: w['Year']
                    }
                });

                return {
                    id: crypto.randomUUID(), // New internal ID
                    alternateId: pId,
                    projectDescription: p['Project Name'],
                    totalCost: p['Amount'],
                    category: p['Project Category']?.toString().trim() || '',
                    thrust: p['Thrust']?.toString().trim() || '',
                    subProgramCode: p['Thrust'] ? THRUST_TO_SUB_PROGRAM[p['Thrust'].toString().trim()] || '' : '',
                    io: p['Implementing Office'],
                    municipality: p['City / Municipality'],
                    deo: p['District Engineering Office'],
                    ld: p['Legislative District'],
                    ou: p['Operating Unit'],
                    region: p['Reporting Region'],
                    isRegionwide: p['Region Wide'] === 'Yes',
                    fiscalYear: p['Start Year']?.toString(),
                    priorityRank: p['Rank']?.toString(),
                    priorityTier: p['Tier'],
                    justification: p['Project Notes'],
                    specificDetails,
                    components: [
                        {
                            id: p['Component ID'] || 'C1-01',
                            compType: p['Component Type'],
                            infraName: p['Component Name'],
                        }
                    ]
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
