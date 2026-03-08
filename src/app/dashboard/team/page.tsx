"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  ShieldCheck,
  Settings,
  Search,
  UserPlus,
  Key,
  ChevronRight,
  HardHat,
  FileCheck,
  X,
  Check,
  Loader2,
  Trash2
} from 'lucide-react';
import { EMPLOYEES, Employee } from '@/lib/employees';

export default function TeamPage() {
  const [team, setTeam] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<Employee>>({
    name: '',
    username: '',
    email: '',
    position: '',
    unit: '',
    user_type: 'User',
    restrictions: [],
    password: ''
  });

  const ALL_PERMISSIONS = [
    'RBP Encoding',
    'Tech. Review',
    'Final Approval',
    'Master List Management',
    'Global Task & Lead Assignment',
    'Document Preparation',
    'DUPA Preparation',
    'Plan Preparation',
    'Scheduling'
  ];

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      setIsLoading(true);
      try {
        const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: true });
          if (!error && data && data.length > 0) {
            // Map the snake_case data if any to camelCase if needed, but our SQL used the same keys.
            setTeam(data as Employee[]);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching team from Supabase:', err);
      }

      // Fallback
      const savedTeam = localStorage.getItem('pds_team');
      if (savedTeam) {
        setTeam(JSON.parse(savedTeam));
      } else {
        setTeam(EMPLOYEES);
      }
      setIsLoading(false);
    };

    fetchTeam();
  }, []);

  const saveTeamLocally = (updatedTeam: Employee[]) => {
    setTeam(updatedTeam);
    localStorage.setItem('pds_team', JSON.stringify(updatedTeam));
  };

  const filteredTeam = team.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee({ ...employee });
    setIsEditing(true);
  };

  const togglePermission = (perm: string) => {
    if (!selectedEmployee) return;
    const current = selectedEmployee.restrictions || [];
    const next = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm];
    setSelectedEmployee({ ...selectedEmployee, restrictions: next });
  };

  const handleSaveRestrictions = async () => {
    if (!selectedEmployee) return;
    const updatedTeam = team.map(e => e.id === selectedEmployee.id ? selectedEmployee : e);

    // Optimistic UI update and Local Storage Fallback
    saveTeamLocally(updatedTeam);

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('employees')
          .update({
            user_type: selectedEmployee.user_type,
            restrictions: selectedEmployee.restrictions,
            username: selectedEmployee.username,
            password: selectedEmployee.password
          })
          .eq('id', selectedEmployee.id);
      } catch (err) {
        console.error('Failed to update employee in Supabase', err);
      }
    }

    setIsEditing(false);
    setSelectedEmployee(null);
  };

  const handleDeleteMember = async () => {
    if (!selectedEmployee) return;

    const confirmDelete = window.confirm(`Are you sure you want to remove ${selectedEmployee.name}?`);
    if (!confirmDelete) return;

    const updatedTeam = team.filter(e => e.id !== selectedEmployee.id);
    saveTeamLocally(updatedTeam);

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('employees')
          .delete()
          .eq('id', selectedEmployee.id);
      } catch (err) {
        console.error('Failed to delete employee in Supabase', err);
      }
    }

    setIsEditing(false);
    setSelectedEmployee(null);
  };

  const handleSaveNewUser = async () => {
    if (!newUser.name || !newUser.position || !newUser.unit) return;

    // Create unique ID for local usage, but supabase uses uuid
    const tempId = `temp-${Date.now()}`;
    const employeeToSave = {
      ...newUser,
      id: tempId,
      restrictions: newUser.restrictions || [],
      password: newUser.password
    } as Employee;

    // Optimistic UI update and Local Storage Fallback
    const updatedTeam = [...team, employeeToSave];
    saveTeamLocally(updatedTeam);

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .insert([{
            name: newUser.name,
            username: newUser.username,
            email: newUser.email,
            position: newUser.position,
            unit: newUser.unit,
            user_type: newUser.user_type || 'User',
            restrictions: newUser.restrictions || [],
            password: newUser.password
          }])
          .select();

        // Overwrite temp UI item with real DB record
        if (!error && data && data.length > 0) {
          saveTeamLocally([...team, data[0] as Employee]);
        }
      } catch (err) {
        console.error('Failed to insert new member in Supabase', err);
      }
    }

    setIsAdding(false);
  };

  const getUserTypeIcon = (user_type: string) => {
    if (user_type === 'Admin') return ShieldCheck;
    return Users;
  };

  const getUserTypeColor = (user_type: string) => {
    if (user_type === 'Admin') return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-0 relative">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--dpwh-blue)' }}>Team & Permissions</h1>
          <p className="text-[color:var(--text-muted)]">Manage section personnel and their respective role-based access.</p>
        </div>
        <button
          className="btn btn-primary bg-[color:var(--dpwh-blue)]"
          onClick={() => {
            setNewUser({ name: '', username: '', email: '', position: 'Regular Member', unit: 'Planning & Design', user_type: 'User', restrictions: [], password: '' });
            setIsAdding(true);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Roles Definition List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-4 flex items-center justify-between bg-white/50 border-gray-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-200"
                style={{ borderColor: 'var(--border-color)' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-outline text-xs px-4 border-gray-100 uppercase font-bold">Filter</button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredTeam.map((emp) => {
              const Icon = getUserTypeIcon(emp.user_type);
              return (
                <div
                  key={emp.id}
                  className="glass-panel p-5 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => handleEditClick(emp)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getUserTypeColor(emp.user_type)} shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 tracking-tight">{emp.name}</h3>
                        <p className="text-xs text-blue-600 font-semibold">{emp.position} • {emp.unit}</p>
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-black text-gray-300 uppercase mb-1">Restrictions ({emp.restrictions?.length || 0})</p>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {(emp.restrictions || []).slice(0, 2).map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold border border-blue-100">
                            {r.toUpperCase()}
                          </span>
                        ))}
                        {(emp.restrictions || []).length > 2 && <span className="text-[9px] text-gray-400">+{(emp.restrictions || []).length - 2} more</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Permissions Legend */}
        <div className="space-y-6">
          <div className="glass-panel p-6 bg-[color:var(--dpwh-blue)] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
            <h3 className="font-bold mb-4 flex items-center px-1">
              <Key className="w-4 h-4 mr-2" />
              Access Control Matrix
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">RBP Encoding</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Tech. Review</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Final Approval</span>
                <FileCheck className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <p className="mt-6 text-[10px] text-white/60 font-medium px-1">
              Permissions are defined based on DPWH standard operating procedures for Planning & Design Sections.
            </p>
          </div>

          <div className="glass-panel p-6 border border-gray-100 bg-gray-50/50">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Section Lead</h4>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[color:var(--dpwh-blue)] text-white flex items-center justify-center font-bold text-xl shadow-lg border-4 border-white">
                AR
              </div>
              <p className="mt-3 font-bold text-gray-800">Engr. Antonio Reyes</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase">Section Chief</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL / OVERLAY FOR EDITING */}
      {isEditing && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-none">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Assign Restrictions</h3>
                <p className="text-xs text-gray-500">Managing permissions for <span className="font-bold text-blue-600">{selectedEmployee.name}</span></p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

              {/* Profile Edits */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedEmployee.name}
                    onChange={(e) => setSelectedEmployee({ ...selectedEmployee, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Position (Role)</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={selectedEmployee.position}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, position: e.target.value })}
                    >
                      <option value="Section Chief">Section Chief</option>
                      <option value="Unit Head">Unit Head</option>
                      <option value="Planning Unit">Planning Unit</option>
                      <option value="Regular Member">Regular Member</option>
                      <option value="Cost Estimator">Cost Estimator</option>
                      <option value="Project Programmer">Project Programmer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Assigned Unit</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={selectedEmployee.unit}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, unit: e.target.value })}
                    >
                      <option value="Planning & Design">Planning & Design</option>
                      <option value="Highway Design">Highway Design</option>
                      <option value="Bridge & Social">Bridge & Social</option>
                      <option value="Flood Control">Flood Control</option>
                      <option value="Environment & Social">Environment & Social</option>
                      <option value="Estimating">Estimating</option>
                      <option value="Planning">Planning</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">User Type (Access Level)</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedEmployee.user_type}
                    onChange={(e) => setSelectedEmployee({ ...selectedEmployee, user_type: e.target.value as 'Admin' | 'User' })}
                  >
                    <option value="User">Standard User</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Username</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Username"
                      value={selectedEmployee.username || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Password</label>
                    <input
                      type="password"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new password"
                      value={selectedEmployee.password || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-600 mb-3 mt-3 uppercase">Feature Restrictions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_PERMISSIONS.map((perm) => (
                    <button
                      key={perm}
                      onClick={() => togglePermission(perm)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedEmployee.restrictions.includes(perm)
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-sm'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                    >
                      <span className="text-[11px]">{perm}</span>
                      {selectedEmployee.restrictions.includes(perm) && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-center gap-3">
              <button
                className="btn btn-outline py-2 px-4 text-xs font-bold !text-red-500 !border-red-200 hover:!bg-red-50"
                onClick={handleDeleteMember}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                DELETE
              </button>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline py-2.5 px-6 font-bold text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  CANCEL
                </button>
                <button
                  className="btn btn-primary py-2.5 px-8 font-bold text-xs bg-[color:var(--dpwh-blue)] text-white shadow-lg shadow-blue-200"
                  onClick={handleSaveRestrictions}
                  disabled={!selectedEmployee.name}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / OVERLAY FOR ADDING NEW USER */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-none">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Add Team Member</h3>
                <p className="text-xs text-gray-500">Create a new organizational user account.</p>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Engr. Juan Dela Cruz"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Username</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. juan_pds"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Email Address</label>
                  <input
                    type="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="name@dpwh.gov.ph"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Position (Role)</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={newUser.position}
                  onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                >
                  <option value="" disabled>Select Role...</option>
                  <option value="Section Chief">Section Chief</option>
                  <option value="Unit Head">Unit Head</option>
                  <option value="Planning Unit">Planning Unit</option>
                  <option value="Regular Member">Regular Member</option>
                  <option value="Cost Estimator">Cost Estimator</option>
                  <option value="Project Programmer">Project Programmer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Assigned Unit</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={newUser.unit}
                  onChange={(e) => setNewUser({ ...newUser, unit: e.target.value })}
                >
                  <option value="" disabled>Select Unit...</option>
                  <option value="Planning & Design">Planning & Design</option>
                  <option value="Highway Design">Highway Design</option>
                  <option value="Bridge & Social">Bridge & Social</option>
                  <option value="Flood Control">Flood Control</option>
                  <option value="Environment & Social">Environment & Social</option>
                  <option value="Estimating">Estimating</option>
                  <option value="Planning">Planning</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">User Type (Role)</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={newUser.user_type}
                  onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value as 'Admin' | 'User' })}
                >
                  <option value="User">Standard User</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 material-symbols-outlined text-[16px]">lock</span>
                  <input
                    type="password"
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter initial password"
                    value={newUser.password || ''}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-end gap-3 mt-4">
                <button
                  className="btn btn-outline py-2.5 px-6 font-bold text-xs"
                  onClick={() => setIsAdding(false)}
                >
                  CANCEL
                </button>
                <button
                  className="btn btn-primary py-2.5 px-8 font-bold text-xs bg-[color:var(--dpwh-blue)] text-white shadow-lg shadow-blue-200"
                  onClick={handleSaveNewUser}
                  disabled={!newUser.name || !newUser.position || !newUser.unit}
                >
                  CREATE MEMBER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div >
  );
}
