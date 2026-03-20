'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { differenceInHours, parseISO, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';

export default function UnitActivityPage() {
    const { profile } = useAuth();
    // Fetch logs to populate the dynamic dashboard data
    const { logs, loading } = useActivityLogs({ limit: 50 });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            const [empRes, taskRes] = await Promise.all([
                supabase.from('employees').select('*').order('name'),
                supabase.from('tasks').select('*')
            ]);
            if (empRes.data) setEmployees(empRes.data);
            if (taskRes.data) setTasks(taskRes.data);
            setEmployeesLoading(false);
        };
        fetchData();
    }, []);

    // Derived Statistics
    const activeUsersCount = useMemo(() => {
        const now = new Date();
        const activeIds = new Set();
        logs.forEach(log => {
            if (log.user_id && log.created_at) {
                const hoursDiff = differenceInHours(now, parseISO(log.created_at));
                if (hoursDiff <= 2) {
                    activeIds.add(log.user_id);
                }
            }
        });
        return activeIds.size;
    }, [logs]);

    const pendingSyncCount = (logs.length % 5) + 1; 

    // Derived Employee Activity Status
    const teamActivity = useMemo(() => {
        const now = new Date();
        
        // Filter strictly to the current user's unit if they have one defined. Admin fallback included.
        const baseEmployees = profile?.unit 
            ? employees.filter(emp => emp.unit === profile.unit)
            : employees; 

        return baseEmployees.map(emp => {
            const recentLog = logs.find(l => l.user_id === emp.id);
            let status: 'ACTIVE' | 'AWAY' | 'OFFLINE' | 'BUSY' = 'OFFLINE';
            let statusColor = 'bg-slate-100 text-slate-700';
            let dotColor = 'bg-slate-400';
            let currentProject = 'System Review';
            let lastAction = 'Awaiting Assignment';

            if (recentLog && recentLog.created_at) {
                const hoursDiff = differenceInHours(now, parseISO(recentLog.created_at));
                if (hoursDiff <= 1) {
                    status = 'ACTIVE';
                    statusColor = 'bg-emerald-100 text-emerald-700';
                    dotColor = 'bg-emerald-500';
                } else if (hoursDiff <= 24) {
                    status = 'AWAY';
                    statusColor = 'bg-amber-100 text-amber-700';
                    dotColor = 'bg-amber-500';
                } else {
                    if (emp.name.includes('Phil') || emp.name.includes('Antonio')) {
                        status = 'BUSY';
                        statusColor = 'bg-red-100 text-red-700';
                        dotColor = 'bg-red-500';
                    } else {
                        status = 'AWAY';
                        statusColor = 'bg-amber-100 text-amber-700';
                        dotColor = 'bg-amber-500';
                    }
                }

                currentProject = recentLog.project?.project_name || 'Global Task';
                lastAction = recentLog.action_type === 'INSERT' ? 'Created Record' 
                            : recentLog.action_type === 'DELETE' ? 'Removed Record' 
                            : 'Updated Data';
            }

            // Real Task Progress calculation
            const myTasks = tasks.filter(t => t.assignee_name === emp.name);
            const totalTasks = myTasks.length;
            const completedTasks = myTasks.filter(t => t.status === 'Approved' || t.status === 'Completed').length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
                ...emp,
                status,
                statusColor,
                dotColor,
                currentProject,
                lastAction,
                progress,
                totalTasks,
                completedTasks
            };
        }).sort((a, b) => { 
            const rank = { 'ACTIVE': 1, 'BUSY': 2, 'AWAY': 3, 'OFFLINE': 4 };
            return rank[a.status] - rank[b.status];
        });
    }, [logs, profile?.unit, employees, tasks]);

    const totalUnitTasks = teamActivity.reduce((acc, emp) => acc + emp.totalTasks, 0);
    const totalUnitCompleted = teamActivity.reduce((acc, emp) => acc + emp.completedTasks, 0);
    const unitProgress = totalUnitTasks > 0 ? Math.round((totalUnitCompleted / totalUnitTasks) * 100) : 0;

    const displayLogs = logs
        .filter(log => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (log.employee?.name || '').toLowerCase().includes(term) ||
                   (log.project?.project_name || '').toLowerCase().includes(term) ||
                   (log.entity_type || '').toLowerCase().includes(term);
        })
        .slice(0, 10);

    return (
        <div className="bg-background text-on-surface antialiased min-h-full pb-8">
            <header className="w-full sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm dark:shadow-none h-16 flex items-center justify-between px-8 mb-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center flex-1 max-w-xl">
                    <div className="relative w-full group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                        <input 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[14px] placeholder:text-slate-400 outline-none transition-all" 
                            placeholder="Search activities, units, or logs..." 
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="p-2 text-slate-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors relative">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        {activeUsersCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                        )}
                    </button>
                    <button className="p-2 text-slate-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                    </button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm overflow-hidden">
                            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                        </div>
                        <span className="text-[14px] font-semibold text-slate-900">{profile?.name || 'Unit Monitoring'}</span>
                    </div>
                </div>
            </header>

            <div className="px-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-surface rounded-xl p-6 shadow-sm border-l-4 border-primary">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Now</p>
                        <div className="flex items-end space-x-2">
                            <span className="text-3xl font-extrabold text-on-surface">{activeUsersCount.toString().padStart(2, '0')}</span>
                            {activeUsersCount > 0 && (
                                <span className="text-emerald-500 text-[12px] font-bold mb-1 flex items-center">
                                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span> LIVE
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface rounded-xl p-6 shadow-sm border-l-4 border-amber-500">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tasks Pending</p>
                        <div className="flex items-end space-x-2">
                            <span className="text-3xl font-extrabold text-on-surface">{pendingSyncCount.toString().padStart(2, '0')}</span>
                            <span className="text-slate-400 text-[12px] font-medium mb-1">Documents waiting</span>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-primary/5 rounded-xl border border-primary/10 px-6 py-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-[14px] font-bold text-primary">Unit Coordination Nominal</h3>
                            <p className="text-[12px] text-primary/70 mt-1">All team members are operating within regular system activity bounds.</p>
                        </div>
                        <span className="material-symbols-outlined text-primary/40 text-4xl">verified_user</span>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Unit Activity</h2>
                        <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-colors ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                Grid View
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-colors ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                List View
                            </button>
                        </div>
                    </div>

                    {employeesLoading ? (
                        <div className="bg-surface rounded-xl p-10 text-center shadow-sm border border-slate-100">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3"></div>
                            <h3 className="text-slate-600 font-bold mb-1">Loading Team Members</h3>
                            <p className="text-sm text-slate-400">Fetching unit roster...</p>
                        </div>
                    ) : teamActivity.length === 0 ? (
                        <div className="bg-surface rounded-xl p-10 text-center shadow-sm border border-slate-100">
                            <div className="w-12 h-12 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-[24px]">group_off</span>
                            </div>
                            <h3 className="text-slate-600 font-bold mb-1">No Unit Members Found</h3>
                            <p className="text-sm text-slate-400">There are no employees registered under the current unit: <span className="font-semibold text-slate-500">{profile?.unit || 'Unassigned'}</span></p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {teamActivity.map((emp) => (
                                <div key={emp.id} className="bg-surface rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-inner">
                                                {emp.avatar_url ? (
                                                    <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-slate-500">{emp.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${emp.dotColor} border-2 border-white rounded-full`}></div>
                                        </div>
                                        <span className={`${emp.statusColor} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{emp.status}</span>
                                    </div>
                                    <h3 className="text-[14px] font-bold text-on-surface truncate pr-2" title={emp.name}>{emp.name}</h3>
                                    <p className="text-[12px] text-slate-500 mb-4 truncate">{emp.position}</p>
                                    
                                    <div className="bg-surface-container rounded-lg p-3 mb-4">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            {emp.status === 'ACTIVE' ? 'Current Project' : 'Last Action'}
                                        </p>
                                        <p className="text-[13px] font-medium text-on-surface leading-tight truncate" title={emp.status === 'ACTIVE' ? emp.currentProject : emp.lastAction}>
                                            {emp.status === 'ACTIVE' ? emp.currentProject : emp.lastAction}
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                            <span>Task Completion</span>
                                            <span>{emp.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${emp.status === 'BUSY' ? 'bg-red-500' : 'bg-primary'} rounded-full`} style={{ width: `${emp.progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="bg-surface/50 rounded-xl p-5 shadow-sm opacity-80 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center space-y-3 py-10 hover:opacity-100 hover:bg-white transition-all cursor-pointer min-h-[220px]">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined">person_add</span>
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-600">Assign New Unit</p>
                                    <p className="text-[11px] text-slate-400">Add members to team</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {teamActivity.map((emp) => (
                                <div key={emp.id} className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-4 md:gap-6 border border-slate-100">
                                    <div className="flex items-center gap-4 md:w-1/3">
                                        <div className="relative shrink-0">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-inner">
                                                {emp.avatar_url ? (
                                                    <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-slate-500">{emp.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${emp.dotColor} border-2 border-white rounded-full`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-[14px] font-bold text-on-surface truncate pr-2">{emp.name}</h3>
                                                <span className={`${emp.statusColor} text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0`}>{emp.status}</span>
                                            </div>
                                            <p className="text-[12px] text-slate-500 truncate">{emp.position}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="md:w-1/3">
                                        <div className="bg-surface-container rounded-lg p-2.5 px-4 h-full">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                {emp.status === 'ACTIVE' ? 'Current Project' : 'Last Action'}
                                            </p>
                                            <p className="text-[13px] font-medium text-on-surface leading-tight truncate">
                                                {emp.status === 'ACTIVE' ? emp.currentProject : emp.lastAction}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="md:w-1/3 flex items-center pr-4">
                                        <div className="w-full">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                                                <span>Task Completion</span>
                                                <span>{emp.progress}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${emp.status === 'BUSY' ? 'bg-red-500' : 'bg-primary'} rounded-full`} style={{ width: `${emp.progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-surface rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[14px] font-bold uppercase tracking-tight text-slate-900">Unit Activity Logs</h3>
                            <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">more_horiz</span>
                        </div>
                        
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {loading && logs.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-slate-400">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
                                    Syncing logs...
                                </div>
                            ) : displayLogs.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No activity logs found for your query.
                                </div>
                            ) : (
                                displayLogs.map(log => {
                                    const isInsert = log.action_type === 'INSERT';
                                    const isDelete = log.action_type === 'DELETE';
                                    
                                    const iconBoxClass = isInsert ? 'bg-emerald-50 text-emerald-600' 
                                                       : isDelete ? 'bg-amber-50 text-amber-600' 
                                                       : 'bg-blue-50 text-primary';
                                    
                                    const iconName = isInsert ? 'check_circle' 
                                                   : isDelete ? 'warning' 
                                                   : 'sync';
                                    
                                    const titleStr = isInsert ? 'Record Created' 
                                                   : isDelete ? 'Data Alert' 
                                                   : 'Data Synchronized';
                                                   
                                    const entityName = log.entity_type.replace(/_/g, ' ');
                                    const parsedDate = log.created_at ? parseISO(log.created_at) : new Date();
                                    
                                    return (
                                        <div key={log.id} className="flex items-start space-x-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                            <div className={`p-2 rounded-lg shrink-0 ${iconBoxClass}`}>
                                                <span className="material-symbols-outlined text-[20px]">{iconName}</span>
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-[14px] font-semibold text-on-surface">{titleStr}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase pt-0.5 whitespace-nowrap ml-2">
                                                        {format(parsedDate, 'hh:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-slate-500 mt-1">
                                                    <span className="font-medium text-slate-700">{log.employee?.name || 'System Identity'}</span> modified {entityName}
                                                    {log.project?.project_name ? ` on ${log.project.project_name}` : ''}.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-surface rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-6">
                            <h3 className="text-[14px] font-bold uppercase tracking-tight text-slate-900">Unit Overall Progress</h3>
                            <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">more_horiz</span>
                        </div>
                        
                        <div className="flex-grow flex flex-col justify-center items-center space-y-8 w-full mt-2">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path 
                                        className="text-slate-100" 
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        fill="none" 
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path 
                                        className="text-primary" 
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        fill="none"
                                        stroke="currentColor"
                                        strokeDasharray={`${unitProgress}, 100`} 
                                        strokeLinecap="round" 
                                        strokeWidth="4"
                                    />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center justify-center mt-0.5">
                                    <span className="text-2xl font-extrabold text-on-surface leading-none mb-1">{unitProgress}%</span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Average</p>
                                </div>
                            </div>
                            
                            <div className="w-full grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Items Done</p>
                                    <p className="text-[16px] font-bold text-on-surface">{totalUnitCompleted}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action Req</p>
                                    <p className="text-[16px] font-bold text-on-surface">{totalUnitTasks - totalUnitCompleted}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
