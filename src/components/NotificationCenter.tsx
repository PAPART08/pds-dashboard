'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './NotificationCenter.module.css';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    link: string | null;
    created_at: string;
};

export default function NotificationCenter() {
    const { session } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        };

        fetchNotifications();

        // Subscribe to real-time changes
        const channelName = `public:notifications:${session.user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`
                },
                (payload) => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [session?.user?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        if (!session?.user?.id) return;
        
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false);
            
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const getIconInfo = (type: string) => {
        switch (type.toLowerCase()) {
            case 'task':
            case 'task_assigned':
                return {
                    icon: 'assignment',
                    wrapperClass: styles.iconTask
                };
            case 'mention':
            case 'chat':
                return {
                    icon: 'alternate_email',
                    wrapperClass: styles.iconMention
                };
            case 'alert':
            case 'deadline':
            case 'overdue':
                return {
                    icon: 'warning',
                    wrapperClass: styles.iconAlert
                };
            default:
                return {
                    icon: 'notifications',
                    wrapperClass: styles.iconTask
                };
        }
    };

    return (
        <div className={styles.container}>
            <button 
                ref={triggerRef}
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="View notifications"
            >
                <span className={`material-symbols-outlined ${styles.icon}`}>notifications</span>
                {unreadCount > 0 && (
                    <span className={styles.badgeContainer}>
                        <span className={styles.ping}></span>
                        <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div ref={dropdownRef} className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className={styles.markReadBtn} onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                <span className="material-symbols-outlined block text-4xl mb-2 opacity-50">notifications_off</span>
                                No new notifications
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const info = getIconInfo(notification.type);
                                return (
                                    <div 
                                        key={notification.id} 
                                        className={`${styles.item} ${!notification.is_read ? styles.itemUnread : ''}`}
                                        onClick={() => {
                                            if (!notification.is_read) markAsRead(notification.id);
                                            if (notification.link) {
                                                window.location.href = notification.link;
                                            }
                                        }}
                                    >
                                        <div className={`${styles.iconWrapper} ${info.wrapperClass}`}>
                                            <span className="material-symbols-outlined text-sm">{info.icon}</span>
                                        </div>
                                        <div className={styles.content}>
                                            <p 
                                                className={styles.message} 
                                                dangerouslySetInnerHTML={{ __html: notification.message }} 
                                            />
                                            <p className={styles.timestamp}>
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.is_read && (
                                            <div className={styles.unreadDot} />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {notifications.length > 0 && (
                        <a href="/dashboard" className={styles.footer}>
                            View all notifications
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
