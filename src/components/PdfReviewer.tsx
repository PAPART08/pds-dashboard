"use client";

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface TextAnnotation {
    x: number;
    y: number;
    text: string;
}

interface PdfReviewerProps {
    pdfUrl: string;
    numPages: number | null;
    onLoadSuccess: (data: { numPages: number }) => void;
    paths: any[];
    currentPath?: any;
    textAnnotations?: TextAnnotation[];
    activeTool: string;
    zoom?: number;
    onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseUp: () => void;
    onSvgClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export default function PdfReviewer({
    pdfUrl,
    numPages,
    onLoadSuccess,
    paths,
    currentPath,
    textAnnotations = [],
    activeTool,
    zoom = 1,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onSvgClick
}: PdfReviewerProps) {
    const [loadError, setLoadError] = useState(false);
    const pageWidth = Math.round(800 * zoom);

    if (loadError) {
        return (
            <div className="p-10 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-center">
                <p className="text-red-600 dark:text-red-400 font-bold">Invalid PDF structure or file not found.</p>
                <p className="text-sm text-red-500 mt-2">Please verify the document upload.</p>
            </div>
        );
    }

    const allPaths = currentPath ? [...paths, currentPath] : paths;

    return (
        <div className="relative shadow-2xl" style={{ transition: 'width 0.2s ease' }}>
            <Document
                file={pdfUrl}
                onLoadSuccess={onLoadSuccess}
                onLoadError={() => setLoadError(true)}
                className="flex flex-col gap-4"
            >
                {Array.from({ length: numPages || 0 }, (_, i) => (
                    <div key={`page_${i + 1}`} className="relative bg-white">
                        <Page
                            pageNumber={i + 1}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            width={pageWidth}
                        />
                    </div>
                ))}
            </Document>

            {/* Annotation SVG Overlay */}
            <svg
                className={`absolute inset-0 w-full h-full z-10 ${activeTool === 'select' ? 'pointer-events-none' : activeTool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onClick={onSvgClick}
            >
                {allPaths.map((p, i) => (
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
                {/* Text Annotations */}
                {textAnnotations.map((t, i) => (
                    <text
                        key={`text_${i}`}
                        x={t.x}
                        y={t.y}
                        fill="#1e40af"
                        fontSize="14"
                        fontWeight="bold"
                        fontFamily="Inter, sans-serif"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                        {t.text}
                    </text>
                ))}
            </svg>
        </div>
    );
}
