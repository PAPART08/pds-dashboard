'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import {
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Save,
    Bell,
    Search,
    AlertCircle
} from 'lucide-react';

const CalendarModule = dynamic(() => import('@/components/CalendarModule'), { ssr: false });

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
    docId?: string;
    projectId?: string;
    docCode?: string;
    type?: string;
    deadline?: string;
}

export default function UserTaskDashboard() {
    const [noteText, setNoteText] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserName, setCurrentUserName] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                // Get current user's name
                const savedUser = localStorage.getItem('currentUser');
                const currentUserName = savedUser ? JSON.parse(savedUser).name : '';
                setCurrentUserName(currentUserName);

                if (!currentUserName) {
                    setIsLoading(false);
                    return;
                }

                // 1. Fetch relational tasks
                const { data: relationalTasks, error: tError } = await supabase
                    .from('tasks')
                    .select(`
                        *,
                        projects (
                            id,
                            alternate_id,
                            project_name,
                            city_municipality,
                            project_amount,
                            start_year
                        )
                    `)
                    .eq('assignee_name', currentUserName)
                    .in('task_type', ['DOC_COMPLIANCE', 'PROJECT_LEAD']);

                // 2. Fetch projects that MIGHT have legacy assignments
                // (Fetching all for simplicity in a small app, or we could use fuzzy search)
                const { data: allProjects, error: pError } = await supabase.from('projects').select('*');

                if (tError) throw tError;
                if (pError) throw pError;

                const userAssignedTasks: Project[] = [];
                const seenTaskDocCodes = new Set(); // To avoid duplicates if both systems have the same task

                // A. Add Relational Tasks
                if (relationalTasks) {
                    relationalTasks.forEach((t: any) => {
                        const compositeKey = `${t.project_id}_${t.doc_code}`;
                        seenTaskDocCodes.add(compositeKey);
                        
                        userAssignedTasks.push({
                            id: t.id,
                            docId: `${t.projects?.alternate_id || t.projects?.id.substring(0, 8).toUpperCase()}-${t.doc_code}`,
                            title: t.projects?.project_name || 'Untitled Project',
                            location: t.projects?.city_municipality || 'Unspecified',
                            costValue: t.projects?.project_amount || 0,
                            stage: 'Preparation',
                            status: t.status,
                            createdAt: t.created_at,
                            fiscalYear: (t.projects?.start_year || 2025).toString(),
                            type: 'Assigned Document',
                            deadline: t.deadline,
                            projectId: t.project_id,
                            docCode: t.doc_code
                        });
                    });
                }

                // B. Add Legacy Tasks (not already in relational table)
                if (allProjects) {
                    allProjects.forEach(p => {
                        if (p.doc_assignments) {
                            Object.entries(p.doc_assignments).forEach(([docCode, assignee]) => {
                                if (assignee?.toLowerCase().trim() === currentUserName?.toLowerCase().trim()) {
                                    const compositeKey = `${p.id}_${docCode}`;
                                    if (!seenTaskDocCodes.has(compositeKey)) {
                                        userAssignedTasks.push({
                                            id: `legacy-${p.id}-${docCode}`,
                                            docId: `${p.alternate_id || p.id.substring(0, 8).toUpperCase()}-${docCode}`,
                                            title: p.project_name || 'Untitled Project',
                                            location: p.city_municipality || 'Unspecified',
                                            costValue: p.project_amount || 0,
                                            stage: 'Preparation',
                                            status: p.doc_statuses?.[docCode] || 'Drafting',
                                            createdAt: p.created_at,
                                            fiscalYear: (p.start_year || 2025).toString(),
                                            type: 'Legacy Assignment',
                                            deadline: p.doc_deadlines?.[docCode] || null,
                                            projectId: p.id,
                                            docCode: docCode
                                        });
                                    }
                                }
                            });
                        }
                    });
                }

                    // Fallback for demo (only if no real tasks found)
                    if (userAssignedTasks.length === 0 && currentUserName === 'Maria Dela Cruz') {
                        const sdList = ['PR', 'DUPA', 'SD-01'];
                        sdList.forEach(sd => {
                            userAssignedTasks.push({
                                id: `demo-${sd}`,
                                docId: `27B00123-${sd}`,
                                title: 'Bridge Replacement Project - Demo',
                                location: 'Silago, Southern Leyte',
                                costValue: 12500000,
                                stage: 'Preparation',
                                status: 'Drafting',
                                createdAt: new Date().toISOString(),
                                fiscalYear: '2025',
                                type: 'Demo Task'
                            });
                        });
                    }

                    setProjects(userAssignedTasks);
            } catch (err) {
                console.error('Error fetching tasks:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();

        // Load persisted notes
        const savedNotes = localStorage.getItem('user_strategic_notes');
        if (savedNotes) {
            setNoteText(savedNotes);
        }
    }, []);

    const handleSaveNote = () => {
        localStorage.setItem('user_strategic_notes', noteText);
        alert('Notes saved locally.');
    };

    // Calculate dynamic counts based on project data
    const todayStr = new Date().toISOString().split('T')[0];
    const dueTodayCount = projects.filter(p => p.deadline === todayStr).length;
    const upcomingCount = projects.filter(p => p.deadline && p.deadline > todayStr).length;
    
    // Overdue Logic: Deadline is past AND status is not Approved
    const overdueCount = projects.filter(p => 
        p.deadline && 
        p.deadline < todayStr && 
        p.status !== 'Approved'
    ).length;

    const displayProjects = projects; 

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectId: string, docCode: string, taskTableId: string) => {
        const file = e.target.files?.[0];
        if (!file || !projectId || !docCode) return;

        try {
            // 1. Upload to Supabase Storage
            const { uploadDocument } = await import('@/lib/storage');
            const { publicUrl } = await uploadDocument(file, projectId, docCode);

            // 2. Update the tasks table with the status and URL
            const { error: tError } = await supabase
                .from('tasks')
                .update({ 
                    status: 'Submitted',
                    // Note: If the tasks table has a column for the document URL, we should store it there.
                    // For now, mirroring the existing projects table logic.
                })
                .eq('id', taskTableId);

            if (tError) {
                if (!taskTableId.startsWith('demo-')) throw tError;
            }

            // 3. Sync with projects table for backward compatibility
            const { data: p, error: fError } = await supabase.from('projects').select('doc_statuses, doc_uploads').eq('id', projectId).single();
            if (!fError && p) {
                const newStatuses = { ...(p.doc_statuses || {}), [docCode]: 'Submitted' };
                // Store the full public URL instead of just the filename
                const newUploads = { ...(p.doc_uploads || {}), [docCode]: publicUrl };
                await supabase.from('projects').update({
                    doc_statuses: newStatuses,
                    doc_uploads: newUploads
                }).eq('id', projectId);
            }

            // Local State Update
            sessionStorage.setItem(`pdf_${projectId}_${docCode}`, publicUrl);

            setProjects(prevProjects => prevProjects.map(p => {
                if (p.id === taskTableId) {
                    return { ...p, status: 'Submitted' };
                }
                return p;
            }));

            alert("Document successfully uploaded to Supabase and synced.");
        } catch (err: any) {
            console.error("Error uploading to Supabase Storage:", err);
            alert(`Upload failed: ${err.message || 'Unknown error'}`);
        }
    };


    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-slate-50 dark:bg-slate-900 animate-fade-in font-sans flex flex-col xl:flex-row gap-6 xl:gap-8">

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 overflow-hidden space-y-8">

                {/* Header */}
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">My Activity Task</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your daily technical reviews and deadlines.</p>
                </div>

                {/* Activity Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Due Today</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{dueTodayCount}</h3>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Upcoming Task</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{upcomingCount}</h3>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue Tasks</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overdueCount}</h3>
                        </div>
                    </div>

                </div>

                {/* Technical Review List */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Documents to Comply
                        </h3>

                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-5 py-3 w-[150px]">Document ID</th>
                                    <th className="px-5 py-3">Project Title</th>
                                    <th className="px-5 py-3 w-[180px]">Status</th>
                                    <th className="px-5 py-3 w-[120px]">Deadline</th>
                                    <th className="px-5 py-3 text-center w-[120px]">Correction</th>
                                    <th className="px-5 py-3 text-right w-[100px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-4 text-center">Loading projects...</td>
                                    </tr>
                                ) : displayProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-4 text-center">No projects available.</td>
                                    </tr>
                                ) : displayProjects.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-5 py-4 font-extrabold text-[#1e293b] dark:text-white tracking-wider whitespace-normal break-words min-w-[150px]">{doc.docId || doc.id.substring(0, 8)}</td>
                                        <td className="px-5 py-4">
                                            <div className="max-w-[180px] lg:max-w-[300px] whitespace-normal break-words" title={doc.title}>{doc.title}</div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-normal">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold leading-tight ${doc.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                doc.status === 'Submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                    doc.status === 'Under Review' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                                                        doc.status === 'Returned' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                                            'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                }`}>
                                                {doc.status === 'Submitted' ? 'Submitted to Unit Head' : doc.status === 'Returned' ? 'Returned for Correction' : doc.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                {(doc.status === 'Drafting' || doc.status.includes('Pending') || doc.status === 'Returned') && <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                                                <span className="text-[11px]">{doc.deadline ? new Date(doc.deadline).toLocaleDateString() : 'Not Set'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {doc.status === 'Returned' && doc.projectId && doc.docCode && (
                                                <a href={`/dashboard/view-correction/${doc.projectId}/${doc.docCode}`} className="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-bold text-sm underline inline-block">
                                                    View Correction
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <label className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline font-medium text-sm inline-block cursor-pointer">
                                                Upload File
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, doc.projectId || '', doc.docCode || '', doc.id)}
                                                />
                                            </label>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Right Sidebar */}
            <div className="w-full xl:w-[350px] flex-shrink-0 space-y-6">

                {/* Interactive Calendar Module */}
                <CalendarModule userName={currentUserName} />

                {/* Notepad */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 flex flex-col h-[250px]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            Strategic Notes
                        </h3>
                        <button onClick={handleSaveNote} className="text-slate-400 hover:text-blue-600 transition-colors" title="Save Notes">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Type your personal reminders here..."
                        className="flex-1 w-full resize-none p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400"
                    />
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-500" />
                            Notifications
                        </h3>
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">3</span>
                    </div>

                    <div className="space-y-4">
                        {[
                            { sender: 'Unit Head', msg: 'Please expedite the review for DOC-2026-001.', time: '10 mins ago', unread: true },
                            { sender: 'Planning Unit', msg: 'New RIF guidelines have been uploaded.', time: '2 hours ago', unread: true },
                            { sender: 'Section Chief', msg: 'Approved the latest submissions. Good job.', time: 'Yesterday', unread: false },
                        ].map((notif, idx) => (
                            <div key={idx} className={`flex gap-3 items-start p-3 rounded-lg transition-colors ${notif.unread ? 'bg-blue-50 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                    {notif.sender.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex justify-between items-baseline gap-2">
                                        <p className={`text-sm ${notif.unread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                            {notif.sender}
                                        </p>
                                        <span className="text-[10px] text-slate-500">{notif.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                        {notif.msg}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        View All Notifications
                    </button>
                </div>

            </div>
        </div>
    );
}
