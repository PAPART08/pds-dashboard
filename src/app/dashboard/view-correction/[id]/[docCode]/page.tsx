"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    Download,
    ZoomIn,
    ZoomOut,
    Maximize,
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

export default function DocumentCorrectionViewer({ params }: { params: Promise<{ id: string, docCode: string }> }) {
    const { id, docCode } = use(params);
    const router = useRouter();

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [paths, setPaths] = useState<any[]>([]);
    const [comments, setComments] = useState<{ id: number, user: string, role: string, text: string, time: string, isResolved: boolean }[]>([]);

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

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#f5f6f8] dark:bg-[#101622] -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 -my-6 pt-4 font-sans">

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
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-t-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 relative flex justify-center items-center group">

                        {!pdfUrl ? (
                            <div className="text-slate-400 text-center">
                                <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                <p>No Document Found</p>
                            </div>
                        ) : (
                            <div className="w-full h-full relative overflow-auto bg-slate-400 p-8 flex flex-col items-center">
                                <PdfRenderer
                                    pdfUrl={pdfUrl}
                                    numPages={numPages}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    paths={paths}
                                />
                            </div>
                        )}

                        {/* PDF Controls Overlay */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-200 flex items-center gap-4 z-20 transition-opacity opacity-0 group-hover:opacity-100">
                            <ZoomOut className="w-5 h-5 text-slate-600 cursor-pointer hover:text-blue-600" />
                            <span className="text-xs font-bold text-slate-900">100%</span>
                            <ZoomIn className="w-5 h-5 text-slate-600 cursor-pointer hover:text-blue-600" />
                            <div className="h-4 w-[1px] bg-slate-300"></div>
                            <Maximize className="w-5 h-5 text-slate-600 cursor-pointer hover:text-blue-600" />
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-xl shrink-0">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{docCode}_Correction_No.1.pdf</span>
                            <span className="text-xs text-slate-500">Last updated: Recently</span>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors">
                            <Download className="w-5 h-5" />
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

                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 text-center mb-3">Done making the requested changes?</p>
                        <label className="w-full flex justify-center items-center px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-colors">
                            Upload Final Revision
                            <input type="file" className="hidden" onChange={() => {
                                alert('Revised document successfully uploaded.');
                                router.push('/dashboard/user-task');
                            }} />
                        </label>
                    </div>
                </section>
            </main>
        </div>
    );
}
