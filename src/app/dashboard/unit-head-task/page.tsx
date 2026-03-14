'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import {

    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Save,
    Bell,
    AlertCircle,
    FolderOpen
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
    assignedTo?: string;
    deadline?: string;
}

export default function UnitHeadDashboard() {
    const [noteText, setNoteText] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState('');
    const { profile, loading } = useAuth();

    useEffect(() => {
        const fetchUnitHeadData = async () => {
            setIsLoading(true);
            try {
                if (loading) return;
                const userName = profile?.name || '';
                setCurrentUserName(userName);

                if (!userName) {
                    setIsLoading(false);
                    return;
                }

                // 1. Fetch projects where user is the lead (check BOTH tasks table and legacy column)
                // A. via tasks table
                const { data: leadTasksTable, error: leadError } = await supabase
                    .from('tasks')
                    .select('project_id')
                    .eq('assignee_name', userName)
                    .eq('task_type', 'PROJECT_LEAD');

                // B. via projects table (legacy)
                const { data: legacyLeadProjects, error: legacyError } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('assigned_to', userName);

                if (leadError) throw leadError;
                if (legacyError) throw legacyError;

                const leadProjectIds = Array.from(new Set([
                    ...(leadTasksTable?.map((t: any) => t.project_id) || []),
                    ...(legacyLeadProjects?.map((p: any) => p.id) || [])
                ])).filter(Boolean); // Filter out any null or undefined IDs
                
                // 2. Fetch projects and ALL tasks for those lead projects
                let allRelatedTasksMapped: any[] = [];
                let leadProjectsData: any[] = [];

                if (leadProjectIds.length > 0) {
                    const { data: projectsWithTasks, error: taskError } = await supabase
                        .from('projects')
                        .select(`
                            *,
                            tasks (*)
                        `)
                        .in('id', leadProjectIds);
                    
                    if (taskError) throw taskError;
                    leadProjectsData = projectsWithTasks || [];

                    // 3. Build a unified task list (Merge Legacy JSON into Relational Tasks)
                    leadProjectsData.forEach(p => {
                        const projectTasks = p.tasks || [];
                        const taskDocCodes = new Set(projectTasks.map((t: any) => t.doc_code).filter(Boolean));
                        
                        // Add relational tasks to the big list
                        projectTasks.forEach((t: any) => {
                            allRelatedTasksMapped.push({
                                ...t,
                                projects: { // Ensure project info is attached
                                    id: p.id,
                                    alternate_id: p.alternate_id,
                                    project_name: p.project_name,
                                    project_amount: p.project_amount,
                                    start_year: p.start_year,
                                    status: p.status,
                                    created_at: p.created_at
                                }
                            });
                        });

                        // Add legacy assignments IF they don't have a relational task counterpart
                        if (p.doc_assignments) {
                            Object.entries(p.doc_assignments).forEach(([docCode, assignee]) => {
                                if (assignee && !taskDocCodes.has(docCode)) {
                                    allRelatedTasksMapped.push({
                                        project_id: p.id,
                                        task_type: 'DOC_COMPLIANCE',
                                        doc_code: docCode,
                                        assignee_name: assignee,
                                        status: p.doc_statuses?.[docCode] || 'Pending',
                                        deadline: p.doc_deadlines?.[docCode] || null,
                                        created_at: p.created_at,
                                        projects: {
                                            id: p.id,
                                            alternate_id: p.alternate_id,
                                            project_name: p.project_name,
                                            project_amount: p.project_amount,
                                            start_year: p.start_year,
                                            status: p.status,
                                            created_at: p.created_at
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

                // Map projects for the overview list
                const mappedProjects = leadProjectsData.map(p => ({
                    id: p.id,
                    alternateId: p.alternate_id || p.id.substring(0, 8).toUpperCase(),
                    title: p.project_name || 'Untitled Project',
                    location: p.city_municipality || 'Unspecified Location',
                    costValue: p.project_amount || 0,
                    stage: 'Preparation',
                    status: p.status || 'Draft',
                    createdAt: p.created_at,
                    fiscalYear: (p.start_year || 2025).toString()
                }));

                setProjects(mappedProjects);
                setAllTasks(allRelatedTasksMapped);

            } catch (err: any) {
                console.error('Error fetching dashboard data:', err?.message || err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUnitHeadData();

        // Load persisted notes
        const savedNotes = localStorage.getItem('unit_head_strategic_notes');
        if (savedNotes) {
            setNoteText(savedNotes);
        }
    }, [profile, loading]);

    const handleSaveNote = () => {
        localStorage.setItem('unit_head_strategic_notes', noteText);
        alert('Notes saved locally.');
    };

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Counts based on ALL tasks in projects that this Unit Head leads
    const dueTodayCount = allTasks.filter((t: any) => t.deadline === todayStr).length;
    const upcomingCount = allTasks.filter((t: any) => t.deadline && t.deadline > todayStr).length;
    const overdueCount = allTasks.filter((t: any) => 
        t.deadline && 
        t.deadline < todayStr && 
        t.status !== 'Approved'
    ).length;

    // "Pending Documents for Review" list (Submitted but not yet approved/returned)
    const allPendingReviews = allTasks.filter((t: any) => 
        t.task_type === 'DOC_COMPLIANCE' && 
        t.status === 'Submitted'
    ).map((t: any) => ({
        id: t.project_id,
        alternateId: t.projects?.alternate_id,
        docCode: t.doc_code,
        title: t.projects?.project_name,
        submittedBy: t.assignee_name,
        deadline: t.deadline,
        status: t.status,
        createdAt: t.created_at
    }));

    const pendingReviewCount = allPendingReviews.length;
    const displayProjects = allPendingReviews.slice(0, 5);

    // Grouping logic for Member Breakdown
    const getMemberBreakdown = (category: string) => {
        const members: Record<string, { count: number, total: number, approved: number, docs: any[] }> = {};
        const today = new Date().toISOString().split('T')[0];

        allTasks.forEach(t => {
            const name = t.assignee_name || 'Unassigned';
            if (!members[name]) {
                members[name] = { count: 0, total: 0, approved: 0, docs: [] };
            }

            // Only count DOC_COMPLIANCE for member status
            if (t.task_type === 'DOC_COMPLIANCE') {
                members[name].total++;
                if (t.status === 'Approved') members[name].approved++;

                // Category-specific count and document collection
                const docInfo = {
                    code: t.doc_code,
                    title: t.projects?.project_name || 'Untitled Project',
                    status: t.status
                };

                let isMatch = false;
                if (category === 'dueToday' && t.deadline === today) isMatch = true;
                if (category === 'upcoming' && t.deadline && t.deadline > today) isMatch = true;
                if (category === 'overdue' && t.deadline && t.deadline < today && t.status !== 'Approved') isMatch = true;
                if (category === 'pendingReview' && t.status === 'Submitted') isMatch = true;

                if (isMatch) {
                    members[name].count++;
                    members[name].docs.push(docInfo);
                }
            }
        });

        return Object.entries(members)
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                docs: stats.docs,
                progress: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
            }))
            .filter(m => m.count > 0 || category === 'all')
            .sort((a, b) => b.count - a.count);
    };

    const breakdownData = activeBreakdown ? getMemberBreakdown(activeBreakdown) : [];
    const breakdownTitle = activeBreakdown === 'dueToday' ? 'Unit Member Deadlines: Today' :
                          activeBreakdown === 'upcoming' ? 'Unit Member Deadlines: Upcoming' :
                          activeBreakdown === 'overdue' ? 'Unit Member Deadlines: Overdue' :
                          activeBreakdown === 'pendingReview' ? 'Pending Documents per Member' : '';

    return (
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 dark:bg-slate-900 animate-fade-in font-sans flex flex-col xl:flex-row gap-6 xl:gap-8">

            {/* Main Content Area */}
            <div className="flex-1 space-y-8">

                {/* Header */}
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Unit Head Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400">Oversee pending unit-wide document reviews and your daily tasks.</p>
                </div>

                {/* Activity Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <button 
                        onClick={() => setActiveBreakdown(activeBreakdown === 'pendingReview' ? null : 'pendingReview')}
                        className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] text-left ${activeBreakdown === 'pendingReview' ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${activeBreakdown === 'pendingReview' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                            <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-tighter ${activeBreakdown === 'pendingReview' ? 'text-blue-600' : 'text-slate-400'}`}>Pending My Review</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingReviewCount}</h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => setActiveBreakdown(activeBreakdown === 'dueToday' ? null : 'dueToday')}
                        className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] text-left group ${activeBreakdown === 'dueToday' ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${activeBreakdown === 'dueToday' ? 'bg-orange-500 text-white' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'}`}>
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${activeBreakdown === 'dueToday' ? 'text-orange-600' : 'text-slate-400'}`}>Unit: Due Today</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{dueTodayCount}</h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => setActiveBreakdown(activeBreakdown === 'upcoming' ? null : 'upcoming')}
                        className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] text-left ${activeBreakdown === 'upcoming' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${activeBreakdown === 'upcoming' ? 'bg-indigo-500 text-white' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}>
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${activeBreakdown === 'upcoming' ? 'text-indigo-600' : 'text-slate-400'}`}>Unit: Upcoming</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{upcomingCount}</h3>
                        </div>
                    </button>

                    <button 
                        onClick={() => setActiveBreakdown(activeBreakdown === 'overdue' ? null : 'overdue')}
                        className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] text-left ${activeBreakdown === 'overdue' ? 'ring-2 ring-red-500 border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${activeBreakdown === 'overdue' ? 'bg-red-500 text-white' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${activeBreakdown === 'overdue' ? 'text-red-600' : 'text-slate-400'}`}>Unit: Overdue</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{overdueCount}</h3>
                        </div>
                    </button>

                </div>

                {/* Member Breakdown Table (Appears on Card Selection) */}
                {activeBreakdown && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg animate-in slide-in-from-top-4 duration-300">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
                            <h4 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{breakdownTitle}</h4>
                            <button onClick={() => setActiveBreakdown(null)} className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase">Close</button>
                        </div>
                        <div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Unit Member</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Docs</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Overall Progress</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {breakdownData.map((member, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="relative group/tooltip inline-block">
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-black text-slate-600 dark:text-slate-300 cursor-help transition-all group-hover/tooltip:bg-blue-600 group-hover/tooltip:text-white">
                                                        {member.count}
                                                    </span>
                                                    
                                                    {/* Custom Hover Document List */}
                                                    <div className="invisible group-hover/tooltip:visible absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-slate-900 text-white rounded-lg shadow-2xl p-3 z-50 text-left animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-700">
                                                            <FileText className="w-3 h-3 text-blue-400" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Detail</span>
                                                        </div>
                                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                            {member.docs.map((doc, dIdx) => (
                                                                <div key={dIdx} className="space-y-0.5">
                                                                    <div className="text-[10px] font-bold text-blue-300 uppercase tracking-tighter truncate">{doc.title}</div>
                                                                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
                                                                        <span className="bg-slate-800 px-1 rounded">{doc.code}</span>
                                                                        <span className={`${doc.status === 'Submitted' ? 'text-blue-400' : 'text-amber-400'}`}>{doc.status}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Tooltip Arrow (Points Up) */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-900"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${member.progress === 100 ? 'bg-emerald-500' : member.progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${member.progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 w-8">{member.progress}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {breakdownData.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center text-xs text-slate-400 italic">No member data for this category.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pending Documents for Review as Task (Prominent Section) */}
                <div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-blue-900/50 rounded-xl shadow-md overflow-hidden ring-1 ring-blue-500/20">
                    <div className="p-5 border-b border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Pending Documents for Review
                        </h3>
                        <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold">
                            {displayProjects.length} Require Action
                        </span>
                    </div>

                    <div className="overflow-x-auto bg-white dark:bg-slate-800">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-5 py-3">Document ID</th>
                                    <th className="px-5 py-3">Submitted By</th>
                                    <th className="px-5 py-3">Project Type</th>
                                    <th className="px-5 py-3">Deadline</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-4 text-center">Loading pending documents...</td>
                                    </tr>
                                ) : displayProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-4 text-center">No documents currently pending review.</td>
                                    </tr>
                                ) : displayProjects.map((doc: any) => (
                                    <tr key={`${doc.id}-${doc.docCode}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{doc.alternateId || doc.id.substring(0, 8)}-{doc.docCode}</td>
                                        <td className="px-5 py-4 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                                {doc.submittedBy?.charAt(0) || 'U'}
                                            </div>
                                            {doc.submittedBy || 'Unknown User'}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="max-w-[200px] truncate" title={doc.title}>{doc.title}</div>
                                        </td>
                                        <td className="px-5 py-4 flex items-center gap-1.5 font-medium">
                                            {(doc.status === 'Draft' || doc.status.includes('Pending')) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                                            <span className={(doc.status === 'Draft' || doc.status.includes('Pending')) ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <a href={`/dashboard/review-document/${doc.id}/${doc.docCode}`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm cursor-pointer inline-block">
                                                Open Review
                                            </a>
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
                        placeholder="Jot down directives for unit members..."
                        className="flex-1 w-full resize-none p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400"
                    />
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-500" />
                            Alerts
                        </h3>
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">2</span>
                    </div>

                    <div className="space-y-4">
                        {[
                            { sender: 'Section Chief', msg: 'Need the consolidated report by EOD.', time: '1 hr ago', unread: true },
                            { sender: 'Planning Unit', msg: 'Coordination meeting at 3 PM today.', time: '3 hrs ago', unread: true },
                            { sender: 'M. Santos (Bridge)', msg: 'Submitted draft designs for review.', time: 'Yesterday', unread: false },
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
                </div>

            </div>
        </div>
    );
}
