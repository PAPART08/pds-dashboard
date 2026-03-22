"use client";

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface TextAnnotation {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
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
    onPointerDown: (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement> | React.PointerEvent<HTMLDivElement>, type?: string, index?: number) => void;
    onPointerMove: (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: () => void;
    onSvgClick?: (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>) => void;
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
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onSvgClick
}: PdfReviewerProps) {
    const [loadError, setLoadError] = useState(false);
    const [svgHeight, setSvgHeight] = useState(1131);
    const [hasPen, setHasPen] = useState(false); // Track if user is using a stylus
    const [touchPanStart, setTouchPanStart] = useState<{ x: number, y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const pageWidth = Math.round(800 * zoom);

    useEffect(() => {
        if (!svgRef.current) return;

        const updateHeight = () => {
            if (svgRef.current) {
                const h = svgRef.current.clientHeight;
                if (h > 0) setSvgHeight(h / zoom);
            }
        };

        const observer = new ResizeObserver(updateHeight);
        observer.observe(svgRef.current);
        updateHeight();
        return () => observer.disconnect();
    }, [zoom, pdfUrl, numPages]);

    if (loadError) {
        return (
            <div className="p-8 bg-red-50 rounded-2xl text-center">
                <p className="text-red-600 font-bold text-sm">Failed to load document.</p>
            </div>
        );
    }

    const allPaths = currentPath ? [...paths, currentPath] : paths;

    const renderAnnotation = (p: any, i: number) => {
        const color  = p.color  ?? (p.tool === 'highlight' ? '#fde047' : '#ef4444');
        const width  = p.width  ?? (p.tool === 'highlight' ? 20 : 3);

        /* Sticky note */
        if (p.tool === 'sticky') {
            const sx = p.x ?? p.points?.[0]?.x ?? 0;
            const sy = p.y ?? p.points?.[0]?.y ?? 0;
            return (
                <g key={i} transform={`translate(${sx}, ${sy})`} style={{ pointerEvents: 'none' }}>
                    <rect x="-14" y="-14" width="28" height="28" rx="5"
                        fill={p.color ?? '#f59e0b'}
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                    />
                    <text x="0" y="5" textAnchor="middle" fontSize="14" fill="white" fontWeight="900">!</text>
                </g>
            );
        }

        /* Circle / Ellipse */
        if (p.tool === 'circle') {
            if (!p.points || p.points.length < 2) return null;
            const s = p.points[0];
            const e = p.points[p.points.length - 1];
            const rx = Math.abs(e.x - s.x) / 2;
            const ry = Math.abs(e.y - s.y) / 2;
            const cx = (s.x + e.x) / 2;
            const cy = (s.y + e.y) / 2;
            return (
                <ellipse key={i} cx={cx} cy={cy} rx={rx || 1} ry={ry || 1}
                    fill="none" stroke={color} strokeWidth={width}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                />
            );
        }

        /* Rectangle */
        if (p.tool === 'square') {
            if (!p.points || p.points.length < 2) return null;
            const s = p.points[0];
            const e = p.points[p.points.length - 1];
            const x = Math.min(s.x, e.x);
            const y = Math.min(s.y, e.y);
            const w = Math.abs(e.x - s.x);
            const h = Math.abs(e.y - s.y);
            return (
                <rect key={i} x={x} y={y} width={w || 1} height={h || 1}
                    fill="none" stroke={color} strokeWidth={width}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                />
            );
        }

        /* Eraser is handled in the mask, do not draw it normally */
        if (p.tool === 'eraser') return null;

        /* Freehand draw / Highlight */
        return (
            <polyline
                key={i}
                points={(p.points || []).map((pt: any) => `${pt.x},${pt.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={width}
                opacity={p.tool === 'highlight' ? 0.38 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                    mixBlendMode: p.tool === 'highlight' ? 'multiply' : 'normal',
                    pointerEvents: 'none'
                }}
            />
        );
    };

    const cursorClass = activeTool === 'select'
        ? 'cursor-default'
        : activeTool === 'text'
            ? 'cursor-text'
            : activeTool === 'sticky'
                ? 'cursor-cell'
                : activeTool === 'eraser'
                    ? 'cursor-crosshair'
                    : 'cursor-crosshair';

    return (
        <div
            className="relative bg-white"
            style={{
                width: pageWidth,
                boxShadow: '0 25px 60px rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.15)'
            }}
        >
            <Document
                file={pdfUrl}
                onLoadSuccess={onLoadSuccess}
                onLoadError={() => setLoadError(true)}
                className="flex flex-col"
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
                ref={svgRef}
                id="pdf-reviewer-svg-overlay"
                viewBox={`0 0 800 ${svgHeight}`}
                className={`absolute inset-0 w-full h-full z-10 ${cursorClass}`}
                onPointerDown={(e) => {
                    if (e.pointerType === 'pen') {
                        setHasPen(true);
                    }
                    // Palm rejection: If touch is detected and tool is not 'select', handle pan manually
                    if (e.pointerType === 'touch' && activeTool !== 'select') {
                        setTouchPanStart({ x: e.clientX, y: e.clientY });
                        return;
                    }
                    const el = e.currentTarget;
                    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
                    onPointerDown(e);
                }}
                onPointerMove={(e) => {
                    if (e.pointerType === 'touch' && activeTool !== 'select') {
                        if (touchPanStart) {
                            const dx = e.clientX - touchPanStart.x;
                            const dy = e.clientY - touchPanStart.y;
                            const container = svgRef.current?.closest('.overflow-auto');
                            if (container) {
                                container.scrollBy({ left: -dx, top: -dy });
                            }
                            setTouchPanStart({ x: e.clientX, y: e.clientY });
                        }
                        return;
                    }
                    onPointerMove(e);
                }}
                onPointerUp={(e) => {
                    if (e.pointerType === 'touch' && activeTool !== 'select') {
                        setTouchPanStart(null);
                        return;
                    }
                    const el = e.currentTarget;
                    if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) {
                        el.releasePointerCapture(e.pointerId);
                    }
                    onPointerUp();
                }}
                onPointerLeave={(e) => {
                    if (e.pointerType === 'touch' && activeTool !== 'select') {
                        setTouchPanStart(null);
                        return;
                    }
                    onPointerUp();
                }}
                onClick={onSvgClick}
                style={{ 
                    touchAction: activeTool === 'select' ? 'auto' : 'none', // ALWAYS none to prevent browser interference & freeze, EXCEPT when navigating in 'select'
                    userSelect: 'none', 
                    WebkitUserSelect: 'none', 
                    WebkitTouchCallout: 'none' 
                }}
            >
                {/* Sequential Masking: Erasers only affect strokes drawn BEFORE them */}
                {(() => {
                    const blocks: { id: string, paths: { p: any, i: number }[], erasers: { p: any, i: number }[] }[] = [];
                    let currentPaths: { p: any, i: number }[] = [];
                    const allErasers: { p: any, i: number }[] = [];

                    allPaths.forEach((p, i) => {
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
                                    <mask id={`eraser-mask-${b.id}`} key={`mask-def-${b.id}`}>
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
                                <g key={`g-${b.id}`} mask={b.erasers.length > 0 ? `url(#eraser-mask-${b.id})` : undefined}>
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
                                border: activeTool === 'select' ? '2px dashed rgba(59, 130, 246, 0.5)' : '2px solid transparent',
                                cursor: activeTool === 'select' ? 'move' : activeTool === 'text' ? 'text' : 'default',
                                pointerEvents: ['draw', 'highlight', 'eraser', 'circle', 'square'].includes(activeTool) ? 'none' : 'auto',
                                userSelect: 'none',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxWidth: '380px'
                            }}
                            onPointerDown={(e) => {
                                if (activeTool === 'select') {
                                    e.stopPropagation();
                                    (onPointerDown as any)(e, 'text', i);
                                }
                            }}
                        >
                            {t.text}
                        </div>
                    </foreignObject>
                ))}
            </svg>
        </div>
    );
}
