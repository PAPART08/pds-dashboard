"use client";

import { use, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
    ChevronLeft,
    MousePointer2,
    Highlighter,
    Type,
    PenLine,
    Check,
    X,
    History,
    MessageSquare,
    Download,
    Save,
    Eraser,
    GitCompareArrows,
    Minus,
    Plus,
    StickyNote,
    Circle,
    Square,
    Undo2,
    Maximize,
    Minimize,
} from 'lucide-react';
import { SUPPORTING_DOC_DESCRIPTIONS } from '@/lib/supporting-docs';
import dynamic from 'next/dynamic';

const PdfReviewer = dynamic(() => import('@/components/PdfReviewer'), {
    ssr: false,
    loading: () => <div className="p-10 text-slate-400 text-xs font-bold animate-pulse tracking-widest uppercase">Initializing PDF Reviewer...</div>
});

const PdfRenderer = dynamic(() => import('@/components/PdfRenderer'), {
    ssr: false,
    loading: () => <div className="p-10 text-amber-400 text-xs font-bold animate-pulse tracking-widest uppercase">Loading Previous Version...</div>
});

interface TextAnnotation {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
}

export default function DocumentReviewPage({ params: paramsProp }: { params: any }) {
    const unwrappedParams = paramsProp && typeof paramsProp.then === 'function' ? use(paramsProp) : paramsProp;
    const { id, docCode } = (unwrappedParams || {}) as { id: string, docCode: string };

    const router = useRouter();

    const [activeTool, setActiveTool] = useState('select');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [comments, setComments] = useState<{ id: number, user: string, role: string, text: string, time: string, isResolved: boolean }[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { profile, loading: authLoading } = useAuth();

    const currentUser = profile ? { name: profile.name, role: profile.position } : null;

    // Zoom states
    const [zoom, setZoom] = useState(1.0);
    const [prevZoom, setPrevZoom] = useState(1.0);
    const zoomIn = () => setZoom(z => Math.min(z + 0.25, 2.5));
    const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));

    // Responsive structural offsets
    const [layoutOffset, setLayoutOffset] = useState({ offset: '-2.5rem' });
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 1024) {
                setLayoutOffset({ offset: '-1rem' });
            } else {
                setLayoutOffset({ offset: '-2.5rem' });
            }
        };
        handleResize(); // Initialize
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Comparison state
    const [previousPdfUrl, setPreviousPdfUrl] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState(false);
    const [prevNumPages, setPrevNumPages] = useState<number | null>(null);
    const [docVersions, setDocVersions] = useState<any[]>([]);
    const [selectedPrevVersion, setSelectedPrevVersion] = useState<string>('latest');
    const [prevPaths, setPrevPaths] = useState<any[]>([]);
    const [prevTextAnnotations, setPrevTextAnnotations] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const isCompareReady = showComparison && previousPdfUrl;

    // Comparison body class effect
    useEffect(() => {
        if (isCompareReady) {
            document.body.classList.add('compare-active');
        } else {
            document.body.classList.remove('compare-active');
        }
        return () => document.body.classList.remove('compare-active');
    }, [isCompareReady]);

    // Advanced annotation state
    const [strokeColor, setStrokeColor] = useState('#ef4444');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [showSettingsOptions, setShowSettingsOptions] = useState<string | null>(null);

    // Text formatting state
    const [textFontSize, setTextFontSize] = useState(15);
    const [textFontStyle, setTextFontStyle] = useState('normal');
    const [textFontWeight, setTextFontWeight] = useState('bold');

    // Drawing State & Undo History
    const [isDrawing, setIsDrawing] = useState(false);
    const [paths, setPaths] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState<any>(null);
    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
    const [showTextInput, setShowTextInput] = useState<{ x: number, y: number } | null>(null);
    const [textInputValue, setTextInputValue] = useState('');
    const textInputRef = useRef<HTMLInputElement>(null);
    const [draggingText, setDraggingText] = useState<{ index: number, startX: number, startY: number } | null>(null);
    const [historyStates, setHistoryStates] = useState<{paths: any[], textAnnotations: TextAnnotation[]}[]>([]);

    const saveHistoryState = (p = paths, t = textAnnotations) => {
        setHistoryStates(prev => [...prev.slice(-49), { paths: p, textAnnotations: t }]);
    };

    const handleUndo = () => {
        if (historyStates.length === 0) return;
        const lastState = historyStates[historyStates.length - 1];
        setPaths(lastState.paths);
        setTextAnnotations(lastState.textAnnotations);
        setHistoryStates(prev => prev.slice(0, -1));
    };

    const docName = SUPPORTING_DOC_DESCRIPTIONS[docCode as string] || 'Unknown Document';

    useEffect(() => {
        if (!authLoading && !profile) {
            const timer = setTimeout(() => {
                if (!profile) router.push('/login');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [profile, authLoading, router]);

    useEffect(() => {
        const savedComments = localStorage.getItem(`pds_comments_${id}_${docCode}`);
        if (savedComments) {
            setComments(JSON.parse(savedComments));
        } else {
            setComments([
                {
                    id: 1,
                    user: 'Engr. Sarah Lee',
                    role: 'Planning Unit',
                    text: "The chainage on page 3 doesn't match the RIF declaration. Please verify.",
                    time: 'Oct 14, 2025 • 09:30 AM',
                    isResolved: false
                }
            ]);
        }

        const savedAnnotations = localStorage.getItem(`pds_annotations_${id}_${docCode}`);
        if (savedAnnotations) {
            try { setPaths(JSON.parse(savedAnnotations)); } catch (_) { }
        }

        const savedTextAnnotations = localStorage.getItem(`pds_text_annotations_${id}_${docCode}`);
        if (savedTextAnnotations) {
            try { setTextAnnotations(JSON.parse(savedTextAnnotations)); } catch (_) { }
        }

        const fetchPdfUrl = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('doc_uploads, doc_history')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    const dbUrl = data.doc_uploads?.[docCode];
                    if (dbUrl) {
                        setPdfUrl(dbUrl);

                        const lastUrl = localStorage.getItem(`pds_last_url_${id}_${docCode}`);
                        if (lastUrl && lastUrl !== dbUrl) {
                            setPaths([]);
                            setTextAnnotations([]);
                        }
                        localStorage.setItem(`pds_last_url_${id}_${docCode}`, dbUrl);

                        const history = data.doc_history?.[docCode] || [];
                        setDocVersions(history);

                        if (history.length > 0) {
                            const lastVersion = history[history.length - 1];
                            setPreviousPdfUrl(lastVersion.url);
                            setPrevPaths(lastVersion.paths || []);
                            setPrevTextAnnotations(lastVersion.textAnnotations || []);

                            if (lastVersion.comments && lastVersion.comments.length > 0) {
                                setComments(lastVersion.comments);
                                localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(lastVersion.comments));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching PDF data:", err);
            }
        };

        fetchPdfUrl();
    }, [id, docCode]);

    useEffect(() => {
        if (showTextInput && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [showTextInput]);

    const handleApprove = async () => {
        try {
            const { data: p, error: fError } = await supabase.from('projects').select('doc_statuses').eq('id', id).single();
            if (fError) throw fError;
            const newStatuses = { ...(p.doc_statuses || {}), [docCode as string]: 'Approved' };
            const { error: uError } = await supabase.from('projects').update({ doc_statuses: newStatuses }).eq('id', id);
            if (uError) throw uError;

            await supabase.from('tasks').update({ status: 'Approved' }).eq('project_id', id).eq('task_type', 'DOC_COMPLIANCE').eq('doc_code', docCode);

            alert("Document Approved.");
            const userName = currentUser?.name || 'Reviewer';
            const userRole = currentUser?.role || 'Reviewer';
            setComments([...comments, { id: Date.now(), user: userName, role: userRole, text: 'Document Approved.', time: 'Just now', isResolved: true }]);
            setTimeout(() => router.push(`/dashboard/rbp/${id}`), 1000);
        } catch (err) {
            console.error("Failed to approve doc", err);
            alert("Approval failed to sync with database.");
        }
    };

    const handleReturn = async () => {
        try {
            const userName = currentUser?.name || 'Reviewer';
            const userRole = currentUser?.role || 'Reviewer';
            const updatedComments = [...comments, { id: Date.now(), user: userName, role: userRole, text: 'Document Returned for Corrections.', time: 'Just now', isResolved: false }];
            
            setComments(updatedComments);
            localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));

            const { data: p, error: fError } = await supabase
                .from('projects')
                .select('doc_statuses, doc_uploads, doc_history')
                .eq('id', id)
                .single();

            if (fError) throw fError;

            const history = p.doc_history || {};
            const docVersionList = history[docCode] || [];
            if (pdfUrl) {
                const versionNum = docVersionList.length + 1;
                docVersionList.push({
                    url: pdfUrl,
                    paths: paths,
                    textAnnotations: textAnnotations,
                    comments: updatedComments,
                    uploaded_at: new Date().toISOString(),
                    version_name: `Revision ${versionNum} (Annotated)`
                });
            }

            const newStatuses = { ...(p.doc_statuses || {}), [docCode as string]: 'Returned' };
            const newHistory = { ...history, [docCode]: docVersionList };

            const { error: uError } = await supabase
                .from('projects')
                .update({ doc_statuses: newStatuses, doc_history: newHistory })
                .eq('id', id);

            if (uError) throw uError;

            await supabase.from('tasks').update({ status: 'Returned' }).eq('project_id', id).eq('task_type', 'DOC_COMPLIANCE').eq('doc_code', docCode);

            alert("Document Returned to Compiler with Corrections.");
            setTimeout(() => router.push(`/dashboard/rbp/${id}`), 1000);
        } catch (err) {
            console.error("Failed to return doc", err);
            alert("Return operation failed.");
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);

    const handleSaveAnnotations = () => {
        localStorage.setItem(`pds_annotations_${id}_${docCode}`, JSON.stringify(paths));
        localStorage.setItem(`pds_text_annotations_${id}_${docCode}`, JSON.stringify(textAnnotations));
        alert("Annotations successfully saved.");
    };

    // Drawing Handlers
    const startDrawing = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement> | React.PointerEvent<HTMLDivElement> | any, type?: string, index?: number) => {
        const svgElement = document.getElementById('pdf-reviewer-svg-overlay') || (e.currentTarget as Element);
        const rect = svgElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        if (activeTool === 'select' && type === 'text' && index !== undefined) {
            saveHistoryState();
            setDraggingText({ index, startX: x - textAnnotations[index].x, startY: y - textAnnotations[index].y });
            return;
        }

        if (activeTool === 'text' || activeTool === 'sticky') return;

        if (['draw', 'highlight', 'circle', 'square', 'eraser'].includes(activeTool)) {
            setIsDrawing(true);
            setCurrentPath({
                tool: activeTool,
                points: [{ x, y }],
                color: strokeColor,
                width: activeTool === 'highlight' || activeTool === 'eraser' ? 20 : strokeWidth
            });
        }
    };

    const draw = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement> | any) => {
        const svgElement = document.getElementById('pdf-reviewer-svg-overlay') || (e.currentTarget as Element);
        const rect = svgElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        if (draggingText !== null) {
            const updated = [...textAnnotations];
            updated[draggingText.index] = {
                ...updated[draggingText.index],
                x: x - draggingText.startX,
                y: y - draggingText.startY
            };
            setTextAnnotations(updated);
            return;
        }

        if (!isDrawing || !currentPath) return;

        if (activeTool === 'circle' || activeTool === 'square') {
            setCurrentPath({ ...currentPath, points: [currentPath.points[0], { x, y }] });
        } else {
            setCurrentPath({ ...currentPath, points: [...currentPath.points, { x, y }] });
        }
    };

    const endDrawing = () => {
        setDraggingText(null);
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath) {
            saveHistoryState();
            setPaths([...paths, currentPath]);
            setCurrentPath(null);
        }
    };

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement> | any) => {
        const svgElement = document.getElementById('pdf-reviewer-svg-overlay') || (e.currentTarget as Element);
        const rect = svgElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        if (activeTool === 'text') {
            setShowTextInput({ x, y });
            setTextInputValue('');
        } else if (activeTool === 'sticky') {
            saveHistoryState();
            setPaths([...paths, { tool: 'sticky', x, y, color: '#f59e0b', points: [{ x, y }] }]);
        }
    };

    const submitTextAnnotation = () => {
        if (!showTextInput || !textInputValue.trim()) {
            setShowTextInput(null);
            return;
        }
        saveHistoryState();
        setTextAnnotations([...textAnnotations, { 
            x: showTextInput.x, 
            y: showTextInput.y, 
            text: textInputValue.trim(),
            fontSize: textFontSize,
            fontWeight: textFontWeight,
            fontStyle: textFontStyle,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: strokeColor
        }]);
        setShowTextInput(null);
        setTextInputValue('');
    };

    const addComment = () => {
        if (!newComment.trim()) return;
        const userName = currentUser?.name || 'Unknown';
        const userRole = currentUser?.role || 'User';
        const now = new Date();
        const timeStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const updatedComments = [...comments, { id: Date.now(), user: userName, role: userRole, text: newComment, time: timeStr, isResolved: false }];
        setComments(updatedComments);
        localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
        setNewComment('');
    };

    const resolveComment = (commentId: number) => {
        const updatedComments = comments.map(c => c.id === commentId ? { ...c, isResolved: !c.isResolved } : c);
        setComments(updatedComments);
        localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
    };

    const isMember = ['Unit Member', 'Regular Member', 'Planning Engineer'].includes(currentUser?.role || '');
    const canReview = ['Section Chief', 'Unit Head', 'Planning Unit Head'].includes(currentUser?.role || '');

    const COLORS = ['#ef4444', '#1a56db', '#10b981', '#f59e0b', '#8b5cf6'];

    const handleToolBtnClick = (toolName: string) => {
        if (activeTool === toolName) {
            setShowSettingsOptions(showSettingsOptions === toolName ? null : toolName);
        } else {
            setActiveTool(toolName);
            setShowSettingsOptions(null);
        }
    };

    if (authLoading || !currentUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <p className="font-black text-slate-400 animate-pulse uppercase tracking-[0.3em] text-[10px]">Verifying Access...</p>
                </div>
            </div>
        );
    }

    // By placing the wrapper conditionally fixed, we break it out of the dashboard layout limitations.
    const wrapperClasses = isFullscreen || isCompareReady
        ? "fixed inset-0 z-[9999] bg-[#e2e8f0] flex flex-col overflow-hidden w-[100vw] h-[100vh]"
        : "flex flex-col overflow-hidden bg-white relative";
        
    const wrapperStyle = isFullscreen || isCompareReady 
        ? {} 
        : { 
            height: 'calc(100vh - 80px)', 
            marginLeft: layoutOffset.offset, 
            marginRight: layoutOffset.offset, 
            marginTop: '-1.5rem', 
            paddingBottom: '2.5rem',
            maxWidth: '100vw'
        };

    const content = (
        <div className={wrapperClasses} style={wrapperStyle}>
            {/* ─── Global Header ─── */}
            {!isFullscreen && (
                <header className={`h-14 px-5 flex items-center justify-between border-b ${isCompareReady ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} z-50 shrink-0 shadow-sm`}>
                <div className="flex items-center space-x-3">
                    <Link
                        href={`/dashboard/rbp/${id}`}
                        className={`p-1.5 rounded-lg transition-all ${isCompareReady ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className={`text-base font-bold leading-tight ${isCompareReady ? 'text-white' : 'text-gray-900'}`}>{docName}</h1>
                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${isCompareReady ? 'text-slate-400' : 'text-gray-400'}`}>
                            Project {String(id).substring(0, 8).toUpperCase()} • {docCode}
                        </p>
                    </div>
                </div>

                {/* Center Badge if Compare Mode is active */}
                {isCompareReady && (
                    <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center space-x-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Compare Mode</span>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    {/* Compare toggle */}
                    {!isCompareReady && (
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
                            <button
                                onClick={() => setShowComparison(true)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all text-gray-600 hover:bg-gray-100`}
                            >
                                <GitCompareArrows className="w-3.5 h-3.5" />
                                <span>Compare</span>
                            </button>
                        </div>
                    )}
                    
                    {/* If Compare Mode is active, show Exit button */}
                    {isCompareReady && (
                        <button
                            onClick={() => setShowComparison(false)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Exit Compare</span>
                        </button>
                    )}

                    {!isCompareReady && (
                        <button 
                            onClick={() => setShowHistoryModal(true)}
                            className="flex items-center space-x-1.5 px-3 py-2 text-[11px] font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all bg-white"
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                        </button>
                    )}
                </div>
            </header>
            )}

            {/* ─── Main Layout ─── */}
            <main className={`flex flex-col lg:flex-row flex-1 ${isFullscreen ? 'h-full overflow-hidden' : 'p-4 gap-4 max-w-[1800px] mx-auto w-full'} ${!isFullscreen ? layoutOffset.offset : ''}`}>

                {/* ── 1. LEFT PANEL: Previous Version ── */}
                {isCompareReady && (
                    <aside
                        className="flex flex-col border-b lg:border-r lg:border-b-0 border-slate-800 bg-[#2C3E50] w-full lg:flex-1 min-w-0 min-h-0"
                    >
                        {/* Panel header */}
                        <div className="h-10 px-4 flex items-center justify-between bg-black/20 border-b border-white/5 shrink-0">
                            <div className="flex items-center space-x-3">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em]">
                                    PREVIOUS VERSION
                                </span>
                                {/* Version Selector inside the header */}
                                <div className="flex items-center pl-3 border-l border-white/10">
                                    <select
                                        className="text-[11px] font-bold bg-transparent border-none outline-none text-slate-300 cursor-pointer pr-1"
                                        value={selectedPrevVersion}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedPrevVersion(val);
                                            const version = val === 'latest'
                                                ? docVersions[docVersions.length - 1]
                                                : docVersions.find(v => v.url === val);
                                            if (version) {
                                                setPreviousPdfUrl(version.url);
                                                setPrevPaths(version.paths || []);
                                                setPrevTextAnnotations(version.textAnnotations || []);
                                            }
                                        }}
                                    >
                                        <option value="latest">Latest Revision</option>
                                        {docVersions.slice(0, -1).reverse().map((v: any, i: number) => (
                                            <option key={i} value={v.url} className="text-black">{v.version_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Zoom controls for Left PDF */}
                            <div className="flex items-center bg-black/30 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setPrevZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)))}
                                    className="p-1 px-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] font-black text-slate-300 min-w-[36px] text-center select-none">
                                    {Math.round(prevZoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setPrevZoom(z => Math.min(2.0, +(z + 0.1).toFixed(2)))}
                                    className="p-1 px-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable PDF area — both axes */}
                        <div
                            className="flex-1 overflow-auto p-4 custom-scrollbar-dark relative"
                            style={{ overflowX: 'auto', overflowY: 'auto' }}
                        >
                            <div className="flex flex-col items-center justify-start min-w-max min-h-full">
                                {previousPdfUrl ? (
                                    <PdfRenderer
                                        pdfUrl={previousPdfUrl}
                                        numPages={prevNumPages}
                                        onLoadSuccess={({ numPages }: { numPages: number }) => setPrevNumPages(numPages)}
                                        paths={prevPaths}
                                        textAnnotations={prevTextAnnotations}
                                        width={Math.round(800 * prevZoom)}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center w-[350px] h-[500px] opacity-30 mt-20">
                                        <History className="w-10 h-10 mb-2 text-slate-300" />
                                        <p className="text-xs font-bold text-slate-300">No previous version found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom strip */}
                        <div className="h-8 px-4 flex items-center justify-between bg-black/20 border-t border-white/5 shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">READ ONLY</span>
                            <span className="text-[9px] font-bold text-slate-400">Page 1 of {prevNumPages || 0}</span>
                        </div>
                    </aside>
                )}

                {/* ── 2. CENTER PANEL: Current Version + Annotation Tools ── */}
                <section
                    className={`flex flex-col relative overflow-hidden flex-1 min-w-0 min-h-0 ${isCompareReady ? 'lg:border-r border-slate-800' : ''} ${!isFullscreen && !isCompareReady ? 'bg-white rounded-2xl shadow-sm border border-slate-200' : ''}`}
                    style={{ background: isCompareReady ? '#243342' : (isFullscreen ? '#2C3E50' : '') }}
                >
                    {isCompareReady && (
                        <div className="h-10 px-4 flex items-center justify-between bg-blue-600/10 border-b border-blue-500/20 shrink-0 absolute top-0 w-full z-40">
                             <div className="flex items-center space-x-3">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">
                                    CURRENT VERSION
                                </span>
                             </div>
                        </div>
                    )}

                    {/* Floating Toolbar — GoodNotes style pill */}
                    <div className={`absolute left-1/2 -translate-x-1/2 z-[60] ${isCompareReady ? (isFullscreen ? 'top-20 mt-2' : 'top-16') : (isFullscreen ? 'top-12' : 'top-5')}`}>
                        <div
                            className="flex items-center px-1.5 py-1.5 rounded-2xl border border-white/10"
                            style={{
                                background: 'rgba(255,255,255,0.95)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset'
                            }}
                        >
                            {/* Select */}
                            <ToolBtn
                                active={activeTool === 'select'}
                                onClick={() => handleToolBtnClick('select')}
                                activeClass="bg-blue-600 text-white"
                                disabled={isMember}
                                title="Select"
                            >
                                <MousePointer2 className="w-4 h-4" />
                            </ToolBtn>

                            <Divider />

                            {/* Drawing tools */}
                            <ToolBtn active={activeTool === 'highlight'} onClick={() => handleToolBtnClick('highlight')} activeClass="bg-yellow-400 text-amber-900" disabled={isMember} title="Highlight">
                                <Highlighter className="w-4 h-4" />
                            </ToolBtn>
                            <ToolBtn active={activeTool === 'draw'} onClick={() => handleToolBtnClick('draw')} activeClass="bg-blue-600 text-white" disabled={isMember} title="Pen / Draw">
                                <PenLine className="w-4 h-4" />
                            </ToolBtn>
                            <ToolBtn active={activeTool === 'circle'} onClick={() => handleToolBtnClick('circle')} activeClass="bg-blue-600 text-white" disabled={isMember} title="Circle">
                                <Circle className="w-4 h-4" />
                            </ToolBtn>
                            <ToolBtn active={activeTool === 'square'} onClick={() => handleToolBtnClick('square')} activeClass="bg-blue-600 text-white" disabled={isMember} title="Rectangle">
                                <Square className="w-4 h-4" />
                            </ToolBtn>
                            <ToolBtn active={activeTool === 'eraser'} onClick={() => handleToolBtnClick('eraser')} activeClass="bg-red-500 text-white" disabled={isMember} title="Eraser">
                                <Eraser className="w-4 h-4" />
                            </ToolBtn>
                            <ToolBtn active={activeTool === 'text'} onClick={() => handleToolBtnClick('text')} activeClass="bg-blue-600 text-white" disabled={isMember} title="Text Label">
                                <Type className="w-4 h-4" />
                            </ToolBtn>
                            <ToolBtn active={activeTool === 'sticky'} onClick={() => handleToolBtnClick('sticky')} activeClass="bg-amber-500 text-white" disabled={isMember} title="Sticky Note">
                                <StickyNote className="w-4 h-4" />
                            </ToolBtn>

                            {/* Toolbar Settings Popovers */}
                            {showSettingsOptions && ['highlight', 'draw', 'eraser'].includes(showSettingsOptions) && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-xl shadow-xl border border-gray-200 p-3 flex space-x-2 items-center z-50">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Thickness</span>
                                    {[2, 4, 8, 16].map(sz => (
                                        <button
                                            key={sz}
                                            onClick={() => setStrokeWidth(showSettingsOptions === 'highlight' || showSettingsOptions === 'eraser' ? sz * 2.5 : sz)}
                                            className="w-8 h-8 rounded hover:bg-gray-100 transition-colors flex items-center justify-center"
                                        >
                                            <div className="bg-slate-700 rounded-full" style={{ width: sz, height: sz }}></div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showSettingsOptions === 'text' && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-xl shadow-xl border border-gray-200 p-2 flex space-x-2 items-center z-50">
                                    <select value={textFontSize} onChange={e => setTextFontSize(Number(e.target.value))} className="text-sm border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                                        <option value={12}>12px</option>
                                        <option value={15}>15px</option>
                                        <option value={18}>18px</option>
                                        <option value={24}>24px</option>
                                        <option value={32}>32px</option>
                                        <option value={48}>48px</option>
                                    </select>
                                    <button onClick={() => setTextFontWeight(w => w==='bold' ? 'normal' : 'bold')} className={`p-1.5 rounded transition-colors ${textFontWeight==='bold' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-100'} font-serif font-bold`}>B</button>
                                    <button onClick={() => setTextFontStyle(s => s==='italic' ? 'normal' : 'italic')} className={`p-1.5 rounded transition-colors ${textFontStyle==='italic' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-100'} font-serif italic`} style={{ width: '28px' }}>I</button>
                                </div>
                            )}

                            <Divider />

                            {/* Undo tool */}
                            <button
                                onClick={handleUndo}
                                disabled={historyStates.length === 0}
                                className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-colors mx-0.5"
                                title="Undo"
                            >
                                <Undo2 className="w-4 h-4" />
                            </button>

                            <Divider />

                            {/* Zoom */}
                            <div className="flex items-center mx-0.5 bg-gray-100 rounded-xl px-0.5">
                                <button onClick={zoomOut} disabled={zoom <= 0.5} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] font-black text-gray-700 min-w-[36px] text-center select-none">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button onClick={zoomIn} disabled={zoom >= 2.5} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <Divider />

                            {/* Color palette */}
                            <div className="flex items-center space-x-1.5 px-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setStrokeColor(c)}
                                        className="w-5 h-5 rounded-full border-2 transition-all hover:scale-125 focus:outline-none"
                                        style={{
                                            backgroundColor: c,
                                            borderColor: strokeColor === c ? c : 'white',
                                            boxShadow: strokeColor === c ? `0 0 0 2px ${c}55` : 'none'
                                        }}
                                    />
                                ))}
                            </div>

                            <Divider />

                            {/* Fullscreen toggle */}
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className={`p-2 rounded-xl transition-colors mx-0.5 ${isFullscreen ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* PDF Canvas — scrollable both directions */}
                    <div
                        className={`flex-1 overflow-auto custom-scrollbar-dark relative ${isCompareReady ? 'pt-24 pb-8 px-4' : 'pt-24 pb-16 px-10'}`}
                        style={{ overflowX: 'auto', overflowY: 'auto' }}
                    >
                        <div className="flex justify-center min-w-max min-h-full">
                            <div className="relative">
                                {pdfUrl ? (
                                    <PdfReviewer
                                        pdfUrl={pdfUrl}
                                        numPages={numPages}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        paths={paths}
                                        currentPath={currentPath}
                                        textAnnotations={textAnnotations}
                                        activeTool={activeTool}
                                        zoom={zoom}
                                        onPointerDown={startDrawing}
                                        onPointerMove={draw}
                                        onPointerUp={endDrawing}
                                        onSvgClick={handleSvgClick}
                                    />
                                ) : (
                                    <div
                                        className="bg-white flex flex-col items-center justify-center text-gray-300"
                                        style={{ width: 800, height: 1100, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
                                    >
                                        <Download className="w-14 h-14 mb-4 animate-bounce" />
                                        <p className="text-lg font-bold">No Document Loaded</p>
                                    </div>
                                )}

                                {/* GoodNotes-style floating text input */}
                                {showTextInput && (
                                    <div
                                        className="absolute z-[60] flex items-center bg-white border-2 border-blue-500 rounded-xl shadow-2xl p-1"
                                        style={{
                                            left: (showTextInput.x) * zoom,
                                            top: (showTextInput.y) * zoom,
                                        }}
                                    >
                                        <input
                                            ref={textInputRef}
                                            type="text"
                                            value={textInputValue}
                                            onChange={e => setTextInputValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') submitTextAnnotation();
                                                if (e.key === 'Escape') setShowTextInput(null);
                                            }}
                                            placeholder="Type annotation..."
                                            className="w-full px-3 py-1.5 text-sm outline-none text-gray-800 font-medium bg-transparent"
                                            autoFocus
                                        />
                                        <button onClick={submitTextAnnotation} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setShowTextInput(null)} className="p-1.5 ml-0.5 text-gray-400 hover:text-red-500">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status bar */}
                    <div
                        className="h-8 px-4 flex items-center justify-between border-t border-white/5 shrink-0"
                        style={{ background: 'rgba(0,0,0,0.15)' }}
                    >
                        <div className="flex items-center space-x-5 text-[9px] font-black uppercase tracking-widest text-white/50">
                            <span>Page 1 of {numPages || '—'}</span>
                            <span className="text-blue-300">EDITABLE</span>
                        </div>
                    </div>
                </section>

                {/* ── 3. RIGHT PANEL: Actions & Comments ── */}
                {!isFullscreen && (
                    <aside
                        className={`flex flex-col border-t lg:border-t-0 lg:border-l border-gray-100 bg-white shrink-0 overflow-hidden ${isCompareReady ? 'shadow-2xl z-50' : ''}`}
                        style={{
                            width: isCompareReady ? (typeof window !== 'undefined' && window.innerWidth <= 1024 ? '100%' : 320) : undefined,
                            flexBasis: typeof window !== 'undefined' && window.innerWidth <= 1024 ? '40%' : 'auto'
                        }}
                    >
                        <div className="w-full lg:w-[380px] flex flex-col h-full bg-white ml-auto relative" style={isCompareReady ? { width: '100%' } : {}}>
                        {/* Action buttons */}
                        <div className="p-4 space-y-2.5 border-b border-gray-100 bg-gray-50/60 shrink-0">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleSaveAnnotations}
                                    className="flex items-center justify-center py-2.5 px-2 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    <Save className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                    <span className="truncate">Save Ann.</span>
                                </button>
                                <label className="flex items-center justify-center py-2.5 px-2 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
                                    <Download className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                    <span className="truncate">Upload PDF</span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setPdfUrl(URL.createObjectURL(file));
                                        }}
                                    />
                                </label>
                            </div>

                            {canReview && (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        className="w-full flex items-center justify-center py-3 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-xl transition-all active:scale-[0.98]"
                                        style={{ boxShadow: '0 4px 14px rgba(26,86,219,0.35)' }}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={handleReturn}
                                        className="w-full flex items-center justify-center py-3 bg-white border-2 border-orange-200 text-orange-600 text-[12px] font-bold rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all active:scale-[0.98]"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Return with Corrections
                                    </button>
                                </>
                            )}

                            {!canReview && (
                                <div className="py-2 px-3 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">Review Mode Only</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">Review remarks from your supervisor below.</p>
                                </div>
                            )}
                        </div>

                        {/* Comments feed */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 shrink-0">
                                <h3 className="font-bold text-[12px] flex items-center text-gray-800">
                                    <MessageSquare className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                    Remarks
                                </h3>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                                    {comments.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
                                {comments.map(c => (
                                    <div key={c.id} className="relative">
                                        {/* Active indicator bar */}
                                        {!c.isResolved && (
                                            <div
                                                className="absolute -left-5 top-0 w-1 h-full rounded-r-full"
                                                style={{ background: '#1a56db', boxShadow: '0 0 8px rgba(26,86,219,0.4)' }}
                                            />
                                        )}
                                        <div className={`transition-all ${c.isResolved ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="text-[12px] font-bold text-gray-900">{c.user}</span>
                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wider truncate max-w-[100px]" title={c.role}>
                                                    {c.role}
                                                </span>
                                            </div>
                                            <p className="text-[12px] text-gray-600 leading-relaxed mb-2">{c.text}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-400">{c.time}</span>
                                                {c.isResolved ? (
                                                    <button
                                                        onClick={() => resolveComment(c.id)}
                                                        className="flex items-center space-x-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        <span>RESOLVED</span>
                                                    </button>
                                                ) : (
                                                    canReview && (
                                                        <button
                                                            onClick={() => resolveComment(c.id)}
                                                            className="text-[9px] font-black text-blue-600 hover:underline uppercase"
                                                        >
                                                            Resolve
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Comment input */}
                            <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all">
                                    <textarea
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder={canReview ? "Add a remark..." : "Reply to a remark..."}
                                        className="w-full px-4 py-3 text-[12px] outline-none bg-transparent resize-none text-gray-700 font-medium"
                                        style={{ height: 70 }}
                                    />
                                    <div className="flex justify-end px-3 py-2 border-t border-gray-50 bg-gray-50/50">
                                        <button
                                            onClick={addComment}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                                        >
                                            Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </aside>
                )}
            </main>

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-[500px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-gray-900">Version History</h3>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {docVersions.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">
                                    <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No history found for this document.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                    {docVersions.map((v, idx) => (
                                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                <span className="text-[10px] font-bold">{idx + 1}</span>
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4 rounded bg-white shadow-sm border border-slate-100">
                                                <div className="flex items-center justify-between space-x-2 mb-1">
                                                    <div className="font-bold text-slate-800 text-xs">{v.version_name || `Version ${idx + 1}`}</div>
                                                    <div className="text-[9px] font-black text-slate-400">{new Date(v.uploaded_at).toLocaleDateString()}</div>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium">
                                                    Annotations: {v.paths?.length || 0} • Text: {v.textAnnotations?.length || 0}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Current version */}
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            <span className="text-[10px] font-bold">{docVersions.length + 1}</span>
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4 rounded bg-green-50 shadow-sm border border-green-200">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-green-800 text-xs">Current Document</div>
                                                <div className="text-[9px] font-black text-green-600 bg-green-200 px-1.5 py-0.5 rounded">LATEST</div>
                                            </div>
                                            <div className="text-[10px] text-green-700 font-medium">
                                                Current annotations and changes.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 99px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }

                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

                body.compare-active [class*="layout_mainContent"] {
                    position: static !important;
                    z-index: auto !important;
                    transform: none !important;
                    overflow: visible !important;
                }
                body.compare-active [class*="layout_mainWrapper"] {
                    z-index: 9999 !important;
                }
            `}</style>
        </div>
    );

    if ((isCompareReady || isFullscreen) && typeof document !== 'undefined') {
        return createPortal(content, document.body);
    }

    return content;
}

/* ── Tiny helpers ── */
function ToolBtn({
    children, active, onClick, activeClass, disabled, title
}: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    activeClass: string;
    disabled?: boolean;
    title?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded-xl transition-all ${active ? activeClass + ' shadow-md' : disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />;
}
