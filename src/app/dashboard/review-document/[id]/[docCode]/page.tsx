"use client";

import { use, useState, useEffect, useRef } from 'react';
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
    ZoomIn,
    ZoomOut,
    Download,
    Save,
    Eraser,
    GitCompareArrows,
    Minus,
    Plus
} from 'lucide-react';
import { SUPPORTING_DOC_DESCRIPTIONS } from '@/lib/supporting-docs';
import dynamic from 'next/dynamic';

const PdfReviewer = dynamic(() => import('@/components/PdfReviewer'), {
    ssr: false,
    loading: () => <div className="p-10 text-slate-500 font-bold animate-pulse">Initializing PDF Reviewer...</div>
});

const PdfRenderer = dynamic(() => import('@/components/PdfRenderer'), {
    ssr: false,
    loading: () => <div className="p-10 text-slate-500 font-bold animate-pulse">Loading Previous Version...</div>
});

interface TextAnnotation {
    x: number;
    y: number;
    text: string;
}

export default function DocumentReviewPage({ params: paramsProp }: { params: any }) {
    // Safely handle params (could be a Promise or plain object depending on Next.js version)
    const unwrappedParams = paramsProp && typeof paramsProp.then === 'function' ? use(paramsProp) : paramsProp;
    const { id, docCode } = (unwrappedParams || {}) as { id: string, docCode: string };
    
    const router = useRouter();

    const [activeTool, setActiveTool] = useState('select');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [comments, setComments] = useState<{ id: number, user: string, role: string, text: string, time: string, isResolved: boolean }[]>([]);
    const [newComment, setNewComment] = useState('');
    const { profile, loading: authLoading } = useAuth();
    
    // Initialize currentUser from profile if already available
    const [currentUser, setCurrentUser] = useState<any>(profile ? { name: profile.name, role: profile.position } : null);

    // Zoom state
    const [zoom, setZoom] = useState(1.0);
    const zoomIn = () => setZoom(z => Math.min(z + 0.25, 2.5));
    const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));

    // Comparison state
    const [previousPdfUrl, setPreviousPdfUrl] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState(false);
    const [prevNumPages, setPrevNumPages] = useState<number | null>(null);

    // Text annotation state
    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
    const [showTextInput, setShowTextInput] = useState<{ x: number, y: number } | null>(null);
    const [textInputValue, setTextInputValue] = useState('');
    const textInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!profile) {
                // Short buffer to prevent ghost redirects on very slow initial loads
                const timer = setTimeout(() => {
                    if (!profile) router.push('/login');
                }, 1000);
                return () => clearTimeout(timer);
            }
            setCurrentUser({ name: profile.name, role: profile.position });
        } else if (profile) {
            // If profile is available (even if still loading other auth state), set it
            setCurrentUser({ name: profile.name, role: profile.position });
        }
    }, [profile, authLoading, router]);

    // Annotation Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [paths, setPaths] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState<any>(null);

    const docName = SUPPORTING_DOC_DESCRIPTIONS[docCode as string] || 'Unknown Document';

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
                    text: 'The chainage on page 3 doesn\'t match the RIF declaration. Please verify.',
                    time: 'Oct 14, 2025 • 09:30 AM',
                    isResolved: false
                }
            ]);
        }

        // Load annotations
        const savedAnnotations = localStorage.getItem(`pds_annotations_${id}_${docCode}`);
        if (savedAnnotations) {
            try { setPaths(JSON.parse(savedAnnotations)); } catch (err) { }
        }

        // Load text annotations
        const savedTextAnnotations = localStorage.getItem(`pds_text_annotations_${id}_${docCode}`);
        if (savedTextAnnotations) {
            try { setTextAnnotations(JSON.parse(savedTextAnnotations)); } catch (err) { }
        }

        // Load previous PDF URL for comparison
        const prevUrl = localStorage.getItem(`pdf_prev_${id}_${docCode}`);
        if (prevUrl) setPreviousPdfUrl(prevUrl);

        const fetchPdfUrl = async () => {
            const savedUrlGlobal = localStorage.getItem(`pdf_${id}_${docCode}`);
            const savedUrlSession = sessionStorage.getItem(`pdf_${id}_${docCode}`);

            const isValidPdfUrl = (url: string | null) => {
                if (!url) return false;
                return url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:application/pdf');
            };

            if (isValidPdfUrl(savedUrlGlobal)) {
                setPdfUrl(savedUrlGlobal);
            } else if (isValidPdfUrl(savedUrlSession)) {
                setPdfUrl(savedUrlSession);
            } else {
                try {
                    const { data, error } = await supabase
                        .from('projects')
                        .select('doc_uploads')
                        .eq('id', id)
                        .single();

                    if (!error && data?.doc_uploads?.[docCode]) {
                        const dbUrl = data.doc_uploads[docCode];
                        if (isValidPdfUrl(dbUrl)) {
                            setPdfUrl(dbUrl);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching PDF from database:", err);
                }
            }
        };

        fetchPdfUrl();
    }, [id, docCode]);

    // Focus text input when it shows
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

            await supabase.from('tasks')
                .update({ status: 'Approved' })
                .eq('project_id', id)
                .eq('task_type', 'DOC_COMPLIANCE')
                .eq('doc_code', docCode);

            alert("Document Approved & Sent to Chief.");
            const userName = currentUser?.name || 'Reviewer';
            const userRole = currentUser?.role || 'Reviewer';
            setComments([...comments, { id: Date.now(), user: userName, role: userRole, text: 'Document Approved & Sent to Chief.', time: 'Just now', isResolved: true }]);
            setTimeout(() => router.push(`/dashboard/rbp/${id}`), 1000);
        } catch (err) {
            console.error("Failed to approve doc", err);
            alert("Approval failed to sync with database.");
        }
    };

    const handleReturn = async () => {
        try {
            const { data: p, error: fError } = await supabase.from('projects').select('doc_statuses, doc_uploads').eq('id', id).single();
            if (fError) throw fError;
            const newStatuses = { ...(p.doc_statuses || {}), [docCode as string]: 'Returned' };
            const { error: uError } = await supabase.from('projects').update({ doc_statuses: newStatuses }).eq('id', id);
            if (uError) throw uError;

            await supabase.from('tasks')
                .update({ status: 'Returned' })
                .eq('project_id', id)
                .eq('task_type', 'DOC_COMPLIANCE')
                .eq('doc_code', docCode);

            // Save current PDF as "previous" version for future comparison
            if (pdfUrl) {
                localStorage.setItem(`pdf_prev_${id}_${docCode}`, pdfUrl);
            }

            // Save annotations
            localStorage.setItem(`pds_annotations_${id}_${docCode}`, JSON.stringify(paths));
            localStorage.setItem(`pds_text_annotations_${id}_${docCode}`, JSON.stringify(textAnnotations));

            alert("Document Returned to Compiler with Corrections.");
            const userName = currentUser?.name || 'Reviewer';
            const userRole = currentUser?.role || 'Reviewer';
            const updatedComments = [...comments, { id: Date.now(), user: userName, role: userRole, text: 'Document Returned for Corrections.', time: 'Just now', isResolved: false }];
            setComments(updatedComments);
            localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
            setTimeout(() => router.push(`/dashboard/rbp/${id}`), 1000);
        } catch (err) {
            console.error("Failed to append correction logs", err);
            alert("Return operation failed to sync.");
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleSaveAnnotations = () => {
        localStorage.setItem(`pds_annotations_${id}_${docCode}`, JSON.stringify(paths));
        localStorage.setItem(`pds_text_annotations_${id}_${docCode}`, JSON.stringify(textAnnotations));
        alert("Annotations successfully saved to the document.");
    };

    // Drawing Handlers
    const startDrawing = (e: React.MouseEvent<SVGSVGElement>) => {
        if (activeTool === 'text') return; // Text tool uses click handler

        if (activeTool === 'eraser') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setPaths(paths.filter(p => {
                return !p.points.some((pt: any) => Math.sqrt(Math.pow(pt.x - x, 2) + Math.pow(pt.y - y, 2)) < 15);
            }));
            return;
        }

        if (activeTool !== 'draw' && activeTool !== 'highlight') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setCurrentPath({ tool: activeTool, points: [{ x, y }] });
    };

    const draw = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDrawing || !currentPath) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentPath({ ...currentPath, points: [...currentPath.points, { x, y }] });
    };

    const endDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath) {
            setPaths([...paths, currentPath]);
            setCurrentPath(null);
        }
    };

    // Text tool click handler
    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (activeTool !== 'text') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setShowTextInput({ x, y });
        setTextInputValue('');
    };

    const submitTextAnnotation = () => {
        if (!showTextInput || !textInputValue.trim()) {
            setShowTextInput(null);
            return;
        }
        setTextAnnotations([...textAnnotations, { x: showTextInput.x, y: showTextInput.y, text: textInputValue.trim() }]);
        setShowTextInput(null);
        setTextInputValue('');
    };

    const addComment = () => {
        if (!newComment.trim()) return;
        const userName = currentUser?.name || 'Unknown';
        const userRole = currentUser?.role || 'User';
        const now = new Date();
        const timeStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const comment = {
            id: Date.now(),
            user: userName,
            role: userRole,
            text: newComment,
            time: timeStr,
            isResolved: false
        };
        const updatedComments = [...comments, comment];
        setComments(updatedComments);
        localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
        setNewComment('');
    };

    const resolveComment = (commentId: number) => {
        const updatedComments = comments.map(c =>
            c.id === commentId ? { ...c, isResolved: !c.isResolved } : c
        );
        setComments(updatedComments);
        localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
    };

    const isMember = currentUser?.role === 'Unit Member' || currentUser?.role === 'Regular Member' || currentUser?.role === 'Planning Engineer';
    const canReview = currentUser?.role === 'Section Chief' || currentUser?.role === 'Unit Head' || currentUser?.role === 'Planning Unit Head';

    // Show loading state while auth is being validated
    if (loading || !currentUser) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="font-medium text-slate-500 animate-pulse uppercase tracking-[0.2em] text-xs">Verifying Access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 -my-6 pt-4">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                    <Link href={`/dashboard/rbp/${id}`} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-xl font-bold text-gray-800">{docName}</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Project {id.substring(0, 8).toUpperCase()} • {docCode}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Compare Button */}
                    <button
                        disabled={!previousPdfUrl}
                        onClick={() => setShowComparison(!showComparison)}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                            showComparison
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : previousPdfUrl
                                    ? 'text-gray-600 border border-gray-200 hover:bg-gray-100'
                                    : 'text-gray-300 border border-gray-100 cursor-not-allowed'
                        }`}
                        title={previousPdfUrl ? 'Compare with previous submission' : 'No previous version available'}
                    >
                        <GitCompareArrows className="w-4 h-4" />
                        <span>{showComparison ? 'Exit Compare' : 'Compare'}</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <History className="w-4 h-4" />
                        <span>History</span>
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex flex-1 overflow-hidden mt-4 gap-4 pb-4">

                {/* Comparison Panel (Previous Version) */}
                {showComparison && previousPdfUrl && (
                    <div className="w-[400px] flex flex-col bg-orange-50/50 rounded-2xl border border-orange-200 overflow-hidden relative shadow-inner shrink-0">
                        <div className="bg-orange-100 px-4 py-2.5 flex items-center justify-between border-b border-orange-200">
                            <span className="text-xs font-black text-orange-700 uppercase tracking-widest">Previous Version</span>
                            <button onClick={() => setShowComparison(false)} className="p-1 rounded-lg hover:bg-orange-200 transition-colors">
                                <X className="w-4 h-4 text-orange-600" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-300 p-4 flex flex-col items-center">
                            <PdfRenderer
                                pdfUrl={previousPdfUrl}
                                numPages={prevNumPages}
                                onLoadSuccess={({ numPages }: { numPages: number }) => setPrevNumPages(numPages)}
                                paths={[]}
                            />
                        </div>
                    </div>
                )}

                {/* PDF Viewer Area */}
                <div className="flex-1 flex flex-col bg-slate-200/50 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner">

                    {/* Floating Toolbar */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1.5 rounded-full shadow-lg border border-gray-200 flex items-center space-x-1 z-10">
                        <button
                            disabled={isMember}
                            onClick={() => setActiveTool('select')}
                            className={`p-2 rounded-full transition-colors ${activeTool === 'select' ? 'bg-blue-50 text-[color:var(--dpwh-blue)]' : (isMember ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100')}`} title="Select">
                            <MousePointer2 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <button
                            disabled={isMember}
                            onClick={() => setActiveTool('highlight')}
                            className={`p-2 rounded-full transition-colors ${activeTool === 'highlight' ? 'bg-yellow-100 text-yellow-600' : (isMember ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100')}`} title="Highlight">
                            <Highlighter className="w-4 h-4" />
                        </button>
                        <button
                            disabled={isMember}
                            onClick={() => setActiveTool('draw')}
                            className={`p-2 rounded-full transition-colors ${activeTool === 'draw' ? 'bg-blue-50 text-[color:var(--dpwh-blue)]' : (isMember ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100')}`} title="Draw">
                            <PenLine className="w-4 h-4" />
                        </button>
                        <button
                            disabled={isMember}
                            onClick={() => setActiveTool('eraser')}
                            className={`p-2 rounded-full transition-colors ${activeTool === 'eraser' ? 'bg-red-50 text-red-600' : (isMember ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100')}`} title="Eraser">
                            <Eraser className="w-4 h-4" />
                        </button>
                        <button
                            disabled={isMember}
                            onClick={() => setActiveTool('text')}
                            className={`p-2 rounded-full transition-colors ${activeTool === 'text' ? 'bg-blue-50 text-[color:var(--dpwh-blue)]' : (isMember ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100')}`} title="Add Text">
                            <Type className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        {/* Zoom Controls */}
                        <button onClick={zoomOut} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors disabled:text-gray-300 disabled:hover:bg-transparent" disabled={zoom <= 0.5} title="Zoom Out">
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] font-bold text-gray-600 min-w-[40px] text-center select-none">{Math.round(zoom * 100)}%</span>
                        <button onClick={zoomIn} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors disabled:text-gray-300 disabled:hover:bg-transparent" disabled={zoom >= 2.5} title="Zoom In">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Document Display / Upload Area */}
                    <div className="flex-1 overflow-hidden flex justify-center items-start bg-slate-200">
                        {!pdfUrl ? (
                            <div className="w-full max-w-3xl mt-8 mx-8 border-2 border-dashed border-gray-400 bg-white rounded-2xl min-h-[500px] flex flex-col items-center justify-center relative hover:bg-gray-50 transition-colors cursor-pointer group shadow-sm z-0">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setPdfUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                <div className="p-4 bg-blue-50 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <Download className="w-8 h-8 text-[color:var(--dpwh-blue)]" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-700">Upload PDF Document</h3>
                                <p className="text-gray-500 font-medium mt-1">Drag and drop or click to browse</p>
                            </div>
                        ) : (
                            <div className="w-full h-full relative overflow-auto bg-slate-400 p-8 flex flex-col items-center">
                                <PdfReviewer
                                    pdfUrl={pdfUrl}
                                    numPages={numPages}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    paths={paths}
                                    currentPath={currentPath}
                                    textAnnotations={textAnnotations}
                                    activeTool={activeTool}
                                    zoom={zoom}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={endDrawing}
                                    onSvgClick={handleSvgClick}
                                />
                                {/* Floating Text Input */}
                                {showTextInput && (
                                    <div
                                        className="absolute z-30 bg-white border-2 border-blue-500 rounded-lg shadow-xl p-1 flex items-center"
                                        style={{ left: showTextInput.x + 32, top: showTextInput.y + 60 }}
                                    >
                                        <input
                                            ref={textInputRef}
                                            type="text"
                                            value={textInputValue}
                                            onChange={(e) => setTextInputValue(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') submitTextAnnotation(); if (e.key === 'Escape') setShowTextInput(null); }}
                                            placeholder="Type annotation..."
                                            className="px-2 py-1 text-sm border-none outline-none w-48"
                                        />
                                        <button onClick={submitTextAnnotation} className="p-1 bg-blue-600 text-white rounded ml-1 hover:bg-blue-700">
                                            <Check className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setShowTextInput(null)} className="p-1 text-gray-400 hover:text-red-500 ml-1">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar: Review & Comments */}
                <div className="w-[380px] flex flex-col gap-4">

                    {/* Action Buttons */}
                    {canReview && (
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
                            <button onClick={handleSaveAnnotations} className="w-full flex justify-center items-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm shadow-sm active:scale-[0.98]">
                                <Save className="w-4 h-4 mr-2" />
                                Save Tool Annotations
                            </button>
                            <label className="w-full flex justify-center items-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm shadow-sm active:scale-[0.98] cursor-pointer">
                                <Download className="w-4 h-4 mr-2" />
                                Upload Annotated PDF
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setPdfUrl(URL.createObjectURL(file));
                                            alert("Annotated PDF successfully loaded.");
                                        }
                                    }}
                                />
                            </label>
                            <button onClick={handleApprove} className="w-full flex justify-center items-center py-3 bg-[color:var(--dpwh-blue)] hover:bg-blue-800 text-white font-bold rounded-xl transition-colors text-sm shadow-md active:scale-[0.98]">
                                <Check className="w-4 h-4 mr-2" />
                                Approve & Send to Chief
                            </button>
                            <button onClick={handleReturn} className="w-full flex justify-center items-center py-3 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 font-bold rounded-xl transition-colors text-sm shadow-sm active:scale-[0.98]">
                                <X className="w-4 h-4 mr-2" />
                                Return with Corrections
                            </button>
                        </div>
                    )}

                    {!canReview && (
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col gap-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 italic">Review Mode Only</p>
                            <p className="text-xs text-amber-700 font-medium">Please review the remarks from your supervisor below and upload a corrected version if necessary.</p>
                        </div>
                    )}

                    {/* Comments Panel */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col max-h-full overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold flex items-center text-gray-700">
                                <MessageSquare className="w-4 h-4 mr-2 text-[color:var(--dpwh-blue)]" />
                                Annotations & Remarks
                            </h3>
                            <span className="bg-gray-100 text-xs font-bold px-2 py-0.5 rounded-full text-gray-600">{comments.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {comments.map(c => (
                                <div key={c.id} className={`p-3 rounded-xl ${c.isResolved ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-bold text-sm text-gray-800">{c.user}</span>
                                            <span className="ml-2 text-[10px] uppercase font-bold text-gray-400">{c.role}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{c.text}</p>
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                                        <span>{c.time}</span>
                                        {c.isResolved ? (
                                            <button onClick={() => resolveComment(c.id)} className="text-green-600 font-bold flex items-center gap-1 hover:underline"><Check className="w-3 h-3" /> Resolved</button>
                                        ) : (
                                            canReview && <button onClick={() => resolveComment(c.id)} className="text-[color:var(--dpwh-blue)] hover:underline font-bold">Resolve</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment Input */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <div className="relative">
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder={canReview ? "Add a remark or reference a drawing section..." : "Reply to a remark..."}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--dpwh-blue)] bg-white resize-none h-24"
                                ></textarea>
                                <div className="absolute right-2 bottom-2">
                                    <button onClick={addComment} className="bg-[color:var(--dpwh-blue)] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-800 transition-colors">Post</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
