// src/components/orbat/OrbatPreviewOverlay.tsx
"use client";

import * as React from "react";
import OrbatBoard from "@/components/orbat/OrbatBoard";
import OrbatExportPngButton from "@/components/orbat/OrbatExportPngButton";
import type { OrbatNode, ParentByNodeId, ChildrenOrder } from "@/lib/orbat/types";
import OrbatExportSvgButton from "./OrbatExportSvgButton";

type Props = {
    open: boolean;
    onClose: () => void;

    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder: ChildrenOrder;

    bg?: string;
    stroke?: string;
    shape?: string;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export default function OrbatPreviewOverlay({
    open,
    onClose,
    nodes,
    parentById,
    childrenOrder,
    bg,
    stroke,
    shape,
}: Props) {
    const viewportRef = React.useRef<HTMLDivElement>(null);

    // wrapper NON transformé (on mesure ici)
    const measureRef = React.useRef<HTMLDivElement>(null);

    // contenu réel (export png)
    const exportRef = React.useRef<HTMLDivElement>(null);

    const [fitScale, setFitScale] = React.useState(1);
    const [userZoom, setUserZoom] = React.useState(1);

    const effectiveScale = clamp(fitScale * userZoom, 0.05, 6);

    React.useEffect(() => {
        if (!open) return;

        const compute = () => {
            const vp = viewportRef.current;
            const meas = measureRef.current;
            if (!vp || !meas) return;

            // Pad basé sur la taille réelle du viewport, pas window
            const pad = vp.clientWidth < 640 ? 8 : 16;
            const cw = Math.max(1, vp.clientWidth - pad * 2);
            const ch = Math.max(1, vp.clientHeight - pad * 2);

            // IMPORTANT: mesurer le contenu non transformé (scrollWidth/Height ignorent scale())
            const w = Math.max(1, meas.scrollWidth);
            const h = Math.max(1, meas.scrollHeight);

            const sx = cw / w;
            const sy = ch / h;

            // contain + léger upscale autorisé
            setFitScale(clamp(Math.min(sx, sy), 0.05, 1.15));

        };

        compute();
        const raf = window.requestAnimationFrame(compute);

        const ro = new ResizeObserver(compute);
        if (viewportRef.current) ro.observe(viewportRef.current);
        if (measureRef.current) ro.observe(measureRef.current);

        window.addEventListener("resize", compute);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("resize", compute);
            ro.disconnect();
        };
    }, [open, nodes, parentById, childrenOrder]);

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();

            // Zoom clavier (optionnel mais pratique)
            if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
                e.preventDefault();
                setUserZoom((z) => clamp(z * 1.15, 0.25, 6));
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "-") {
                e.preventDefault();
                setUserZoom((z) => clamp(z / 1.15, 0.25, 6));
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "0") {
                e.preventDefault();
                setUserZoom(1);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    React.useLayoutEffect(() => {
        if (!open) return;

        const vp = viewportRef.current;
        if (!vp) return;

        // 2 frames = laisse le DOM/layout se stabiliser (fitScale, resize observer)
        const r1 = requestAnimationFrame(() => {
            vp.scrollTop = 0;
            vp.scrollLeft = 0;

            const r2 = requestAnimationFrame(() => {
                vp.scrollTop = 0;
                vp.scrollLeft = 0;
            });

            return () => cancelAnimationFrame(r2);
        });

        return () => cancelAnimationFrame(r1);
    }, [open]);


    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[1000]">
            <div
                className="absolute inset-0 bg-black/60 dark:bg-black/70"
                onClick={onClose}
                aria-hidden
            />

            <div className="absolute inset-0 p-2 sm:p-3">
                <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-xl">
                    {/* top bar */}
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-1 px-3 py-2">
                        <div className="text-sm font-semibold text-fg">Preview</div>

                        <div className="flex items-center gap-2">
                            {/* zoom controls */}
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
                                    onClick={() => setUserZoom((z) => clamp(z / 1.15, 0.25, 6))}
                                    title="Zoom -"
                                >
                                    −
                                </button>

                                <div className="min-w-[68px] text-center text-sm font-semibold text-fg">
                                    {Math.round(userZoom * 100)}%
                                </div>

                                <button
                                    type="button"
                                    className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
                                    onClick={() => setUserZoom((z) => clamp(z * 1.15, 0.25, 6))}
                                    title="Zoom +"
                                >
                                    +
                                </button>

                                <button
                                    type="button"
                                    className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
                                    onClick={() => setUserZoom(1)}
                                    title="Reset zoom"
                                >
                                    100%
                                </button>
                            </div>

                            <OrbatExportPngButton
                                targetRef={exportRef}
                                fileName="orbat.png"
                                label="Export PNG"
                            />
                            <OrbatExportSvgButton
                                targetRef={exportRef}
                                fileName="orbat.svg"
                                label="Export SVG"
                            />


                            <button
                                type="button"
                                className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* viewport */}
                    <div ref={viewportRef} className="relative flex-1 min-h-0 overflow-auto bg-bg">
                        {/* centre quand ça tient, scroll quand ça dépasse */}
                        <div className="min-h-full min-w-full p-4 sm:p-6">
                            <div
                                style={{
                                    transform: `scale(${effectiveScale})`,
                                    transformOrigin: "0 0",
                                }}
                            >
                                <div ref={measureRef} className="inline-block align-top">
                                    <OrbatBoard
                                        contentRef={exportRef}
                                        exportMode
                                        nodes={nodes}
                                        parentById={parentById}
                                        childrenOrder={childrenOrder}
                                        selectedId={null}
                                        scale={1}
                                        scaleMode="visual"
                                        bg={bg}
                                        stroke={stroke}
                                        shape={shape}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );

}
