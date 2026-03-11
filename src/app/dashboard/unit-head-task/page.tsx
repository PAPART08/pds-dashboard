'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                const localDataRaw = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
                const savedUser = localStorage.getItem('currentUser');
                const currentUser = savedUser ? JSON.parse(savedUser) : null;
                const currentUserName = currentUser?.name || '';

                const isSupabaseConfigured = true;

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
                            status: p.status || 'Draft',
                            createdAt: p.created_at,
                            fiscalYear: (p.start_year || 2025).toString(),
                            assignedTo: p.assigned_to,
                            deadline: p.deadline
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
                    status: p.status || 'Draft',
                    createdAt: p.createdAt || new Date().toISOString(),
                    fiscalYear: p.fiscalYear || '2025',
                    assignedTo: p.assignedTo,
                    deadline: p.deadline
                }));

                const combined = [...supabaseData, ...formattedLocal].filter(p => {
                    return p.assignedTo === currentUserName || currentUser?.role === 'Admin' || currentUser?.role === 'Section Chief';
                }).sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                setProjects(combined);
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const today = new Date().toISOString().split('T')[0];
    const pendingTasks = projects.filter(p => p.status === 'Draft' || p.status.includes('Pending'));
    const dueTodayCount = projects.filter(p => p.deadline === today).length || pendingTasks.length;

    const inProgressTasks = projects.filter(p => p.status === 'Under Review' || p.status.includes('Review'));
    const upcomingCount = projects.filter(p => p.deadline && p.deadline > today).length || inProgressTasks.length;

    const completedCount = projects.length;

    const displayProjects = projects.filter(p =>
        p.status === 'Under Review' ||
        p.status.includes('Review') ||
        p.status === 'Draft' ||
        p.status.includes('Pending')
    ).slice(0, 5);

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
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overview Task</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{completedCount}</h3>
                        </div>
                    </div>

                </div>

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
                                ) : displayProjects.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{doc.alternateId || doc.id.substring(0, 8)}</td>
                                        <td className="px-5 py-4 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                                {('U').charAt(0)}
                                            </div>
                                            User
                                        </td>
                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="max-w-[200px] truncate" title={doc.title}>{doc.title}</div>
                                        </td>
                                        <td className="px-5 py-4 flex items-center gap-1.5 font-medium">
                                            {(doc.status === 'Draft' || doc.status.includes('Pending')) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                                            <span className={(doc.status === 'Draft' || doc.status.includes('Pending')) ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <a href={`/dashboard/rbp/${doc.id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm cursor-pointer inline-block">
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

                {/* Mini Calendar Widget */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Schedule
                        </h3>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded">March 2026</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`${d}-${i}`} className="font-medium text-slate-400">{d}</div>)}
                        {Array.from({ length: 31 }).map((_, i) => (
                            <div
                                key={i}
                                className={`p-1.5 rounded-full flex items-center justify-center 
                  ${i + 1 === 7 ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'}
                  ${[8, 12, 18, 25].includes(i + 1) ? 'relative after:absolute after:bottom-0 after:w-1 after:h-1 after:bg-orange-500 after:rounded-full' : ''}
                `}
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notepad */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 flex flex-col h-[250px]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            Strategic Notes
                        </h3>
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
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
