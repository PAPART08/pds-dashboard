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
  const [activeTab, setActiveTab] = useState<'queue' | 'master'>('queue');
  const [projects, setProjects] = useState<any[]>([]);
  const [masterList, setMasterList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination for Master List
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchAllData = async () => {
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
              assignedTo: null,
              isIncludedInMasterList: p.is_included_in_master_list || false,
              location: p.city_municipality || 'Unspecified',
              costValue: p.project_amount || 0,
              fiscalYear: (p.start_year || 2025).toString()
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
          assignedTo: p.assignedTo || null,
          isIncludedInMasterList: p.isIncludedInMasterList || false,
          location: p.municipality || 'Unspecified',
          costValue: p.totalCost || 0,
          fiscalYear: p.fiscalYear || '2025'
        }));

        const combined = [...supabaseData, ...formattedLocal];

        // 1. Review Queue: Filtering by assignment if Unit Head
        let queueItems = [...combined];
        if (currentUser?.role === 'Unit Head' && currentUser?.name) {
          queueItems = queueItems.filter((p: any) => p.assignedTo === currentUser.name);
        }
        setProjects(queueItems);

        // 2. Master List: Items explicitly included
        const masterItems = combined.filter(p => p.isIncludedInMasterList === true);
        setMasterList(masterItems);

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

  const paginatedMaster = masterList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-0 pb-10">

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--dpwh-blue)' }}>Technical Review Queue</h1>
        <p className="text-[color:var(--text-muted)] text-sm">Perform technical checking and verify RBP entries.</p>
      </div>

      {/* DPWH Style Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-6 py-3 text-sm font-bold tracking-wider uppercase transition-all border-b-2 ${activeTab === 'queue' ? 'border-[color:var(--dpwh-blue)] text-[color:var(--dpwh-blue)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Review Pending
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`px-6 py-3 text-sm font-bold tracking-wider uppercase transition-all border-b-2 ${activeTab === 'master' ? 'border-[color:var(--dpwh-blue)] text-[color:var(--dpwh-blue)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Master List View
        </button>
      </div>

      {activeTab === 'queue' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Master List View */}
          <div className="glass-panel overflow-hidden shadow-lg border border-white/50 rounded-2xl bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-[color:var(--border-color)] text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                    <th className="p-6">Project Metadata</th>
                    <th className="p-6">Location</th>
                    <th className="p-6">Cost Profile</th>
                    <th className="p-6">FY</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading Master List...</td></tr>
                  ) : masterList.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic font-medium py-12">The Master List is currently empty. Approvals needed.</td></tr>
                  ) : (
                    paginatedMaster.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[color:var(--dpwh-blue)] text-xs mb-1">{item.alternateId || item.id.substring(0, 8).toUpperCase()}</span>
                            <span className="font-bold text-slate-800 tracking-tight line-clamp-1">{item.project}</span>
                          </div>
                        </td>
                        <td className="p-6 text-gray-600 font-medium text-xs">{item.location}</td>
                        <td className="p-6">
                          <span className="font-bold text-slate-700">₱{(item.costValue / 1000000).toFixed(2)}M</span>
                        </td>
                        <td className="p-6 text-xs font-black text-gray-400">{item.fiscalYear}</td>
                        <td className="p-6 text-right">
                          <Link href={`/dashboard/rbp/${item.id}`} className="p-2 inline-block bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-100 transition-colors shadow-sm">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Master List */}
            {masterList.length > itemsPerPage && (
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center px-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Page {currentPage} of {Math.ceil(masterList.length / itemsPerPage)}</span>
                <div className="flex gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-1 bg-white border border-gray-200 rounded disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <button
                    disabled={currentPage >= Math.ceil(masterList.length / itemsPerPage)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-1 bg-white border border-gray-200 rounded disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

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
            <span className="text-xl font-black text-slate-700">{masterList.length} Active RBP</span>
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
