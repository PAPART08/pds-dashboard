"use client";

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfRendererProps {
    pdfUrl: string;
    numPages: number | null;
    onLoadSuccess: (data: { numPages: number }) => void;
    paths?: any[];
    textAnnotations?: { x: number, y: number, text: string, fontSize?: number, fontFamily?: string, fontWeight?: string, fontStyle?: string, color?: string }[];
    width?: number;
}

export default function PdfRenderer({
    pdfUrl,
    numPages,
    onLoadSuccess,
    paths = [],
    textAnnotations = [],
    width = 800
}: PdfRendererProps) {
    const [loadError, setLoadError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [svgHeight, setSvgHeight] = useState(1131);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const update = () => {
            const el = svgRef.current;
            if (!el) return;
            const ph = el.clientHeight;
            const pw = el.clientWidth;
            if (ph > 0 && pw > 0) setSvgHeight(ph * (800 / pw));
        };
        const obs = new ResizeObserver(update);
        obs.observe(svgRef.current);
        update();
        return () => obs.disconnect();
    }, [numPages, pdfUrl, width]);

    if (loadError) {
        return (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-amber-700 text-xs font-bold">Document unavailable</p>
            </div>
        );
    }

    const renderAnnotation = (p: any, i: number) => {
        const color = p.color ?? (p.tool === 'highlight' ? '#fde047' : '#ef4444');
        const lw    = p.width ?? (p.tool === 'highlight' ? 20 : 3);

        if (p.tool === 'sticky') {
            const sx = p.x ?? p.points?.[0]?.x ?? 0;
            const sy = p.y ?? p.points?.[0]?.y ?? 0;
            return (
                <g key={i} transform={`translate(${sx}, ${sy})`}>
                    <rect x="-14" y="-14" width="28" height="28" rx="5" fill={p.color ?? '#f59e0b'} />
                    <text x="0" y="5" textAnchor="middle" fontSize="14" fill="white" fontWeight="900">!</text>
                </g>
            );
        }

        if (p.tool === 'circle') {
            if (!p.points || p.points.length < 2) return null;
            const s = p.points[0];
            const e = p.points[p.points.length - 1];
            const rx = Math.abs(e.x - s.x) / 2;
            const ry = Math.abs(e.y - s.y) / 2;
            const cx = (s.x + e.x) / 2;
            const cy = (s.y + e.y) / 2;
            return <ellipse key={i} cx={cx} cy={cy} rx={rx || 1} ry={ry || 1} fill="none" stroke={color} strokeWidth={lw} />;
        }

        if (p.tool === 'square') {
            if (!p.points || p.points.length < 2) return null;
            const s = p.points[0];
            const e = p.points[p.points.length - 1];
            return <rect key={i} x={Math.min(s.x, e.x)} y={Math.min(s.y, e.y)} width={Math.abs(e.x - s.x) || 1} height={Math.abs(e.y - s.y) || 1} fill="none" stroke={color} strokeWidth={lw} />;
        }

        if (p.tool === 'eraser') return null;

        return (
            <polyline
                key={i}
                points={(p.points || []).map((pt: any) => `${pt.x},${pt.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={lw}
                opacity={p.tool === 'highlight' ? 0.35 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ mixBlendMode: p.tool === 'highlight' ? 'multiply' : 'normal' }}
            />
        );
    };

    return (
        <div
            id="pdf-renderer-container"
            className="relative bg-white"
            style={{
                width,
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)'
            }}
        >
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                    <div className="h-6 w-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                </div>
            )}

            <Document
                file={pdfUrl}
                onLoadSuccess={(data) => {
                    setIsLoading(false);
                    onLoadSuccess(data);
                }}
                onLoadError={() => {
                    setIsLoading(false);
                    setLoadError(true);
                }}
                className="flex flex-col"
            >
                {Array.from({ length: numPages || 0 }, (_, i) => (
                    <div key={`pg_${i + 1}`} className="relative bg-white border-b border-gray-100 last:border-0">
                        <Page
                            pageNumber={i + 1}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            width={width}
                        />
                    </div>
                ))}
            </Document>

            {/* Read-only annotation overlay */}
            {numPages && numPages > 0 && (
                <svg
                    ref={svgRef}
                    viewBox={`0 0 800 ${svgHeight}`}
                    className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                    preserveAspectRatio="xMinYMin meet"
                >
                    {/* Sequential Masking: Erasers only affect strokes drawn BEFORE them */}
                    {(() => {
                        const blocks: { id: string, paths: { p: any, i: number }[], erasers: { p: any, i: number }[] }[] = [];
                        let currentPaths: { p: any, i: number }[] = [];
                        const allErasers: { p: any, i: number }[] = [];

                        paths.forEach((p, i) => {
                            if (p.tool === 'eraser') {
                                allErasers.push({ p, i });
                                blocks.push({ id: `block_${i}`, paths: currentPaths, erasers: [] });
                                currentPaths = [];
                            } else {
                                currentPaths.push({ p, i });
                            }
                        });
                        blocks.push({ id: 'block_final', paths: currentPaths, erasers: [] });

                        let erasersPassed = 0;
                        blocks.forEach((b, idx) => {
                            b.erasers = allErasers.slice(erasersPassed);
                            if (idx < blocks.length - 1) { erasersPassed++; }
                        });

                        return (
                            <>
                                <defs>
                                    {blocks.map(b => b.erasers.length > 0 ? (
                                        <mask id={`eraser-mask-readonly-${b.id}`} key={`mask-def-${b.id}`}>
                                            <rect width="100%" height="100%" fill="white" />
                                            {b.erasers.map(e => (
                                                <polyline
                                                    key={`erase_${e.i}`}
                                                    points={(e.p.points || []).map((pt: any) => `${pt.x},${pt.y}`).join(' ')}
                                                    fill="none"
                                                    stroke="black"
                                                    strokeWidth={e.p.width || 20}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            ))}
                                        </mask>
                                    ) : null)}
                                </defs>
                                {blocks.map(b => (
                                    <g key={`g-${b.id}`} mask={b.erasers.length > 0 ? `url(#eraser-mask-readonly-${b.id})` : undefined}>
                                        {b.paths.map(x => renderAnnotation(x.p, x.i))}
                                    </g>
                                ))}
                            </>
                        );
                    })()}

                    {/* Text labels as HTML Draggable Textboxes */}
                    {textAnnotations.map((t, i) => (
                        <foreignObject
                            key={`txt_${i}`}
                            x={t.x}
                            y={t.y}
                            width="400"
                            height="400"
                            style={{ pointerEvents: 'none', overflow: 'visible' }}
                        >
                            <div
                                style={{
                                    display: 'inline-block',
                                    padding: '6px 12px',
                                    backgroundColor: 'transparent',
                                    color: t.color || '#1a56db',
                                    fontSize: `${t.fontSize || 15}px`,
                                    fontWeight: t.fontWeight || 'normal',
                                    fontStyle: t.fontStyle || 'normal',
                                    fontFamily: t.fontFamily || 'Inter, system-ui, sans-serif',
                                    borderRadius: '8px',
                                    border: '2px solid transparent',
                                    userSelect: 'none',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxWidth: '380px'
                                }}
                            >
                                {t.text}
                            </div>
                        </foreignObject>
                    ))}
                </svg>
            )}
        </div>
    );
}
