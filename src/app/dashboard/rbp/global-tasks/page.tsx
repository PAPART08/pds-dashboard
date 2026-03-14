"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    Search,
    Calendar,
    User,
    Clock,
    ChevronRight,
    Save,
    ArrowLeft,
    Filter,
    Users
} from 'lucide-react';
import { EMPLOYEES } from '@/lib/employees';

interface Project {
    id: string;
    alternateId: string;
    projectDescription: string;
    municipality: string;
    totalCost: number;
    status: string;
    assignedTo?: string; // Unit Head Lead
    deadline?: string;
    isIncludedInMasterList: boolean;
    createdAt: string;
}

export default function GlobalTaskListPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const router = useRouter();
    const [unitHeads, setUnitHeads] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            
            // Access control for Unit Head
            if (user.role === 'Unit Head') {
                router.push('/dashboard/unit-head-task');
                return;
            }
        }

        // Fetch Unit Heads for assignment
        const savedTeam = localStorage.getItem('pds_team');
        let team = [];
        if (savedTeam) {
            team = JSON.parse(savedTeam);
        } else {
            team = EMPLOYEES;
        }
        const heads = team
            .filter((e: any) => e.position === 'Unit Head' || e.user_type === 'Admin')
            .map((e: any) => e.name);
        setUnitHeads(heads);

        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            // Fetch projects and their associated tasks from Supabase
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    tasks (*)
                `)
                .eq('is_included_in_master_list', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedData = data.map(p => {
                    // Find the PROJECT_LEAD task if it exists
                    const leadTask = p.tasks?.find((t: any) => t.task_type === 'PROJECT_LEAD');
                    
                    return {
                        id: p.id,
                        alternateId: p.alternate_id || p.id.substring(0, 8).toUpperCase(),
                        projectDescription: p.project_name || 'No Description',
                        municipality: p.city_municipality || 'Unspecified',
                        totalCost: p.project_amount || 0,
                        status: p.status || 'PROPOSED',
                        assignedTo: leadTask?.assignee_name || p.assigned_to || '',
                        deadline: leadTask?.deadline || p.deadline || '',
                        isIncludedInMasterList: p.is_included_in_master_list || false,
                        createdAt: p.created_at
                    };
                });

                setProjects(mappedData);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProject = (projectId: string, field: string, value: any) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, [field]: value } : p));
    };

    const saveProjectChanges = async (projectId: string) => {
        setIsSaving(projectId);
        try {
            const projectToSave = projects.find(p => p.id === projectId);
            if (!projectToSave) return;

            // 1. Update the projects table (legacy/compatibility)
            const { error: pError } = await supabase
                .from('projects')
                .update({
                    assigned_to: projectToSave.assignedTo,
                    deadline: projectToSave.deadline
                })
                .eq('id', projectId);

            if (pError) throw pError;

            // 2. Upsert into the TASKS table for PROJECT_LEAD
            // First check if it exists
            const { data: existingTask } = await supabase
                .from('tasks')
                .select('id')
                .eq('project_id', projectId)
                .eq('task_type', 'PROJECT_LEAD')
                .single();

            if (existingTask) {
                await supabase
                    .from('tasks')
                    .update({
                        assignee_name: projectToSave.assignedTo,
                        deadline: projectToSave.deadline || null,
                        status: 'In Progress'
                    })
                    .eq('id', existingTask.id);
            } else if (projectToSave.assignedTo) {
                await supabase
                    .from('tasks')
                    .insert({
                        project_id: projectId,
                        assignee_name: projectToSave.assignedTo,
                        task_type: 'PROJECT_LEAD',
                        deadline: projectToSave.deadline || null,
                        status: 'In Progress'
                    });
            }

            // Feedback
            setTimeout(() => setIsSaving(null), 500);
        } catch (err) {
            console.error('Error saving changes:', err);
            setIsSaving(null);
            alert('Failed to save changes to Supabase.');
        }
    };

    const displayProjects = projects.filter(p => {
        const matchesSearch = p.projectDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.alternateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.municipality.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const canEditDeadline = currentUser?.role === 'Section Chief' || currentUser?.role === 'Admin';
    const canAssignLead = currentUser?.role === 'Section Chief' || currentUser?.role === 'Admin';

    return (
        <div className="space-y-6 animate-fade-in pb-10">

            {/* Header Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/dashboard" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Global Task Management</h1>
                    </div>
                    <p className="text-sm text-gray-500 pl-9">
                        Centralized project assignment and timeline coordination for FY 2025.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="pl-16 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="glass-panel overflow-hidden border border-gray-100 shadow-xl bg-white rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                                <th className="px-6 py-4">Project Identification</th>
                                <th className="px-6 py-4">Unit Head Lead</th>
                                <th className="px-6 py-4">Timeline (Deadline)</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">Synchronizing project data...</td>
                                </tr>
                            ) : displayProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic font-medium">No projects found.</td>
                                </tr>
                            ) : displayProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-blue-900 tracking-tight text-sm mb-0.5">{project.alternateId}</span>
                                            <span className="text-xs text-gray-600 font-medium max-w-[280px] truncate" title={project.projectDescription}>{project.projectDescription}</span>
                                            <span className="text-[10px] text-gray-400 flex items-center mt-1">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {project.municipality} • ₱{(project.totalCost / 1000000).toFixed(1)}M
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-2">
                                            <div className={`p-2 rounded-lg ${canAssignLead ? 'bg-white border border-gray-100' : 'bg-gray-50 border-transparent'} shadow-sm min-w-[180px]`}>
                                                <div className="flex items-center space-x-2">
                                                    <Users className={`w-3.5 h-3.5 ${project.assignedTo ? 'text-blue-500' : 'text-gray-300'}`} />
                                                    <select
                                                        disabled={!canAssignLead}
                                                        className={`bg-transparent text-xs font-bold outline-none w-full ${!canAssignLead ? 'cursor-not-allowed opacity-60' : 'cursor-pointer text-gray-700'}`}
                                                        value={project.assignedTo}
                                                        onChange={(e) => handleUpdateProject(project.id, 'assignedTo', e.target.value)}
                                                    >
                                                        <option value="">No Lead Assigned</option>
                                                        {unitHeads.map(name => <option key={name} value={name}>{name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-5">
                                        <div className={`flex items-center space-x-2 ${canEditDeadline ? 'bg-white border border-gray-100' : 'bg-gray-50 border-transparent'} p-2 rounded-lg shadow-sm min-w-[160px]`}>
                                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                            <input
                                                type="date"
                                                disabled={!canEditDeadline}
                                                className={`bg-transparent text-xs font-bold outline-none w-full ${!canEditDeadline ? 'cursor-not-allowed opacity-60 text-gray-500' : 'text-gray-700 pointer-events-auto cursor-pointer'}`}
                                                value={project.deadline}
                                                onChange={(e) => handleUpdateProject(project.id, 'deadline', e.target.value)}
                                            />
                                        </div>
                                    </td>

                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                onClick={() => saveProjectChanges(project.id)}
                                                disabled={isSaving === project.id}
                                                className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${isSaving === project.id
                                                    ? 'bg-emerald-500 text-white animate-pulse'
                                                    : 'bg-[color:var(--dpwh-blue)] text-white hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5'
                                                    }`}
                                                title="Save Changes"
                                            >
                                                {isSaving === project.id ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    <Save className="w-4 h-4" />
                                                )}
                                            </button>
                                            <Link
                                                href={`/dashboard/rbp/${project.id}`}
                                                className="p-2.5 bg-gray-50 border border-gray-100 text-gray-500 rounded-xl hover:bg-white hover:border-blue-200 hover:text-blue-500 hover:shadow-sm transition-all"
                                                title="View Project Workspace"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Total Projects: {projects.length}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Assigned Leads: {projects.filter(p => !!p.assignedTo).length}
                    </span>
                </div>
                <p>FY 2025 Regional Budget Proposal • Planning and Design Division</p>
            </div>

        </div>
    );
}

// Icons for local consumption
function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
