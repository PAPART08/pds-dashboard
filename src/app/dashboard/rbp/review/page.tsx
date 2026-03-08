"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ClipboardCheck,
  Search,
  Filter,
  ChevronRight,
  History,
  MessageCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function ReviewQueuePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');

        const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

        let supabaseData: any[] = [];
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.from('projects').select('*');
          if (!error && data) {
            supabaseData = data.map(p => ({
              id: p.id,
              alternateId: p.alternate_id,
              project: p.project_name || 'No Description',
              time: 'Recently',
              priority: p.tier || 'Medium',
              doc: 'RBP',
              assignedTo: null
            }));
          }
        }

        const formattedLocal = localData.map((p: any) => ({
          id: p.id,
          alternateId: p.alternateId,
          project: p.projectDescription || 'No Description',
          time: 'Recently',
          priority: p.priorityTier || 'Medium',
          doc: 'Local',
          assignedTo: p.assignedTo || null
        }));

        let combined = [...supabaseData, ...formattedLocal];

        if (currentUser?.role === 'Unit Head' && currentUser?.name) {
          combined = combined.filter((p: any) => p.assignedTo === currentUser.name);
        }

        setProjects(combined);
      } catch (err) {
        console.error('Error fetching review items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Critical': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-0 pb-10">

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--dpwh-blue)' }}>Technical Review Queue</h1>
        <p className="text-[color:var(--text-muted)]">Perform technical checking of DED, POW, and DUPA submissions.</p>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 mb-6 shadow-sm border border-white/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 shadow-sm" />
          <input
            type="text"
            placeholder="Search by Submitter or Project ID..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 bg-white/50 backdrop-blur-sm focus:ring-orange-200"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-white/50 border border-gray-100 rounded-xl text-xs font-semibold uppercase tracking-wider text-gray-500 outline-none">
            <option>All Types (DED/POW/DUPA)</option>
            <option>DED Only</option>
            <option>POW Only</option>
            <option>DUPA Only</option>
          </select>
          <button className="btn btn-outline border-gray-100 rounded-xl">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="glass-panel overflow-hidden shadow-lg border border-white/50 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-[color:var(--border-color)] text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="p-6">Project & Submission</th>
                <th className="p-6">Type</th>
                <th className="p-6">Submitter</th>
                <th className="p-6 text-center">Priority</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[color:var(--border-color)]">
              {isLoading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading Review Queue...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">No items pending review.</td></tr>
              ) : (
                projects.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/5 transition-colors group">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-[color:var(--dpwh-blue)] text-xs mb-1">{item.alternateId || item.id.substring(0, 8).toUpperCase()}</span>
                        <span className="font-semibold text-gray-700 tracking-tight">{item.project}</span>
                        <div className="flex items-center mt-1.5 text-[10px] text-gray-400 font-medium">
                          <Clock className="w-3 h-3 mr-1" />
                          SUBMITTED {item.time.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] uppercase border border-gray-200 shadow-sm">
                        {item.doc}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200 shadow-inner">
                          P
                        </div>
                        <span className="text-xs font-medium text-gray-500">Planning Unit</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getPriorityStyle(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <Link href={`/dashboard/rbp/${item.id}`} className="inline-flex items-center space-x-2 bg-[color:var(--dpwh-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[color:var(--dpwh-blue-light)] transition-all group active:scale-95">
                        <span>OPEN REVIEW</span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <div className="glass-panel p-5 bg-white border-l-4 border-orange-400">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Technical Checker Workload</h4>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-700">12 Submissions</span>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">+3 TODAY</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-white border-l-4 border-blue-500">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Average Review Time</h4>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-700">4.2 Hours</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">-12% EFFICIENCY</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-white border-l-4 border-emerald-500">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Digital Signs Pending</h4>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-700">5 Final Reviews</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">AUTO-QUEUE</span>
          </div>
        </div>
      </div>

    </div>
  );
}
