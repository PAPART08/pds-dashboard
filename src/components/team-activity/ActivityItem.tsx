import React from 'react';
import { ActivityLog } from '@/lib/types';
import styles from './ActivityFeed.module.css';
import { Clock, PlusCircle, Edit2, Trash2, FileText, Briefcase, Calendar, Info } from 'lucide-react';
import Link from 'next/link';

interface ActivityItemProps {
    log: ActivityLog;
}

export function ActivityItem({ log }: ActivityItemProps) {
    const { action_type, entity_type, entity_id, project_id, details, created_at, employee, project } = log;

    // Determine icon and styling based on action type
    const getIcon = () => {
        switch (action_type) {
            case 'INSERT': return <PlusCircle size={20} />;
            case 'UPDATE': return <Edit2 size={20} />;
            case 'DELETE': return <Trash2 size={20} />;
            default: return <Info size={20} />;
        }
    };

    const getEntityIcon = () => {
        switch (entity_type) {
            case 'projects':
            case 'project_components': return <Briefcase size={14} />;
            case 'tasks': return <FileText size={14} />;
            case 'calendar_events': return <Calendar size={14} />;
            default: return <Info size={14} />;
        }
    };

    // Format the time (e.g., "10:30 AM")
    const timeFormatted = new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Build the sentence
    const actorName = employee?.name || 'Unknown User';
    
    const getActionVerb = () => {
        if (action_type === 'INSERT') return 'created a new';
        if (action_type === 'UPDATE') return 'updated';
        if (action_type === 'DELETE') return 'deleted';
        return action_type.toLowerCase();
    };

    // Parse what changed (simplified view for MVP)
    let detailSummary = null;
    if (action_type === 'UPDATE' && details && Object.keys(details).length > 0) {
        const changes = Object.keys(details).filter(k => k !== 'updated_at' && k !== 'created_at');
        if (changes.length > 0) {
            detailSummary = `Changed: ${changes.join(', ')}`;
        }
    }

    // Determine URL if applicable
    let entityUrl = '#';
    let linkText = `${entity_type.replace('_', ' ')} ${entity_id.substring(0,6)}`;
    
    // Attempt to make human readable names instead of IDs
    if (entity_type === 'projects' && project) {
        linkText = project.project_name || project.alternate_id || linkText;
        entityUrl = `/dashboard/rbp/${project.id}`; // assuming it's RBP or similar
    } else if (project_id) {
        entityUrl = `/dashboard/rbp/${project_id}`; // Fallback to project page
    }

    return (
        <div className={styles.itemContainer}>
            <div className="relative flex-shrink-0">
               {employee?.avatar_url ? (
                   <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                       <img src={employee.avatar_url} alt={actorName} className="w-full h-full object-cover" />
                   </div>
               ) : (
                   <div className={`${styles.iconWrapper} ${styles[action_type] || ''}`}>
                       {getIcon()}
                   </div>
               )}
               {employee?.avatar_url && (
                   <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${styles.iconWrapper} ${styles[action_type] || ''}`} style={{ width: '20px', height: '20px', padding: 0 }}>
                       {React.cloneElement(getIcon() as any, { size: 10 })}
                   </div>
               )}
            </div>
            
            <div className={styles.contentWrapper}>
                <div className={styles.mainText}>
                    <span className={styles.userName}>{actorName}</span> {getActionVerb()}{' '}
                    {action_type !== 'DELETE' ? (
                        <Link href={entityUrl} className={styles.entityLink}>
                            {linkText}
                        </Link>
                    ) : (
                        <span>{linkText}</span>
                    )}
                </div>
                
                <div className={styles.metaInfo}>
                    <div className={styles.time}>
                        <Clock size={12} /> {timeFormatted}
                    </div>
                    {project && entity_type !== 'projects' && (
                        <div className={styles.projectName}>
                            {project.alternate_id || 'Project'}
                        </div>
                    )}
                </div>

                {detailSummary && (
                    <div className={styles.detailsBox}>
                        {detailSummary}
                    </div>
                )}
            </div>
        </div>
    );
}
