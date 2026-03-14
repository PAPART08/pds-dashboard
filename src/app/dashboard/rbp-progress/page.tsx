'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    BarChart4,
    AlertCircle,
    CheckCircle,
    Clock,
    FileText,
    TrendingUp,
    Activity
} from 'lucide-react';

interface Project {
    id: string;
    category: string;
    status: string;
    stage?: string;
    createdAt: string;
}

export default function RBPProgressDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                // Fetch from Supabase exclusively
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const mappedData = data.map(p => ({
                        id: p.id,
                        category: p.category || 'N/A',
                        status: p.status || 'Draft',
                        stage: 'Preparation',
                        createdAt: p.created_at
                    }));
                    setProjects(mappedData);
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const pendingCount = projects.filter(p => p.status === 'Draft' || p.status.includes('Pending')).length;
    const underReviewCount = projects.filter(p => p.status === 'Under Review' || p.status.includes('Review') || p.status.includes('Prog')).length;
    const approvalCount = projects.filter(p => p.status === 'Submitted to Section Chief').length;
    const submissionCount = projects.filter(p => p.status === 'Approved' || p.status === 'Submitted to DE').length;

    const calculateUnitMetrics = (keywords: string[]) => {
        const unitProjects = projects.filter(p => keywords.some(k => p.category?.toLowerCase().includes(k.toLowerCase()) || p.id.includes(k)));
        if (unitProjects.length === 0) return { pending: 0, progress: 0, done: 0, total: 1 };

        let pending = 0; let progress = 0; let done = 0;
        unitProjects.forEach(p => {
            if (p.status === 'Draft' || p.status.includes('Pending')) pending++;
            else if (p.status.includes('Review') || p.status.includes('Prog')) progress++;
            else done++;
        });
        return { pending, progress, done, total: pending + progress + done };
    };

    const unitsData = [
        { label: 'Highway Design', mapping: calculateUnitMetrics(['Road', 'Highway']) },
        { label: 'Bridge & Social', mapping: calculateUnitMetrics(['Bridge', 'Building']) },
        { label: 'Flood Control', mapping: calculateUnitMetrics(['Flood', 'River']) },
        { label: 'Env. & Social', mapping: calculateUnitMetrics(['Environment', 'Social']) },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900 animate-fade-in font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">RBP Overall Progress</h2>
                        <p className="text-slate-500 dark:text-slate-400">High-level overview of the Road Board Program status across all units.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <FileText className="w-4 h-4" /> Export Report
                    </button>
                </div>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-l-4 border-l-amber-500 border-t border-r border-b border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : (pendingCount || 0)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Items</p>
                        <p className="text-xs text-slate-500 mt-1">Awaiting initial action</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-l-4 border-l-blue-600 border-t border-r border-b border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : (approvalCount || 0)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Items for Approval</p>
                        <p className="text-xs text-slate-500 mt-1">Ready for Section Chief</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-l-4 border-l-cyan-500 border-t border-r border-b border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : (underReviewCount || 0)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Items Under Review</p>
                        <p className="text-xs text-slate-500 mt-1">Currently being vetted</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-l-4 border-l-emerald-500 border-t border-r border-b border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : (submissionCount || 0)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">For Submission to DE</p>
                        <p className="text-xs text-slate-500 mt-1">Finalized and ready</p>
                    </div>          </div>


                {/* Charts / Data Visualization Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Project Status Overview Bar Chart */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart4 className="w-5 h-5 text-blue-600" />
                                Project Status Overview
                            </h3>
                        </div>

                        {/* simple CSS Bar Chart */}
                        <div className="space-y-5">
                            {unitsData.map((unit, idx) => {
                                const total = unit.mapping.total || 1;
                                const pDone = unit.mapping.done === 0 && total === 1 ? 0 : (unit.mapping.done / total) * 100;
                                const pProgress = unit.mapping.progress === 0 && total === 1 ? 0 : (unit.mapping.progress / total) * 100;
                                const pPending = unit.mapping.pending === 0 && total === 1 ? 0 : (unit.mapping.pending / total) * 100;
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{unit.label} ({unit.mapping.total === 1 && unit.mapping.pending === 0 ? 0 : unit.mapping.total})</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{unit.mapping.total === 1 && unit.mapping.pending === 0 ? '0%' : '100%'}</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${pDone}%` }} title={`Done: ${unit.mapping.done}`}></div>
                                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pProgress}%` }} title={`In Progress: ${unit.mapping.progress}`}></div>
                                            <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${pPending}%` }} title={`Pending: ${unit.mapping.pending}`}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Completed</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>In Progress</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>Pending</div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Progress Trend */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-500" />
                                Monthly Submission Trend
                            </h3>
                            <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-md px-2 py-1 text-slate-700 dark:text-slate-300">
                                <option>2026</option>
                                <option>2025</option>
                            </select>
                        </div>

                        {/* Simulated Line Graph Area */}
                        <div className="flex-1 min-h-[220px] relative flex items-end">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                                {[100, 75, 50, 25, 0].map(val => (
                                    <div key={val} className="w-full border-b border-slate-100 dark:border-slate-700 flex items-end -mb-px">
                                        <span className="text-[10px] text-slate-400 absolute -left-1 -translate-y-1/2 -translate-x-full">{val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="w-full h-full pb-8 pl-8 flex items-end justify-between relative z-10 px-4">
                                {/* SVG Line simulation */}
                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <path d="M 10,90 L 30,70 L 50,80 L 70,40 L 90,20" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500" vectorEffect="non-scaling-stroke" />
                                    <path d="M 10,90 L 30,70 L 50,80 L 70,40 L 90,20 L 90,100 L 10,100 Z" fill="currentColor" className="text-indigo-500/10" vectorEffect="non-scaling-stroke" />
                                </svg>

                                {/* Data Points */}
                                <div className="absolute inset-0 w-full h-full pb-8 pl-8 flex items-end justify-between px-4 z-20">
                                    <div className="w-2 h-2 rounded-full bg-white border-2 border-indigo-500 relative bottom-[10%]"></div>
                                    <div className="w-2 h-2 rounded-full bg-white border-2 border-indigo-500 relative bottom-[30%]"></div>
                                    <div className="w-2 h-2 rounded-full bg-white border-2 border-indigo-500 relative bottom-[20%]"></div>
                                    <div className="w-2 h-2 rounded-full bg-white border-2 border-indigo-500 relative bottom-[60%]"></div>
                                    <div className="w-2 h-2 rounded-full bg-white border-2 border-indigo-500 relative bottom-[80%]"></div>
                                </div>
                            </div>

                            {/* X Axis labels */}
                            <div className="absolute bottom-0 left-8 right-0 flex justify-between px-4 text-[10px] font-medium text-slate-500">
                                <span>Jan</span>
                                <span>Feb</span>
                                <span>Mar</span>
                                <span>Apr</span>
                                <span>May</span>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}
