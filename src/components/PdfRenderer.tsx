"use client";

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfRendererProps {
    pdfUrl: string;
    numPages: number | null;
    onLoadSuccess: (data: { numPages: number }) => void;
    paths: any[];
}

export default function PdfRenderer({ pdfUrl, numPages, onLoadSuccess, paths }: PdfRendererProps) {
    return (
        <div className="relative shadow-2xl">
            <Document
                file={pdfUrl}
                onLoadSuccess={onLoadSuccess}
                className="flex flex-col gap-4"
            >
                {Array.from({ length: numPages || 0 }, (_, i) => (
                    <div key={`page_${i + 1}`} className="relative bg-white">
                        <Page
                            pageNumber={i + 1}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            width={800}
                        />
                    </div>
                ))}
            </Document>

            {/* Annotation SVG Overlay (Read-only) */}
            <svg
                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
            >
                {paths.map((p, i) => (
                    <polyline
                        key={i}
                        points={p.points.map((pt: any) => `${pt.x},${pt.y}`).join(' ')}
                        fill="none"
                        stroke={p.tool === 'highlight' ? '#fde047' : '#ef4444'}
                        strokeWidth={p.tool === 'highlight' ? 20 : 3}
                        opacity={p.tool === 'highlight' ? 0.3 : 1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ mixBlendMode: 'multiply' }}
                    />
                ))}
            </svg>
        </div>
    );
}
