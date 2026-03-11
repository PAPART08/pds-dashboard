"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
    Search,
    ZoomIn,
    ZoomOut,
    Download,
    Save,
    Eraser
} from 'lucide-react';
import { SUPPORTING_DOC_DESCRIPTIONS } from '@/lib/supporting-docs';
import dynamic from 'next/dynamic';

const PdfReviewer = dynamic(() => import('@/components/PdfReviewer'), {
    ssr: false,
    loading: () => <div className="p-10 text-slate-500 font-bold animate-pulse">Initializing PDF Reviewer...</div>
});

export default function DocumentReviewPage({ params }: { params: Promise<{ id: string, docCode: string }> }) {
    const { id, docCode } = use(params);
    const router = useRouter();

    const [activeTool, setActiveTool] = useState('select');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [comments, setComments] = useState<{ id: number, user: string, role: string, text: string, time: string, isResolved: boolean }[]>([]);
    const [newComment, setNewComment] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Annotation Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [paths, setPaths] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState<any>(null);

    const docName = SUPPORTING_DOC_DESCRIPTIONS[docCode as string] || 'Unknown Document';

    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
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
            try {
                setPaths(JSON.parse(savedAnnotations));
            } catch (err) {
                console.error("Error loading annotations", err);
            }
        }

        const savedUrlGlobal = localStorage.getItem(`pdf_${id}_${docCode}`);
        const savedUrlSession = sessionStorage.getItem(`pdf_${id}_${docCode}`);

        if (savedUrlGlobal) {
            setPdfUrl(savedUrlGlobal);
        } else if (savedUrlSession) {
            setPdfUrl(savedUrlSession);
        }
    }, [id, docCode]);    const handleApprove = async () => {
        try {
            // First, fetch existing doc_statuses to merge
            const { data: p, error: fError } = await supabase.from('projects').select('doc_statuses').eq('id', id).single();
            if (fError) throw fError;

            const newStatuses = { ...(p.doc_statuses || {}), [docCode as string]: 'Approved' };

            const { error: uError } = await supabase.from('projects').update({
                doc_statuses: newStatuses
            }).eq('id', id);

            if (uError) throw uError;

            alert("Document Approved & Sent to Chief.");
            setComments([...comments, { id: Date.now(), user: 'You', role: 'Reviewer', text: 'Document Approved & Sent to Chief.', time: 'Just now', isResolved: true }]);
            setTimeout(() => router.push(`/dashboard/rbp/${id}`), 1000);
        } catch (err) {
            console.error("Failed to approve doc", err);
            alert("Approval failed to sync with database.");
        }
    };
;    const handleReturn = async () => {
        try {
            // Fetch existing data for merging
            const { data: p, error: fError } = await supabase.from('projects').select('doc_statuses, doc_uploads').eq('id', id).single();
            if (fError) throw fError;

            const newStatuses = { ...(p.doc_statuses || {}), [docCode as string]: 'Returned' };

            const { error: uError } = await supabase.from('projects').update({
                doc_statuses: newStatuses
            }).eq('id', id);

            if (uError) throw uError;

            // Save annotations local to browser for now
            localStorage.setItem(`pds_annotations_${id}_${docCode}`, JSON.stringify(paths));

            alert("Document Returned to Compiler with Corrections.");
            const updatedComments = [...comments, { id: Date.now(), user: 'You', role: 'Reviewer', text: 'Document Returned for Corrections.', time: 'Just now', isResolved: false }];
            setComments(updatedComments);
            localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
            setTimeout(() => router.push(`/dashboard/rbp/${id}`), 1000);
        } catch (err) {
            console.error("Failed to append correction logs", err);
            alert("Return operation failed to sync.");
        }
    };
;

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleSaveAnnotations = () => {
        localStorage.setItem(`pds_annotations_${id}_${docCode}`, JSON.stringify(paths));
        alert("Annotations successfully saved to the document.");
    };

    // Drawing Handlers
    const startDrawing = (e: React.MouseEvent<SVGSVGElement>) => {
        if (activeTool === 'eraser') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Remove paths near the click
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

    const addComment = () => {
        if (!newComment.trim()) return;
        const comment = {
            id: Date.now(),
            user: 'You',
            role: 'Reviewer',
            text: newComment,
            time: 'Just now',
            isResolved: false
        };
        const updatedComments = [...comments, comment];
        setComments(updatedComments);
        localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
        setNewComment('');
    };

    const isMember = currentUser?.role === 'Unit Member' || currentUser?.role === 'Regular Member';
    const canReview = currentUser?.role === 'Section Chief' || currentUser?.role === 'Unit Head';

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
                    <button className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <History className="w-4 h-4" />
                        <span>History</span>
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex flex-1 overflow-hidden mt-4 gap-4 pb-4">

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
                        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
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
                                    activeTool={activeTool}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={endDrawing}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar: Review & Comments */}
                <div className="w-[380px] flex flex-col gap-4">

                    {/* Action Buttons */}
                    {!isMember && (
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

                    {isMember && (
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
                                <div key={c.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
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
                                            <span className="text-green-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Resolved</span>
                                        ) : (
                                            !isMember && <button className="text-[color:var(--dpwh-blue)] hover:underline font-bold">Resolve</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment Input */}
                        {!isMember && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <div className="relative">
                                    <textarea
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Add a remark or reference a drawing section..."
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--dpwh-blue)] bg-white resize-none h-24"
                                    ></textarea>
                                    <div className="absolute right-2 bottom-2">
                                        <button onClick={addComment} className="bg-[color:var(--dpwh-blue)] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-800 transition-colors">Post</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}
