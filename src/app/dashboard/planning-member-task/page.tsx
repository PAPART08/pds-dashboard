'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import {
    Bell,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    RefreshCw,
    X,
} from 'lucide-react';

// Dynamically import CalendarModule to avoid SSR issues with date APIs
const CalendarModule = dynamic(() => import('@/components/CalendarModule'), { ssr: false });

interface Memorandum {
    id: string;
    subject: string;
    details?: string;
    reference_no?: string;
    issued_by: string;
    assignee_name: string;
    deadline?: string;
    status: 'Pending' | 'Complied' | 'For Review' | 'Overdue';
    compliance_note?: string;
    created_at: string;
}

export default function PlanningMemberTaskPage() {
    const [memorandums, setMemorandums] = useState<Memorandum[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [complianceModal, setComplianceModal] = useState<{ id: string; subject: string } | null>(null);
    const [complianceNote, setComplianceNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { profile, loading } = useAuth();
    const [currentUserName, setCurrentUserName] = useState('');

    const fetchMemorandums = useCallback(async (userName: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('memorandums')
                .select('*')
                .eq('assignee_name', userName)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMemorandums((data as Memorandum[]) || []);
        } catch (err) {
            console.error('Error fetching memorandums:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!loading) {
            const userName = profile?.name || '';
            setCurrentUserName(userName);
            if (userName) {
                fetchMemorandums(userName);
            } else {
                setIsLoading(false);
            }
        }
    }, [fetchMemorandums, profile, loading]);

    const todayStr = new Date().toISOString().split('T')[0];
    const pendingCount = memorandums.filter(m => m.status === 'Pending' || m.status === 'Overdue').length;
    const dueTodayCount = memorandums.filter(m => m.deadline === todayStr && m.status !== 'Complied').length;
    const compliedCount = memorandums.filter(m => m.status === 'Complied').length;

    const handleOpenComplianceModal = (memo: Memorandum) => {
        setComplianceModal({ id: memo.id, subject: memo.subject });
        setComplianceNote(memo.compliance_note || '');
    };

    const handleSubmitCompliance = async () => {
        if (!complianceModal) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('memorandums')
                .update({ status: 'Complied', compliance_note: complianceNote })
                .eq('id', complianceModal.id);

            if (error) throw error;

            setMemorandums(prev =>
                prev.map(m =>
                    m.id === complianceModal.id
                        ? { ...m, status: 'Complied', compliance_note: complianceNote }
                        : m
                )
            );
            setComplianceModal(null);
            setComplianceNote('');
        } catch (err: any) {
            alert(`Failed to submit: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Complied': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
            case 'For Review': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400';
            case 'Overdue': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default: return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        }
    };

    const isOverdue = (memo: Memorandum) =>
        memo.deadline && memo.deadline < todayStr && memo.status === 'Pending';

    return (
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-slate-900 animate-fade-in font-sans">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1 flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                        My Tasks
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Memorandums and compliance tasks assigned to you by the Section Chief.
                    </p>
                </div>
                <button
                    onClick={() => fetchMemorandums(currentUserName)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-200"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Two-column layout: Tasks (left) + Calendar (right) */}
            <div className="flex gap-6 items-start">

                {/* ── LEFT COLUMN: Tasks ── */}
                <div className="flex-1 min-w-0 space-y-6">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{pendingCount}</h3>
                            </div>
                        </div>

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
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Complied</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{compliedCount}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Memorandums List */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                Assigned Memorandums
                            </h3>
                        </div>

                        {isLoading ? (
                            <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                                Loading your tasks...
                            </div>
                        ) : memorandums.length === 0 ? (
                            <div className="p-16 text-center">
                                <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No memorandums assigned to you yet.</p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">The Section Chief will assign compliance tasks here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {memorandums.map((memo) => {
                                    const overdue = isOverdue(memo);
                                    const isExpanded = expandedId === memo.id;
                                    const effectiveStatus = overdue ? 'Overdue' : memo.status;

                                    return (
                                        <div key={memo.id} className={`transition-colors ${overdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                            {/* Row */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {memo.reference_no && (
                                                            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded font-mono">
                                                                {memo.reference_no}
                                                            </span>
                                                        )}
                                                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{memo.subject}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Bell className="w-3 h-3" />
                                                            Issued by: <strong className="text-slate-700 dark:text-slate-300 ml-0.5">{memo.issued_by}</strong>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {memo.deadline
                                                                ? new Date(memo.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                                : 'No Deadline'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold leading-tight ${getStatusStyle(effectiveStatus)}`}>
                                                        {effectiveStatus}
                                                    </span>

                                                    {memo.status !== 'Complied' && (
                                                        <button
                                                            onClick={() => handleOpenComplianceModal(memo)}
                                                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Mark Complied
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : memo.id)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="px-5 pb-5 space-y-3">
                                                    {memo.details && (
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                                                            {memo.details}
                                                        </div>
                                                    )}
                                                    {memo.compliance_note && (
                                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-500/30">
                                                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Your Compliance Note:</p>
                                                            <p className="text-sm text-emerald-900 dark:text-emerald-200">{memo.compliance_note}</p>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                                        Received on {new Date(memo.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Calendar ── */}
                <div className="w-80 xl:w-96 flex-shrink-0 sticky top-4">
                    <CalendarModule userName={currentUserName} />
                </div>
            </div>

            {/* Compliance Modal */}
            {complianceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Mark as Complied
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-[380px] truncate">{complianceModal.subject}</p>
                            </div>
                            <button onClick={() => setComplianceModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Compliance Note <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={complianceNote}
                                    onChange={(e) => setComplianceNote(e.target.value)}
                                    rows={4}
                                    placeholder="Describe what was done to comply with this memorandum..."
                                    className="w-full resize-none p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 pt-0">
                            <button
                                onClick={() => setComplianceModal(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitCompliance}
                                disabled={isSubmitting}
                                className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {isSubmitting ? 'Submitting...' : 'Confirm Compliance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
