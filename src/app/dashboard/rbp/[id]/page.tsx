"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  FileText,
  Upload,
  History,
  MessageSquare,
  ArrowUpRight,
  Eye,
  UserPlus
} from 'lucide-react';
import { getRequiredDocs } from '@/lib/supporting-docs';
import { EMPLOYEES } from '@/lib/employees';

export default function ProjectTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState<string>('');
  const [docAssignments, setDocAssignments] = useState<Record<string, string>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [docDeadlines, setDocDeadlines] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const isSupabaseConfigured = true;

        let fetchedMembers: string[] = [];

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.from('employees').select('name').order('created_at', { ascending: true });
          if (!error && data && data.length > 0) {
            fetchedMembers = data.map((d: any) => d.name);
          }
        }

        if (fetchedMembers.length === 0) {
          const savedTeam = localStorage.getItem('pds_team');
          if (savedTeam) {
            fetchedMembers = JSON.parse(savedTeam).map((e: any) => e.name);
          } else {
            fetchedMembers = EMPLOYEES.map(e => e.name);
          }
        }

        setTeamMembers(fetchedMembers);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setTeamMembers(EMPLOYEES.map(e => e.name));
      }
    };

    fetchTeam();
  }, []);

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true);
      try {
        const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
        const localP = localData.find((p: any) => p.id === id);
        if (localP) {
          console.log('Found local project:', localP);
          setProject({
            id: localP.id,
            alternateId: localP.alternateId || localP.id.substring(0, 8).toUpperCase(),
            name: localP.projectDescription || localP.project_name || 'No Description',
            cost: localP.totalCost || localP.projectAmount || 0,
            status: localP.status || 'Drafting',
            subProgramCode: localP.subProgramCode || localP.sub_program_code,
            thrust: localP.thrust
          });
          setAssignment(localP.assignedTo || '');
          setDocAssignments(localP.docAssignments || {});
          setUploadedDocs(localP.uploadedDocs || {});
          setDocDeadlines(localP.docDeadlines || {});
          setIsLoading(false);
          return;
        }

        if (true) {
          const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
          if (!error && data) {
            setProject({
              id: data.id,
              alternateId: data.alternate_id || data.id.substring(0, 8).toUpperCase(),
              name: data.project_name,
              cost: data.project_amount || 0,
              status: data.status || 'Drafting',
              subProgramCode: data.sub_program_code,
              thrust: data.thrust,
              deadline: data.deadline
            });
            setAssignment(data.assigned_to || '');
            setDocAssignments(data.doc_assignments || {});
            setDocDeadlines(data.doc_deadlines || {});
            // Merge with local uploaded docs if any
            const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
            const localP = localData.find((p: any) => p.id === id);
            if (localP && localP.uploadedDocs) {
              setUploadedDocs(localP.uploadedDocs);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching project detail:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleAssignProject = async (name: string) => {
    setAssignment(name);
    // 1. Local Storage
    const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
    const index = localData.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      localData[index].assignedTo = name;
      localStorage.setItem('rbp_projects', JSON.stringify(localData));
    }

    // 2. Supabase
    try {
      const { error } = await supabase
        .from('projects')
        .update({ assigned_to: name })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Supabase sync error (Project Assignment):', err);
    }
  };

  const handleAssignDoc = async (docCode: string, name: string) => {
    const newDocAssignments = { ...docAssignments, [docCode]: name };
    setDocAssignments(newDocAssignments);

    // 1. Local Storage
    const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
    const index = localData.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      localData[index].docAssignments = newDocAssignments;
      localStorage.setItem('rbp_projects', JSON.stringify(localData));
    }

    // 2. Supabase
    try {
      const { error } = await supabase
        .from('projects')
        .update({ doc_assignments: newDocAssignments })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Supabase sync error (Doc Assignment):', err);
    }
  };

  const handleUploadDoc = (docCode: string, file: File) => {
    // We will just store the object URL for the uploaded file in local storage for demo purposes
    const url = URL.createObjectURL(file);
    const newUploadedDocs = { ...uploadedDocs, [docCode]: url };
    setUploadedDocs(newUploadedDocs);
    const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
    const index = localData.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      localData[index].uploadedDocs = newUploadedDocs;
      localStorage.setItem('rbp_projects', JSON.stringify(localData));
    }
    // Set a flag in session storage temporarily to pass the URL to the review screen
    sessionStorage.setItem(`pdf_${id}_${docCode}`, url);
  };

  const documents = getRequiredDocs(project?.subProgramCode, project?.thrust);

  const handleUpdateDocDeadline = async (docCode: string, date: string) => {
    // Validation: must not pass project deadline
    if (project?.deadline && date > project.deadline) {
      alert(`Error: Document deadline cannot pass project target date (${project.deadline})`);
      return;
    }

    const newDocDeadlines = { ...docDeadlines, [docCode]: date };
    setDocDeadlines(newDocDeadlines);

    // 1. Local Storage
    const localData = JSON.parse(localStorage.getItem('rbp_projects') || '[]');
    const index = localData.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      localData[index].docDeadlines = newDocDeadlines;
      localStorage.setItem('rbp_projects', JSON.stringify(localData));
    }

    // 2. Supabase
    try {
      const { error } = await supabase
        .from('projects')
        .update({ doc_deadlines: newDocDeadlines })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Supabase sync error (Doc Deadline):', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Under Review': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'In Progress': return 'text-orange-600 bg-orange-50 border-orange-100';
      default: return 'text-gray-400 bg-gray-50 border-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'Under Review': return <Clock className="w-4 h-4" />;
      case 'In Progress': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4 opacity-50" />;
    }
  };

  const isMember = currentUser?.role === 'Unit Member' || currentUser?.role === 'Regular Member';
  const isUnitHead = currentUser?.role === 'Unit Head';
  const isSectionChief = currentUser?.role === 'Section Chief';
  const canAssignDocs = currentUser?.role === 'Section Chief' || currentUser?.role === 'Unit Head';
  const canAssignLead = currentUser?.role === 'Unit Head' || currentUser?.role === 'Section Chief';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <Link
          href={isMember ? "/dashboard/user-task" : "/dashboard/technical-review"}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
          title={isMember ? "Back to My Activity" : "Back to Review Queue"}
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--dpwh-blue)' }}>Project {project?.alternateId || id.substring(0, 8).toUpperCase()}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">{project?.status || 'RBP-Proposed'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">SP: {project?.subProgramCode || 'NONE'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">T: {project?.thrust ? 'SET' : 'MISSING'}</span>
          </div>
          <p className="text-[color:var(--text-muted)]">{project?.name} / ₱{((project?.cost || 0) / 1000000).toFixed(1)}M</p>
          {project?.deadline && (
            <p className="text-[10px] font-black text-red-500 mt-1 uppercase tracking-widest bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100 italic">
              Project Deadline: {new Date(project.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Col: Document Tracking Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel overflow-hidden border-t-4 shadow-md bg-white border-blue-500">
            <div className="p-6 border-b border-[color:var(--border-color)] flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center">
                <FileText className="w-5 h-5 mr-3 text-[color:var(--dpwh-blue)]" />
                Supporting Documents Checklist
              </h3>
              <div className="text-sm font-medium text-[color:var(--text-muted)]">
                {Object.keys(uploadedDocs).length} / {documents.length} Completed
              </div>
            </div>

            <div className="divide-y divide-[color:var(--border-color)]">
              {documents.map((doc: any, idx) => (
                <div key={idx} className="p-5 hover:bg-gray-50/50 transition-colors group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-sm group-hover:text-[color:var(--dpwh-blue)] transition-colors">{doc.label}</h4>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${uploadedDocs[doc.code] ? getStatusColor('Approved') : getStatusColor('Pending')}`}>
                          {uploadedDocs[doc.code] ? getStatusIcon('Approved') : getStatusIcon('Pending')}
                          {uploadedDocs[doc.code] ? 'SUBMITTED' : 'PENDING'}
                        </span>
                        {docAssignments[doc.code] && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                            <User className="w-3 h-3" />
                            {docAssignments[doc.code].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center space-x-6 text-xs text-gray-400">
                        <span className="flex items-center"><User className="w-3 h-3 mr-1.5" /> Assigned: {docAssignments[doc.code] || 'None'}</span>
                        <span className="flex items-center"><History className="w-3 h-3 mr-1.5" /> Code: {doc.code}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Assignee</label>
                        <select
                          disabled={isMember}
                          className={`text-[10px] border rounded px-2 py-1 outline-none font-bold ${isMember ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                          value={docAssignments[doc.code] || ''}
                          onChange={(e) => handleAssignDoc(doc.code, e.target.value)}
                        >
                          <option value="">Tag Assignment</option>
                          {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Target Date</label>
                        <input
                          type="date"
                          disabled={!isUnitHead && !canAssignDocs}
                          className={`text-[10px] border rounded px-2 py-0.5 outline-none font-bold ${(!isUnitHead && !canAssignDocs) ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600'}`}
                          value={docDeadlines[doc.code] || ''}
                          onChange={(e) => handleUpdateDocDeadline(doc.code, e.target.value)}
                        />
                      </div>

                      <div className="flex items-end h-full py-1">
                        <Link href={`/dashboard/review-document/${id}/${doc.code}`} className="p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all text-gray-400 hover:text-blue-600" title="Review Document">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                      <button className="p-2 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-blue-600" title="View Version History">
                        <History className="w-4 h-4" />
                      </button>
                      <div className="relative inline-block">
                        {!isSectionChief && (!isMember || docAssignments[doc.code] === currentUser?.name) && (
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadDoc(doc.code, e.target.files[0]);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                        )}
                        <button
                          disabled={isSectionChief || (isMember && docAssignments[doc.code] !== currentUser?.name)}
                          className={`btn btn-outline py-1.5 px-4 text-xs font-bold border-dashed ${isSectionChief
                            ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                            : uploadedDocs[doc.code]
                              ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                              : (isMember && docAssignments[doc.code] !== currentUser?.name)
                                ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                                : 'border-gray-300 hover:border-blue-400 hover:text-blue-600 group-hover:bg-white'
                            }`}
                          title={isSectionChief ? "Section Chiefs cannot upload documents" : (isMember && docAssignments[doc.code] !== currentUser?.name) ? "Only assigned member can upload" : ""}
                        >
                          <Upload className="w-3.5 h-3.5 mr-2" />
                          {uploadedDocs[doc.code] ? 'RE-UPLOAD' : 'UPLOAD'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback / Communication Loop */}
          <div className="glass-panel p-6 shadow-sm border border-gray-100 bg-white">
            <h3 className="font-bold text-lg mb-4 flex items-center text-gray-700">
              <MessageSquare className="w-5 h-5 mr-3 text-orange-400" />
              Technical Review Feedback
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100 italic text-sm text-gray-600">
                "Please double check the structural analysis for the retaining wall section at station 1+250. The load calculations seem slightly off based on the latest geotech report."
                <div className="mt-2 not-italic text-[10px] font-bold text-orange-800 uppercase">— Unit Head (Design) • Oct 14, 2025</div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <input type="text" placeholder="Type a response or correction note..." className="flex-1 px-4 py-2 border rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none transition-all focus:ring-1 ring-blue-100" />
              <button className="btn btn-secondary px-6">SEND</button>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Actions & Summary */}
        <div className="space-y-6">
          <div className="glass-panel p-6 shadow-md border-t-4 border-emerald-500 bg-white">
            <h3 className="font-bold text-md mb-4 uppercase tracking-tighter text-gray-500">Unit Head Assignment</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Assign Primary Lead</p>
                <select
                  disabled={!canAssignLead}
                  className={`w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none ${!canAssignLead ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  value={assignment}
                  onChange={(e) => handleAssignProject(e.target.value)}
                >
                  <option value="">Select Member</option>
                  {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-50 flex flex-col gap-3">
                <button
                  disabled={!canAssignLead}
                  className={`btn btn-secondary w-full justify-center text-xs py-3 bg-[color:var(--dpwh-blue)] text-white font-bold ${!canAssignLead ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  CONFIRM ASSIGNMENT
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 shadow-sm border border-gray-100 bg-gray-50/30">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-4">Unit Members assigned to Documents</h4>
            <div className="space-y-3">
              {Object.entries(docAssignments).map(([code, name]) => (
                <div key={code} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm">
                    {name.split(' ').pop()?.charAt(0) || name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-700">{name}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-black">{code}</span>
                  </div>
                </div>
              ))}
              {Object.keys(docAssignments).length === 0 && <p className="text-[10px] italic text-gray-400">No documents assigned yet.</p>}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
