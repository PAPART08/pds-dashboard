"use client";

import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Target, 
  History,
  HardHat,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function GAAPage() {
  const gaaProjects = [
    { id: '24G00012', name: 'Rehabilitation of Sogod-Bontoc Road', allocation: '₱150.0M', physical: '85%', financial: '72%', status: 'Ongoing', category: 'Roads' },
    { id: '24G00015', name: 'Bridge Widening along Maasin-Bontoc', allocation: '₱45.5M', physical: '42%', financial: '40%', status: 'Ongoing', category: 'Bridges' },
    { id: '24G00018', name: 'Coastal Bypass Road Ph. 2', allocation: '₱280.0M', physical: '12%', financial: '5%', status: 'Not Started', category: 'Roads' },
  ];

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--dpwh-orange)' }}>GAA Stage</h1>
          <p className="text-[color:var(--text-muted)]">Track funded projects transitioning from the RBP cycle.</p>
        </div>
        <div className="flex gap-2">
           <button className="btn btn-outline flex items-center bg-white border-gray-100 shadow-sm text-xs font-bold uppercase tracking-widest">
             <History className="w-4 h-4 mr-2" />
             Archived Projects
           </button>
           <button className="btn btn-primary shadow-lg bg-[color:var(--dpwh-orange)]">
             <Zap className="w-4 h-4 mr-2" />
             Transfer from RBP
           </button>
        </div>
      </div>

      {/* GAA Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 bg-white shadow-sm border-t-4 border-[color:var(--dpwh-orange)]">
           <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Active Contracts</p>
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-orange-50 rounded-lg text-[color:var(--dpwh-orange)]">
                <HardHat className="w-5 h-5" />
             </div>
             <span className="text-2xl font-black">28</span>
           </div>
        </div>
        <div className="glass-panel p-6 bg-white shadow-sm border-t-4 border-blue-500">
           <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Total Allocation</p>
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <ShieldCheck className="w-5 h-5" />
             </div>
             <span className="text-2xl font-black">₱2.4B</span>
           </div>
        </div>
        <div className="glass-panel p-6 bg-white shadow-sm border-t-4 border-emerald-500">
           <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Physical Targets</p>
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Target className="w-5 h-5" />
             </div>
             <span className="text-2xl font-black">64.2%</span>
           </div>
        </div>
        <div className="glass-panel p-6 bg-white shadow-sm border-t-4 border-blue-400">
           <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Disbursement</p>
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-50 rounded-lg text-blue-400">
                <TrendingUp className="w-5 h-5" />
             </div>
             <span className="text-2xl font-black">51.8%</span>
           </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="glass-panel overflow-hidden border border-white/40 shadow-xl rounded-2xl bg-white/40 backdrop-blur-md">
        <div className="p-4 flex flex-col md:flex-row gap-4 border-b border-gray-100 bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search by Project ID or Contractor..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-200" />
          </div>
          <button className="btn btn-outline border-white bg-white/50 text-xs px-6 rounded-xl">FILTER</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="p-6">GAA Project ID</th>
                <th className="p-6">Project Title</th>
                <th className="p-6 text-center">Physical %</th>
                <th className="p-6 text-center">Financial %</th>
                <th className="p-6">Allocation</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50 bg-white/40">
              {gaaProjects.map((project, idx) => (
                <tr key={idx} className="hover:bg-orange-50/5 transition-colors group">
                  <td className="p-6 font-bold text-[color:var(--dpwh-orange)]">{project.id}</td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 tracking-tight">{project.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-medium">{project.category}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                       <span className="text-xs font-black text-gray-700">{project.physical}</span>
                       <div className="w-20 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: project.physical }}></div>
                       </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                       <span className="text-xs font-black text-gray-700">{project.financial}</span>
                       <div className="w-20 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="bg-blue-400 h-full" style={{ width: project.financial }}></div>
                       </div>
                    </div>
                  </td>
                  <td className="p-6 font-black text-gray-600">{project.allocation}</td>
                  <td className="p-6 text-right">
                    <button className="p-3 bg-gray-50 rounded-xl group-hover:bg-[color:var(--dpwh-orange)] group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
