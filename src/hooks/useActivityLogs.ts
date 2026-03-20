'use client';

import { useState, useEffect } from 'react';
import { ActivityLog } from '../lib/types';
import { fetchActivityLogs } from '../lib/activity-logs';
import { supabase } from '../lib/supabase';

interface UseActivityLogsProps {
    projectId?: string;
    limit?: number;
    realtime?: boolean;
}

export function useActivityLogs({ projectId, limit = 50, realtime = true }: UseActivityLogsProps = {}) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await fetchActivityLogs(limit, projectId);
            setLogs(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();

        if (realtime) {
            let channelFilter: string | undefined = undefined;
            if (projectId) {
                channelFilter = `project_id=eq.${projectId}`;
            }

            const channel = supabase
                .channel('activity-log-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'activity_logs',
                        filter: channelFilter
                    },
                    (payload) => {
                        // When a new log comes in, we trigger a re-fetch because the raw payload 
                        // lacks the joined employee name and project name.
                        // We could fetch just the new log with joins, but reloading is simpler for MVP.
                        // Alternatively, we add it to state if we don't care about joins.
                        loadLogs(); 
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [projectId, limit, realtime]);

    return { logs, loading, error, refetch: loadLogs };
}
