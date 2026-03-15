"use client";

import { use, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
    ChevronLeft,
    Download,
    ZoomIn,
    ZoomOut,
    Maximize,
    Shrink,
    MessageSquare,
    User,
    Paperclip,
    FileText
} from 'lucide-react';
import { SUPPORTING_DOC_DESCRIPTIONS } from '@/lib/supporting-docs';
import dynamic from 'next/dynamic';

const PdfRenderer = dynamic(() => import('@/components/PdfRenderer'), {
    ssr: false,
    loading: () => <div className="p-10 text-slate-500 font-bold animate-pulse">Initializing PDF Viewer...</div>
});

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadDocument } from '@/lib/storage';

export default function DocumentCorrectionViewer({ params: paramsProp }: { params: any }) {
    // Safely handle params
    const unwrappedParams = paramsProp && typeof paramsProp.then === 'function' ? use(paramsProp) : paramsProp;
    const { id, docCode } = (unwrappedParams || {}) as { id: string, docCode: string };
    
    const router = useRouter();

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [paths, setPaths] = useState<any[]>([]);
    const [comments, setComments] = useState<{ id: number, user: string, role: string, text: string, time: string, isResolved: boolean }[]>([]);
    const [replyText, setReplyText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Zoom & Fullscreen state
    const [zoom, setZoom] = useState(1.0);
    const zoomIn = () => setZoom(z => Math.min(z + 0.25, 2.5));
    const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
    const [pageWidth, setPageWidth] = useState(800);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        if (isFullScreen) {
            document.body.classList.add('compare-active');
        } else {
            document.body.classList.remove('compare-active');
        }
        return () => document.body.classList.remove('compare-active');
    }, [isFullScreen]);

    const { profile, loading: authLoading } = useAuth();

    useEffect(() => {
        setPageWidth(Math.round(800 * zoom));
    }, [zoom]);

    // Sync current user info from profile
    const currentUserName = profile?.name || '';
    const currentUserRole = profile?.position || '';

    useEffect(() => {
        if (!authLoading && !profile) {
            const timer = setTimeout(() => {
                if (!profile) router.push('/login');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [profile, authLoading, router]);

    const handlePostReply = () => {
        if (!replyText.trim()) return;
        const now = new Date();
        const timeStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const reply = {
            id: Date.now(),
            user: currentUserName,
            role: currentUserRole,
            text: replyText,
            time: timeStr,
            isResolved: false
        };
        const updatedComments = [...comments, reply];
        setComments(updatedComments);
        localStorage.setItem(`pds_comments_${id}_${docCode}`, JSON.stringify(updatedComments));
        setReplyText('');
    };

    const handleFinalRevisionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id || !docCode) return;

        setIsUploading(true);
        try {
            // 1. Upload to Supabase Storage
            const { publicUrl } = await uploadDocument(file, id, docCode);

            // 2. Find and update the task status if it exists
            const { data: task } = await supabase
                .from('tasks')
                .select('id')
                .eq('project_id', id)
                .eq('doc_code', docCode)
                .maybeSingle();

            if (task) {
                await supabase
                    .from('tasks')
                    .update({ status: 'Submitted' })
                    .eq('id', task.id);
            }

            // 3. Sync with projects table and track history
            const { data: p, error: fError } = await supabase
                .from('projects')
                .select('doc_statuses, doc_uploads, doc_history')
                .eq('id', id)
                .single();

            if (!fError && p) {
                const currentUrl = p.doc_uploads?.[docCode];
                const history = p.doc_history || {};
                const docVersions = history[docCode] || [];
                
                // If there's an existing file, push it to history
                if (currentUrl) {
                    const versionNum = docVersions.length + 1;
                    docVersions.push({
                        url: currentUrl,
                        uploaded_at: new Date().toISOString(),
                        version_name: `Revision ${versionNum}`
                    });
                }

                const newStatuses = { ...(p.doc_statuses || {}), [docCode]: 'Submitted' };
                const newUploads = { ...(p.doc_uploads || {}), [docCode]: publicUrl };
                const newHistory = { ...history, [docCode]: docVersions };

                await supabase.from('projects').update({
                    doc_statuses: newStatuses,
                    doc_uploads: newUploads,
                    doc_history: newHistory
                }).eq('id', id);

                // When a new document is submitted, clear the previous specific preview cache
                localStorage.removeItem(`pdf_prev_${id}_${docCode}`);
                if (currentUrl) {
                    localStorage.setItem(`pdf_prev_${id}_${docCode}`, currentUrl);
                }
            }

            // Update session storage for immediate preview elsewhere
            sessionStorage.setItem(`pdf_${id}_${docCode}`, publicUrl);
            setPdfUrl(publicUrl);

            alert('Final revision successfully uploaded and submitted.');
            router.push('/dashboard/user-task');
        } catch (err: any) {
            console.error("Error uploading final revision:", err);
            alert(`Upload failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadAnnotated = async () => {
        if (!pdfUrl) return;
        
        setIsDownloading(true);
        try {
            const el = document.getElementById('pdf-renderer-container');
            if (!el) {
                // Fallback to simple download if component not found
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = `${docCode}_Correction.pdf`;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                return;
            }

            const pages = Array.from(el.querySelectorAll('.react-pdf__Page')) as HTMLElement[];
            if (pages.length === 0) throw new Error("No PDF pages found to capture.");

            const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
            
            const pdf = new jsPDF({
                orientation: pages[0].clientWidth > pages[0].clientHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [pages[0].clientWidth, pages[0].clientHeight]
            });

            const mainCtx = canvas.getContext('2d', { willReadFrequently: true });
            if (!mainCtx) throw new Error("Failed to get 2D context");

            const containerRect = el.getBoundingClientRect();

            for (let i = 0; i < pages.length; i++) {
                const pageObj = pages[i];
                if (i > 0) {
                    pdf.addPage([pageObj.clientWidth, pageObj.clientHeight], pageObj.clientWidth > pageObj.clientHeight ? 'landscape' : 'portrait');
                }

                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = pageObj.clientHeight * 2;
                const ctx = pageCanvas.getContext('2d');
                if (!ctx) continue;

                const pageRect = pageObj.getBoundingClientRect();
                const pageTop = (pageRect.top - containerRect.top) * 2;
                
                ctx.putImageData(
                    mainCtx.getImageData(0, pageTop, canvas.width, pageCanvas.height),
                    0, 0
                );

                const imgData = pageCanvas.toDataURL('image/jpeg', 0.85);
                pdf.addImage(imgData, 'JPEG', 0, 0, pageObj.clientWidth, pageObj.clientHeight);
            }

            pdf.save(`${docCode}_Correction_Annotated.pdf`);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to generate PDF with annotations. Downloading raw PDF instead.");
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `${docCode}_Correction.pdf`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            setIsDownloading(false);
        }
    };

    const docName = SUPPORTING_DOC_DESCRIPTIONS[docCode as string] || 'Unknown Document';

    useEffect(() => {
        // Load synced comments
        const savedComments = localStorage.getItem(`pds_comments_${id}_${docCode}`);
        if (savedComments) {
            setComments(JSON.parse(savedComments));
        } else {
            setComments([
                {
                    id: 1,
                    user: 'Engr. Maria Santos',
                    role: 'Unit Head',
                    text: 'Please address the critical issues found in the structural layout of Phase 1:\n- Re-calculate the load distribution for Section A-A.\n- Minimum clearance requirements not met at the main intersection.',
                    time: '10:45 AM',
                    isResolved: false
                }
            ]);
        }

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
        }

        const savedAnnotations = localStorage.getItem(`pds_annotations_${id}_${docCode}`);
        if (savedAnnotations) {
            try {
                setPaths(JSON.parse(savedAnnotations));
            } catch (err) { }
        }
    }, [id, docCode]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // We no longer block the entire page with a spinner here because DashboardLayout 
    // already handles the top-level loading state. This prevents "loading-in-loading" loops.
    // If profile is still null (rare cases), we show the UI with placeholder names.
    
    const wrapperClasses = isFullScreen
        ? "fixed inset-0 z-[9999] bg-[#f5f6f8] dark:bg-[#101622] flex flex-col font-sans"
        : "flex flex-col h-[calc(100vh-80px)] bg-[#f5f6f8] dark:bg-[#101622] -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 -my-6 pt-4 font-sans";

    const content = (
        <div className={wrapperClasses}>

            {/* Top Navigation Bar */}
            <header className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 rounded-t-xl z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/user-task" className="flex items-center justify-center p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>
                <div className="flex-1 px-4">
                    <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Correction Viewer</h2>
                </div>
            </header>

            {/* Document Header Section */}
            <div className="bg-white dark:bg-slate-900 px-6 py-5 shrink-0 shadow-sm z-0">
                <h1 className="text-2xl font-bold leading-tight mb-3 text-slate-900 dark:text-white">{docName}</h1>
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-wide">
                        Needs Revision
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                        ID: {id.substring(0, 8).toUpperCase()}-{docCode}
                    </span>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex flex-1 overflow-hidden min-h-0">

                {/* Document Preview Section */}
                <div className="flex-1 p-4 flex flex-col relative">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-t-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 relative group">

                        {!pdfUrl ? (
                            <div className="text-slate-400 text-center">
                                <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                <p>No Document Found</p>
                            </div>
                        ) : (
                            <div className="absolute inset-0 overflow-auto bg-slate-400 p-8 pt-12 pb-24">
                                <div className="min-h-min mx-auto w-max">
                                    <PdfRenderer
                                        pdfUrl={pdfUrl}
                                        numPages={numPages}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        paths={paths}
                                        width={pageWidth}
                                    />
                                </div>
                            </div>
                        )}

                        {/* PDF Controls Overlay */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-200 flex items-center gap-4 z-20 transition-all hover:scale-105 active:scale-95 group-hover:opacity-100 opacity-100">
                            <button onClick={zoomOut} disabled={zoom <= 0.5} className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                <ZoomOut className="w-5 h-5 text-slate-600" />
                            </button>
                            <span className="text-xs font-bold text-slate-900 min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={zoomIn} disabled={zoom >= 2.5} className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                <ZoomIn className="w-5 h-5 text-slate-600" />
                            </button>
                            <div className="h-4 w-[1px] bg-slate-300"></div>
                            <button onClick={() => setZoom(1.0)} className="px-2 py-1 rounded-full hover:bg-slate-100 transition-colors hidden md:block" title="Reset Zoom">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Reset</span>
                            </button>
                            <div className="h-4 w-[1px] bg-slate-300"></div>
                            <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-1 rounded-full hover:bg-slate-100 transition-colors" title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
                                {isFullScreen ? <Shrink className="w-5 h-5 text-slate-600" /> : <Maximize className="w-5 h-5 text-slate-600" />}
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-xl shrink-0">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{docCode}_Correction.pdf</span>
                            <span className="text-xs text-slate-500">Document containing reviewer annotations.</span>
                        </div>
                        <button 
                            onClick={handleDownloadAnnotated}
                            title="Download PDF with Annotations"
                            disabled={isDownloading}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">
                                {isDownloading ? 'Processing...' : 'Download'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Feedback Sidebar */}
                <section className="w-[400px] p-4 flex flex-col gap-4 overflow-y-auto bg-slate-50 dark:bg-background-dark border-l border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            Reviewer Remarks
                        </h2>
                        <span className="text-xs font-bold text-blue-700 px-2 py-1 bg-blue-100 rounded-full">{comments.length} Comments</span>
                    </div>

                    {comments.map((comment, idx) => (
                        <div key={comment.id} className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 ${idx % 2 === 0 ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-slate-200">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{comment.user}</h4>
                                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{comment.role}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">{comment.time}</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{comment.text}</p>
                                {idx === 1 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg flex items-center gap-2 mt-2">
                                        <Paperclip className="w-4 h-4 text-blue-600" />
                                        <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">Reference_Specs.pdf</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Reply to Remarks */}
                    <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reply to Reviewer</p>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your response to the reviewer..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none h-20"
                        ></textarea>
                        <button
                            onClick={handlePostReply}
                            className="mt-2 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                        >
                            Post Reply
                        </button>
                    </div>

                    <div className="mt-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 text-center mb-3">Done making the requested changes?</p>
                        <label className={`w-full flex justify-center items-center px-4 py-3 rounded-xl text-white text-sm font-bold shadow-md cursor-pointer transition-colors ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}>
                            {isUploading ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Uploading...
                                </>
                            ) : 'Upload Final Revision'}
                            <input 
                                type="file" 
                                accept="application/pdf"
                                className="hidden" 
                                disabled={isUploading}
                                onChange={handleFinalRevisionUpload} 
                            />
                        </label>
                    </div>
                </section>
            </main>
        </div>
    );

    if (isFullScreen && typeof document !== 'undefined') {
        return createPortal(content, document.body);
    }
    
    return content;
}
