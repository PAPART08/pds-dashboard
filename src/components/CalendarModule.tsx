'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './CalendarModule.module.css';

interface CalendarEvent {
    id: string;
    user_name: string;
    title: string;
    description?: string;
    type: 'schedule' | 'task' | 'reminder';
    start_date: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    color: string;
    all_day: boolean;
    created_at: string;
}

interface NewEventForm {
    title: string;
    description: string;
    type: 'schedule' | 'task' | 'reminder';
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    color: string;
    all_day: boolean;
}

const EVENT_COLORS = [
    { value: '#6d28d9', label: 'Violet' },
    { value: '#2563eb', label: 'Blue' },
    { value: '#0891b2', label: 'Cyan' },
    { value: '#059669', label: 'Green' },
    { value: '#d97706', label: 'Amber' },
    { value: '#dc2626', label: 'Red' },
];

const TYPE_META = {
    schedule: { icon: 'event', label: 'Schedule', color: '#2563eb' },
    task: { icon: 'task_alt', label: 'Task', color: '#059669' },
    reminder: { icon: 'alarm', label: 'Reminder', color: '#d97706' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(date: Date): string {
    // Local date string YYYY-MM-DD without timezone shift
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function CalendarModule({ userName }: { userName: string }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDayModal, setShowDayModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<NewEventForm>({
        title: '',
        description: '',
        type: 'schedule',
        start_date: toDateStr(today),
        end_date: '',
        start_time: '',
        end_time: '',
        color: '#6d28d9',
        all_day: true,
    });

    const fetchEvents = useCallback(async () => {
        if (!userName) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_name', userName)
                .order('start_date', { ascending: true });
            if (error) throw error;
            setEvents((data as CalendarEvent[]) || []);
        } catch (err) {
            console.error('Failed to fetch calendar events:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userName]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // --- Calendar grid logic ---
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

    interface DayCell {
        date: Date;
        dateStr: string;
        isCurrentMonth: boolean;
        isToday: boolean;
        events: CalendarEvent[];
    }

    const cells: DayCell[] = [];
    for (let i = 0; i < totalCells; i++) {
        let date: Date;
        let isCurrentMonth: boolean;
        if (i < firstDayOfMonth) {
            // Previous month days
            date = new Date(viewYear, viewMonth - 1, daysInPrevMonth - firstDayOfMonth + i + 1);
            isCurrentMonth = false;
        } else if (i < firstDayOfMonth + daysInMonth) {
            date = new Date(viewYear, viewMonth, i - firstDayOfMonth + 1);
            isCurrentMonth = true;
        } else {
            date = new Date(viewYear, viewMonth + 1, i - firstDayOfMonth - daysInMonth + 1);
            isCurrentMonth = false;
        }
        const dateStr = toDateStr(date);
        const todayStr = toDateStr(today);
        cells.push({
            date,
            dateStr,
            isCurrentMonth,
            isToday: dateStr === todayStr,
            events: events.filter(e => e.start_date === dateStr),
        });
    }

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const goToToday = () => {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
    };

    // --- Day click ---
    const handleDayClick = (cell: DayCell) => {
        setSelectedDate(cell.dateStr);
        if (cell.events.length > 0) {
            setShowDayModal(true);
        } else {
            openCreateModal(cell.dateStr);
        }
    };

    const openCreateModal = (dateStr: string) => {
        setForm({
            title: '',
            description: '',
            type: 'schedule',
            start_date: dateStr,
            end_date: '',
            start_time: '',
            end_time: '',
            color: '#6d28d9',
            all_day: true,
        });
        setShowDayModal(false);
        setShowCreateModal(true);
    };

    // --- Save event ---
    const handleSaveEvent = async () => {
        if (!form.title.trim()) return;
        setIsSaving(true);
        try {
            const payload = {
                user_name: userName,
                title: form.title.trim(),
                description: form.description.trim() || null,
                type: form.type,
                start_date: form.start_date,
                end_date: form.end_date || null,
                start_time: (!form.all_day && form.start_time) ? form.start_time : null,
                end_time: (!form.all_day && form.end_time) ? form.end_time : null,
                color: form.color,
                all_day: form.all_day,
            };
            const { error } = await supabase.from('calendar_events').insert([payload]);
            if (error) throw error;
            await fetchEvents();
            setShowCreateModal(false);
        } catch (err: any) {
            alert(`Failed to save event: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Delete event ---
    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Delete this event?')) return;
        try {
            const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
            if (error) throw error;
            await fetchEvents();
            // Close day modal if no events left
            const remaining = events.filter(e => e.id !== eventId && e.start_date === selectedDate);
            if (remaining.length === 0) setShowDayModal(false);
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    const dayEvents = events.filter(e => e.start_date === selectedDate);

    const formatDisplayDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className={styles.calendarWrapper}>
            {/* Title Bar */}
            <div className={styles.calTitleBar}>
                <span className={styles.calTitleDot} />
                <span className={styles.calTitleText}>Task Calendar</span>
            </div>

            {/* Month Navigation Header */}
            <div className={styles.calHeader}>
                <div className={styles.calHeaderLeft}>
                    <button onClick={prevMonth} className={styles.navBtn} aria-label="Previous month">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h3 className={styles.calMonthLabel}>
                        {MONTHS[viewMonth]} <span className={styles.calYear}>{viewYear}</span>
                    </h3>
                    <button onClick={nextMonth} className={styles.navBtn} aria-label="Next month">
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
                <button onClick={goToToday} className={styles.todayBtn}>Today</button>
            </div>

            {/* Day headers */}
            <div className={styles.dayHeaders}>
                {DAYS.map(d => (
                    <div key={d} className={styles.dayHeader}>{d}</div>
                ))}
            </div>

            {/* Grid */}
            <div className={styles.grid}>
                {cells.map((cell, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleDayClick(cell)}
                        className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.dayCellMuted : ''} ${cell.isToday ? styles.dayCellToday : ''}`}
                    >
                        <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                        <div className={styles.eventDots}>
                            {cell.events.slice(0, 3).map((ev, i) => (
                                <span
                                    key={i}
                                    className={styles.eventDot}
                                    style={{ backgroundColor: ev.color }}
                                    title={ev.title}
                                />
                            ))}
                            {cell.events.length > 3 && (
                                <span className={styles.eventMore}>+{cell.events.length - 3}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Loading overlay */}
            {isLoading && (
                <div className={styles.loadingOverlay}>
                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '1.5rem' }}>refresh</span>
                </div>
            )}

            {/* Prominent New Event button */}
            <button onClick={() => openCreateModal(toDateStr(today))} className={styles.newEventBar}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                New Event
            </button>

            {/* Upcoming events mini-list */}
            <div className={styles.upcomingSection}>
                <p className={styles.upcomingLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', verticalAlign: 'middle' }}>upcoming</span>
                    &nbsp;Upcoming Events
                </p>
                {events.filter(e => e.start_date >= toDateStr(today)).slice(0, 4).length === 0 ? (
                    <p className={styles.noUpcoming}>No upcoming events</p>
                ) : (
                    events
                        .filter(e => e.start_date >= toDateStr(today))
                        .slice(0, 4)
                        .map(ev => (
                            <div key={ev.id} className={styles.upcomingItem}>
                                <div className={styles.upcomingDot} style={{ backgroundColor: ev.color }} />
                                <div className={styles.upcomingInfo}>
                                    <span className={styles.upcomingTitle}>{ev.title}</span>
                                    <span className={styles.upcomingDate}>
                                        {new Date(ev.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {ev.start_time && !ev.all_day ? ` · ${ev.start_time.slice(0, 5)}` : ' · All day'}
                                    </span>
                                </div>
                                <span
                                    className={styles.upcomingTypeBadge}
                                    style={{ backgroundColor: TYPE_META[ev.type].color + '22', color: TYPE_META[ev.type].color }}
                                >
                                    {TYPE_META[ev.type].label}
                                </span>
                            </div>
                        ))
                )}
            </div>

            {/* Day Events Modal */}
            {showDayModal && selectedDate && (
                <div className={styles.modalOverlay} onClick={() => setShowDayModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3 className={styles.modalTitle}>
                                    <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.375rem', fontSize: '1.1rem' }}>calendar_today</span>
                                    {formatDisplayDate(selectedDate)}
                                </h3>
                                <p className={styles.modalSubtitle}>{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => openCreateModal(selectedDate)} className={styles.modalAddBtn}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                                </button>
                                <button onClick={() => setShowDayModal(false)} className={styles.modalCloseBtn}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                                </button>
                            </div>
                        </div>
                        <div className={styles.modalBody}>
                            {dayEvents.map(ev => (
                                <div key={ev.id} className={styles.dayEventCard} style={{ borderLeftColor: ev.color }}>
                                    <div className={styles.dayEventIcon} style={{ color: ev.color }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{TYPE_META[ev.type].icon}</span>
                                    </div>
                                    <div className={styles.dayEventInfo}>
                                        <p className={styles.dayEventTitle}>{ev.title}</p>
                                        <p className={styles.dayEventMeta}>
                                            <span style={{ color: TYPE_META[ev.type].color, fontWeight: 700 }}>{TYPE_META[ev.type].label}</span>
                                            {!ev.all_day && ev.start_time && ` · ${ev.start_time.slice(0, 5)}${ev.end_time ? ' – ' + ev.end_time.slice(0, 5) : ''}`}
                                            {ev.all_day && ' · All day'}
                                        </p>
                                        {ev.description && <p className={styles.dayEventDesc}>{ev.description}</p>}
                                    </div>
                                    <button onClick={() => handleDeleteEvent(ev.id)} className={styles.dayEventDelete} title="Delete event">
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.375rem', fontSize: '1.1rem' }}>event_add</span>
                                New Event
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className={styles.modalCloseBtn}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                            </button>
                        </div>
                        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Type selector */}
                            <div className={styles.typeSelector}>
                                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setForm(f => ({ ...f, type: t }))}
                                        className={`${styles.typeBtn} ${form.type === t ? styles.typeBtnActive : ''}`}
                                        style={form.type === t ? { borderColor: TYPE_META[t].color, color: TYPE_META[t].color, backgroundColor: TYPE_META[t].color + '18' } : {}}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{TYPE_META[t].icon}</span>
                                        {TYPE_META[t].label}
                                    </button>
                                ))}
                            </div>

                            {/* Title */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Title <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className={styles.formInput}
                                    placeholder="Add a title..."
                                    autoFocus
                                />
                            </div>

                            {/* Dates row */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Start Date</label>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>End Date</label>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                        className={styles.formInput}
                                        min={form.start_date}
                                    />
                                </div>
                            </div>

                            {/* All day toggle */}
                            <label className={styles.toggleRow}>
                                <input
                                    type="checkbox"
                                    checked={form.all_day}
                                    onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))}
                                    className={styles.toggleCheck}
                                />
                                <span className={styles.toggleLabel}>All day</span>
                            </label>

                            {/* Time fields */}
                            {!form.all_day && (
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Start Time</label>
                                        <input
                                            type="time"
                                            value={form.start_time}
                                            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                                            className={styles.formInput}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>End Time</label>
                                        <input
                                            type="time"
                                            value={form.end_time}
                                            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                                            className={styles.formInput}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    className={styles.formTextarea}
                                    placeholder="Add notes or description..."
                                />
                            </div>

                            {/* Color */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Color</label>
                                <div className={styles.colorPicker}>
                                    {EVENT_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                            className={`${styles.colorSwatch} ${form.color === c.value ? styles.colorSwatchSelected : ''}`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowCreateModal(false)} className={styles.cancelBtn}>Cancel</button>
                            <button
                                onClick={handleSaveEvent}
                                disabled={!form.title.trim() || isSaving}
                                className={styles.saveBtn}
                                style={{ backgroundColor: form.color }}
                            >
                                {isSaving ? (
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }}>refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span>
                                )}
                                {isSaving ? 'Saving...' : 'Save Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
