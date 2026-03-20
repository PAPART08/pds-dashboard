'use client';

import React, { useState } from 'react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { ActivityItem } from './ActivityItem';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
    projectId?: string;
    global?: boolean;
    hideHeader?: boolean;
}

export function ActivityFeed({ projectId, global = false, hideHeader = false }: ActivityFeedProps) {
    const { logs, loading, error } = useActivityLogs({ 
        projectId, 
        limit: 50, 
        realtime: true 
    });

    const [filterType, setFilterType] = useState<string>('ALL');

    if (error) {
        return <div className={styles.feedContainer}><div className={styles.error}>Error loading activity: {error}</div></div>;
    }

    // Filter logs if needed
    const filteredLogs = logs.filter(log => {
        if (filterType === 'ALL') return true;
        return log.action_type === filterType;
    });

    // Group logs by Date (e.g. "Today", "Yesterday", or "Oct 12")
    const groupLogsByDate = () => {
        const groups: { [key: string]: typeof logs } = {};
        
        filteredLogs.forEach(log => {
            const date = new Date(log.created_at);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            
            if (date.toDateString() === today.toDateString()) {
                dateString = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateString = 'Yesterday';
            }
            
            if (!groups[dateString]) {
                groups[dateString] = [];
            }
            groups[dateString].push(log);
        });
        
        return groups;
    };

    const groupedLogs = groupLogsByDate();

    return (
        <div className={styles.feedContainer}>
            {!hideHeader && (
                <div className={styles.header}>
                    <h2 className={styles.title}>{global ? 'Global Team Activity' : 'Project Activity'}</h2>
                    <div className={styles.controls}>
                        <select 
                            className={styles.filterSelect}
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Activity</option>
                            <option value="INSERT">Additions</option>
                            <option value="UPDATE">Updates</option>
                            <option value="DELETE">Deletions</option>
                        </select>
                    </div>
                </div>
            )}

            {loading && logs.length === 0 ? (
                <div className={styles.loading}>Loading activity feed...</div>
            ) : filteredLogs.length === 0 ? (
                <div className={styles.empty}>No recent activity found.</div>
            ) : (
                <div className={styles.timeline}>
                    {Object.entries(groupedLogs).map(([dateLabel, groupLogs]) => (
                        <div key={dateLabel} className={styles.timelineGroup}>
                            <h3 className={styles.timelineDate}>{dateLabel}</h3>
                            <div className={styles.itemsList}>
                                {groupLogs.map(log => (
                                    <ActivityItem key={log.id} log={log} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
