import { supabase } from './supabase';
import { ActivityLog } from './types';

export async function fetchActivityLogs(limit: number = 50, projectId?: string): Promise<ActivityLog[]> {
    let query = supabase
        .from('activity_logs')
        .select(`
            id,
            user_id,
            action_type,
            entity_type,
            entity_id,
            project_id,
            details,
            created_at,
            employee:employees(id, name, position, avatar_url),
            project:projects(id, project_name, alternate_id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (projectId) {
        query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching activity logs:', error);
        return [];
    }

    // Supabase joins arrays for one-to-many, but one-to-one or many-to-one returns object or array.
    // The select syntax above `employee:employees(...)` might return an object since employees is assumed unique.
    // We map to ensure type safety.
    return (data as any[]).map(item => ({
        ...item,
        employee: Array.isArray(item.employee) ? item.employee[0] : item.employee,
        project: Array.isArray(item.project) ? item.project[0] : item.project
    }));
}
