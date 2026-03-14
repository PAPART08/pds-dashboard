'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
    Plus,
    FileText,
    Users,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    X,
    RefreshCw,
    Send,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    Trash2,
} from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    position: string;
    unit: string;
    user_type: string;
}

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

const defaultForm = {
    subject: '',
    details: '',
    reference_no: '',
    assignee_name: '',
    deadline: '',
};

export default function MemorandumsPage() {
    const [memorandums, setMemorandums] = useState<Memorandum[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const { profile, loading } = useAuth();

    const fetchData = useCallback(async (userName: string) => {
        setIsLoading(true);
        try {
            const [{ data: memos, error: mErr }, { data: emps, error: eErr }] = await Promise.all([
                supabase
                    .from('memorandums')
                    .select('*')
                    .eq('issued_by', userName)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('employees')
                    .select('id, name, position, unit, user_type')
                    .order('name'),
            ]);

            if (mErr) throw mErr;
            if (eErr) throw eErr;

            setMemorandums((memos as Memorandum[]) || []);
            setEmployees((emps as Employee[]) || []);
        } catch (err) {
            console.error('Error fetching memorandums data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (loading) return;
        const userName = profile?.name || '';
        setCurrentUserName(userName);
        if (userName) fetchData(userName);
        else setIsLoading(false);
    }, [fetchData, profile, loading]);

    const todayStr = new Date().toISOString().split('T')[0];

    const totalCount = memorandums.length;
    const pendingCount = memorandums.filter(m => m.status === 'Pending').length;
    const compliedCount = memorandums.filter(m => m.status === 'Complied').length;
    const overdueCount = memorandums.filter(m => m.deadline && m.deadline < todayStr && m.status === 'Pending').length;

    const filteredMemorandums = filterStatus === 'All'
        ? memorandums
        : memorandums.filter(m => {
            if (filterStatus === 'Overdue') return m.deadline && m.deadline < todayStr && m.status === 'Pending';
            return m.status === filterStatus;
        });

    const handleFormChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.assignee_name.trim()) {
            alert('Please fill in the Subject and Assignee fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                subject: form.subject.trim(),
                details: form.details.trim() || null,
                reference_no: form.reference_no.trim() || null,
                issued_by: currentUserName,
                assignee_name: form.assignee_name,
                deadline: form.deadline || null,
                status: 'Pending',
            };

            const { data, error } = await supabase
                .from('memorandums')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            setMemorandums(prev => [data as Memorandum, ...prev]);
            setForm(defaultForm);
            setShowForm(false);
        } catch (err: any) {
            alert(`Failed to assign memorandum: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this memorandum?')) return;
        try {
            const { error } = await supabase.from('memorandums').delete().eq('id', id);
            if (error) throw error;
            setMemorandums(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    const getStatusStyle = (status: string, deadline?: string) => {
        const overdue = deadline && deadline < todayStr && status === 'Pending';
        if (overdue) return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
        switch (status) {
            case 'Complied': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
            case 'For Review': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400';
            default: return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        }
    };

    const getEffectiveStatus = (m: Memorandum) =>
        m.deadline && m.deadline < todayStr && m.status === 'Pending' ? 'Overdue' : m.status;

    return (
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 dark:bg-slate-900 animate-fade-in font-sans">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1 flex items-center gap-3">
                            <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            Memorandums
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            Assign and track memorandums for compliance by Planning Unit Members.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchData(currentUserName)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-200"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Assign Memorandum
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: totalCount, icon: FileText, color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
                        { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' },
                        { label: 'Complied', value: compliedCount, icon: CheckCircle2, color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
                        { label: 'Overdue', value: overdueCount, icon: AlertCircle, color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {['All', 'Pending', 'Complied', 'Overdue'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${filterStatus === status
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Memorandums List */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Assigned Memorandums
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{filteredMemorandums.length} record{filteredMemorandums.length !== 1 ? 's' : ''}</span>
                    </div>

                    {isLoading ? (
                        <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                            Loading memorandums...
                        </div>
                    ) : filteredMemorandums.length === 0 ? (
                        <div className="p-16 text-center">
                            <ClipboardList className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No memorandums found.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click "Assign Memorandum" to create one.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredMemorandums.map(memo => {
                                const isExpanded = expandedId === memo.id;
                                const effectiveStatus = getEffectiveStatus(memo);

                                return (
                                    <div key={memo.id} className={`transition-colors ${effectiveStatus === 'Overdue' ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    {memo.reference_no && (
                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded font-mono">
                                                            {memo.reference_no}
                                                        </span>
                                                    )}
                                                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{memo.subject}</h4>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        <strong className="text-slate-700 dark:text-slate-300">{memo.assignee_name}</strong>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {memo.deadline
                                                            ? new Date(memo.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                            : 'No Deadline'}
                                                    </span>
                                                    <span className="text-slate-400 dark:text-slate-600">
                                                        {new Date(memo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStatusStyle(memo.status, memo.deadline)}`}>
                                                    {effectiveStatus}
                                                </span>
                                                <button
                                                    onClick={() => handleDelete(memo.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : memo.id)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-5 pb-5 space-y-3">
                                                {memo.details && (
                                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                                                        {memo.details}
                                                    </div>
                                                )}
                                                {memo.compliance_note && (
                                                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-500/30">
                                                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Compliance Note from {memo.assignee_name}:</p>
                                                        <p className="text-sm text-emerald-900 dark:text-emerald-200">{memo.compliance_note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Assign Memorandum Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Assign Memorandum
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssign} className="p-6 space-y-4">
                            {/* Reference No */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Reference No. <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.reference_no}
                                    onChange={e => handleFormChange('reference_no', e.target.value)}
                                    placeholder="e.g. MEMO-2026-001"
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={e => handleFormChange('subject', e.target.value)}
                                    required
                                    placeholder="Memorandum subject..."
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Details */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Details / Body <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={form.details}
                                    onChange={e => handleFormChange('details', e.target.value)}
                                    rows={4}
                                    placeholder="Describe the memorandum content and compliance requirements..."
                                    className="w-full resize-none px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Assignee */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Assign To <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.assignee_name}
                                    onChange={e => handleFormChange('assignee_name', e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="">— Select Assignee —</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.name}>
                                            {emp.name} ({emp.unit || emp.position})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Compliance Deadline <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.deadline}
                                    onChange={e => handleFormChange('deadline', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {isSubmitting ? 'Assigning...' : 'Assign Memorandum'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
