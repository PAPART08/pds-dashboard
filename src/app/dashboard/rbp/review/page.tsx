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
  const [masterListCount, setMasterListCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        // Fetch only from Supabase
        const { data, error } = await supabase.from('projects').select('*');
        if (error) throw error;

        if (data) {
          const mappedData = data.map(p => ({
            id: p.id,
            alternateId: p.alternate_id,
            project: p.project_name || 'No Description',
            time: 'Recently',
            priority: p.tier || 'Medium',
            doc: 'RBP',
            assignedTo: p.assigned_to || null,
            isIncludedInMasterList: p.is_included_in_master_list || false,
            location: p.city_municipality || 'Unspecified',
            costValue: p.project_amount || 0,
            fiscalYear: (p.start_year || 2025).toString()
          }));

          // Only projects approved for Master List
          const masterBase = mappedData.filter(p => p.isIncludedInMasterList === true);
          setMasterListCount(masterBase.length);

          // Review Queue filtering
          let queueItems = [...masterBase];
          if (currentUser?.role === 'Unit Head' || currentUser?.position === 'Unit Head' || currentUser?.user_type === 'Admin') {
            const nameToMatch = currentUser.name;
            queueItems = queueItems.filter((p: any) => p.assignedTo === nameToMatch || currentUser?.user_type === 'Admin');
          }
          setProjects(queueItems);
        }
      } catch (err) {
        console.error('Error fetching review items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
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

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--dpwh-blue)' }}>Technical Review Queue</h1>
        <p className="text-[color:var(--text-muted)] text-sm">Perform technical checking and verify RBP entries.</p>
      </div>

      {/* Filters for Queue */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 mb-6 shadow-sm border border-white/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by Submitter or Project ID..."
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 bg-white/50 backdrop-blur-sm focus:ring-orange-200 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-white/50 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 outline-none">
            <option>All Types</option>
            <option>DED Only</option>
            <option>POW Only</option>
          </select>
          <button className="p-2.5 border border-gray-200 rounded-xl bg-white/50">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="glass-panel overflow-hidden shadow-lg border border-white/50 rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-[color:var(--border-color)] text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                <th className="p-6">Project & Submission</th>
                <th className="p-6">Type</th>
                <th className="p-6">Submitter</th>
                <th className="p-6 text-center">Priority</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading Review Queue...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">No items pending review.</td></tr>
              ) : (
                projects.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[color:var(--dpwh-blue)] text-xs mb-1">{item.alternateId || item.id.substring(0, 8).toUpperCase()}</span>
                        <span className="font-bold text-slate-800 tracking-tight">{item.project}</span>
                        <div className="flex items-center mt-1.5 text-[10px] text-gray-400 font-bold">
                          <Clock className="w-3 h-3 mr-1" />
                          SUBMITTED {item.time.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="font-black px-2.5 py-1 bg-slate-100 text-slate-500 rounded text-[9px] uppercase border border-slate-200">
                        {item.doc}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">
                          P
                        </div>
                        <span className="text-xs font-bold text-gray-500">Planning Unit</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getPriorityStyle(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-6 text-right whitespace-nowrap">
                      <Link href={`/dashboard/rbp/${item.id}`} className="inline-flex items-center space-x-2 bg-[color:var(--dpwh-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-blue-800 transition-all active:scale-95">
                        <span>OPEN REVIEW</span>
                        <ExternalLink className="w-3 h-3" />
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
        <div className="glass-panel p-5 bg-white border-l-4 border-orange-400 shadow-sm">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Technical Workload</h4>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-slate-700">{projects.length} Submissions</span>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">Pending</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-white border-l-4 border-blue-500 shadow-sm">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Master Inventory</h4>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-slate-700">{masterListCount} Active RBP</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Included</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-white border-l-4 border-emerald-500 shadow-sm">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Completion Rate</h4>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-slate-700">84%</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Target</span>
          </div>
        </div>
      </div>

    </div>
  );
}
