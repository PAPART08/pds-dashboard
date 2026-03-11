"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Stamp,
  Search,
  Send,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function ApprovalQueuePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');

        const isSupabaseConfigured = true;

        let supabaseData: any[] = [];
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.from('projects').select('*');
          if (!error && data) {
            supabaseData = data.map(p => ({
              id: p.id,
              alternateId: p.alternate_id,
              name: p.project_name || 'No Description',
              cost: (p.project_amount / 1000000).toFixed(1) + 'M',
              status: 'Technically Vetted',
              date: new Date(p.created_at).toLocaleDateString()
            }));
          }
        }

        const formattedLocal = localData.map((p: any) => ({
          id: p.id,
          alternateId: p.alternateId,
          name: p.projectDescription || 'No Description',
          cost: (p.totalCost / 1000000).toFixed(1) + 'M',
          status: 'Technically Vetted',
          date: new Date(p.createdAt || Date.now()).toLocaleDateString()
        }));

        const combined = [...supabaseData, ...formattedLocal];
        setProjects(combined);
      } catch (err) {
        console.error('Error fetching approval items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-0 pb-10">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--dpwh-blue)' }}>Final Approval Queue</h1>
          <p className="text-[color:var(--text-muted)]">Oversight and official recommendation for the RBP Master List.</p>
        </div>
        <button className="btn btn-secondary shadow-lg">
          <Send className="w-4 h-4 mr-2" />
          Authorize Submission
        </button>
      </div>

      {/* Oversight Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border-l-4 border-[color:var(--dpwh-blue)] bg-white shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Total RBP Proposals</p>
              <p className="text-3xl font-black" style={{ color: 'var(--dpwh-blue)' }}>₱185.0M</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-[color:var(--dpwh-blue)]">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">15 Projects across all Technical Units</p>
        </div>

        <div className="glass-panel p-6 border-l-4 border-emerald-500 bg-white shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Ready for Sign-off</p>
              <p className="text-3xl font-black text-emerald-900">2 Items</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-tight">Requires Final Recommendation</p>
        </div>
      </div>

      {/* Approval List */}
      <div className="glass-panel overflow-hidden shadow-xl border border-white/50 rounded-2xl">
        <div className="p-6 bg-gray-50/50 border-b border-gray-100">
          <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500">Pending Recommendation</h3>
        </div>
        <div className="divide-y divide-gray-50 bg-white">
          {isLoading ? (
            <div className="p-10 text-center text-gray-400">Loading Approval Queue...</div>
          ) : projects.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <p className="text-gray-400 font-medium">Your approval queue is clear.</p>
            </div>
          ) : (
            projects.map((item, idx) => (
              <div key={idx} className="p-6 hover:bg-gray-50/50 transition-colors group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-bold text-[color:var(--dpwh-blue)] text-xs">{item.alternateId || item.id.substring(0, 8).toUpperCase()}</span>
                      <h4 className="font-bold text-gray-800 tracking-tight">{item.name}</h4>
                    </div>
                    <div className="flex items-center space-x-6 text-xs text-gray-400">
                      <span className="font-bold text-gray-600">₱{item.cost}</span>
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5" /> Vetted {item.date}</span>
                      <span className="flex items-center text-emerald-600 font-bold"><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Technical Check Pass</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="btn btn-outline border-gray-100 hover:border-red-200 hover:bg-red-50 text-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase">
                      Reject
                    </button>
                    <button className="btn btn-secondary bg-[color:var(--dpwh-blue)] text-white px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center shadow-md hover:bg-emerald-600 transition-all active:scale-95">
                      <Stamp className="w-4 h-4 mr-2" />
                      Digital Sign-off
                    </button>
                    <Link href={`/dashboard/rbp/${item.id}`} className="p-2 border border-gray-200 rounded-xl hover:bg-white text-gray-400 hover:text-blue-600">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
