"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
    OrbatNode,
    ParentByNodeId,
    ChildrenOrder,
    NodeId,
    UnitKind,
} from "@/lib/orbat/types";

import OrbatInitReset, {
    type InitParams,
    type UnitRailDirection,
} from "@/components/orbat/OrbatInitReset";

import OrbatColorPresetSelect, {
    getOrbatColors,
    type OrbatColorPresetId,
} from "@/components/orbat/OrbatColorPresetSelect";

import OrbatEditorSidebar from "@/components/orbat/OrbatEditorSidebar";
import OrbatImportExport from "@/components/orbat/OrbatImportExport";
import OrbatExportPngButton from "@/components/orbat/OrbatExportPngButton";
import OrbatBoard from "@/components/orbat/OrbatBoard";

import type { EditorState as ExportState } from "@/lib/orbat/io";
import OrbatPreviewOverlay from "../orbat/OrbatPreviewOverlay";

const STORAGE_KEY = "orbat-editor-v1";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function buildInitialOrbat(params: InitParams): {
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder: ChildrenOrder;
    selectedId: NodeId | null;
} {
    const leadCount = Math.max(1, Math.trunc(params.leadCount));
    const unitsPerLead = Math.max(0, Math.trunc(params.unitsPerLead));
    const subsPerUnit = Math.max(0, Math.trunc(params.subsPerUnit));

    const nodes: OrbatNode[] = [];
    const parentById: ParentByNodeId = {};
    const childrenOrder: ChildrenOrder = {};

    const leadIds: string[] = [];
    const unitIdsByLead: Record<string, string[]> = {};
    const subIdsByUnit: Record<string, string[]> = {};

    for (let li = 1; li <= leadCount; li++) {
        const id = `L${li}`;
        leadIds.push(id);

        nodes.push({
            id,
            displayId: id,
            level: "LEAD",
            kind: "unitBlufor" as UnitKind,
            labelMain: li === 1 ? "HQ" : `PL${li}`,
        });
        parentById[id] = null;
        unitIdsByLead[id] = [];
    }

    childrenOrder.__ROOT__ = [...leadIds];

    let uCounter = 1;
    for (const leadId of leadIds) {
        for (let ui = 0; ui < unitsPerLead; ui++) {
            const uid = `U${uCounter++}`;
            unitIdsByLead[leadId].push(uid);

            nodes.push({
                id: uid,
                displayId: uid,
                level: "UNIT",
                kind: "unitBlufor" as UnitKind,
            });

            parentById[uid] = leadId;
            subIdsByUnit[uid] = [];
        }
        childrenOrder[leadId] = [...unitIdsByLead[leadId]];
    }

    let sCounter = 1;
    for (const leadId of leadIds) {
        for (const uid of unitIdsByLead[leadId]) {
            for (let si = 0; si < subsPerUnit; si++) {
                const sid = `S${sCounter++}`;
                subIdsByUnit[uid].push(sid);

                nodes.push({
                    id: sid,
                    displayId: sid,
                    level: "SUB",
                    kind: "unitBlufor" as UnitKind,
                });

                parentById[sid] = uid;
            }
            if (subIdsByUnit[uid].length > 0) {
                childrenOrder[uid] = [...subIdsByUnit[uid]];
            }
        }
    }

    return { nodes, parentById, childrenOrder, selectedId: leadIds[0] ?? null };
}

type EditorMode = "edit" | "preview";
type EditorState = {
    mode: EditorMode;
    initParams: InitParams;
    unitRailDirection: UnitRailDirection;
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder: ChildrenOrder;
    selectedId: NodeId | null;
    scale: number;
    colorPresetId: OrbatColorPresetId;
};

export default function EditorShell() {
    const [editor, setEditor] = useState<EditorState>(() => {
        const initParams: InitParams = {
            leadCount: 1,
            unitsPerLead: 3,
            subsPerUnit: 0,
            unitRailDirection: "horizontal",
        };

        const initial = buildInitialOrbat(initParams);

        return {
            mode: "edit",
            initParams,
            unitRailDirection: "horizontal",
            nodes: initial.nodes,
            parentById: initial.parentById,
            childrenOrder: initial.childrenOrder,
            selectedId: initial.selectedId,
            scale: 1,
            colorPresetId: "p1",
        };
    });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


    // refs used by inline export button (not the preview overlay)
    const exportRef = useRef<HTMLDivElement>(null);

    const isPreview = editor.mode === "preview";

    // exportable document state (NO mode)
    const exportState = useMemo<ExportState>(
        () => ({
            initParams: editor.initParams,
            unitRailDirection: editor.unitRailDirection,
            nodes: editor.nodes,
            parentById: editor.parentById,
            childrenOrder: editor.childrenOrder,
            selectedId: editor.selectedId,
            scale: editor.scale,
            colorPresetId: editor.colorPresetId,
        }),
        [
            editor.initParams,
            editor.unitRailDirection,
            editor.nodes,
            editor.parentById,
            editor.childrenOrder,
            editor.selectedId,
            editor.scale,
            editor.colorPresetId,
        ]
    );

    // load localStorage (document only)
    useEffect(() => {
        const saved = safeParse<ExportState>(localStorage.getItem(STORAGE_KEY));
        if (!saved) return;
        if (!Array.isArray(saved.nodes) || !saved.parentById || !saved.childrenOrder) return;

        const t = window.setTimeout(() => {
            setEditor((prev) => ({
                ...prev,
                ...saved,
                scale: saved.scale ?? prev.scale,
                colorPresetId: saved.colorPresetId ?? prev.colorPresetId,
            }));
        }, 0);

        return () => window.clearTimeout(t);
    }, []);

    // save localStorage (document only)
    useEffect(() => {
        const t = window.setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(exportState));
            } catch {
                // ignore quota
            }
        }, 250);

        return () => window.clearTimeout(t);
    }, [exportState]);

    const colors = useMemo(() => getOrbatColors(editor.colorPresetId), [editor.colorPresetId]);

    const selectedNode = useMemo(
        () => editor.nodes.find((n) => n.id === editor.selectedId) ?? null,
        [editor.nodes, editor.selectedId]
    );

    const actions = (
        <>
            <OrbatInitReset
                value={editor.initParams}
                onChange={(v) => setEditor((p) => ({ ...p, initParams: v }))}
                onInit={handleInitReset}
            />

            <OrbatImportExport
                editor={exportState}
                onImport={(state) =>
                    setEditor((prev) => ({
                        ...prev,
                        ...state,
                        scale: state.scale ?? prev.scale,
                        colorPresetId: state.colorPresetId ?? prev.colorPresetId,
                    }))
                }
            />

            <OrbatColorPresetSelect
                value={editor.colorPresetId}
                onChange={(id) => setEditor((p) => ({ ...p, colorPresetId: id }))}
                label="Color preset"
            />

            <OrbatExportPngButton targetRef={exportRef} />
        </>
    );

    function handleInitReset(params: InitParams) {
        setEditor((prev) => {
            const next = buildInitialOrbat(params);
            return {
                ...prev,
                initParams: params,
                unitRailDirection: params.unitRailDirection,
                nodes: next.nodes,
                parentById: next.parentById,
                childrenOrder: next.childrenOrder,
                selectedId: next.selectedId,
            };
        });
    }


    return (
        <div className="h-full min-h-0 bg-[var(--color-bg)] text-[var(--color-fg)]">
            {/* Overlay should be mounted once, at root */}
            <OrbatPreviewOverlay
                open={editor.mode === "preview"}
                onClose={() => setEditor((p) => ({ ...p, mode: "edit" }))}
                nodes={editor.nodes}
                parentById={editor.parentById}
                childrenOrder={editor.childrenOrder}
                bg={colors.bg}
                stroke={colors.stroke}
                shape={colors.shape}
            />

            <div className="grid h-full min-h-0 lg:grid-cols-[360px_1fr]">
                {/* gauche */}
                <div className="min-w-0 min-h-0 space-y-3 overflow-y-auto overflow-x-hidden border-b-2 border-black p-3 lg:border-b-0">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="font-semibold">Selected element</div>
                                <div className="opacity-80">
                                    {selectedNode
                                        ? `${selectedNode.displayId ?? selectedNode.id} (${selectedNode.level})`
                                        : "None"}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="h-9 rounded-md border border-black/20 bg-white px-3 text-sm font-semibold hover:border-black/50"
                                onClick={() =>
                                    setEditor((p) => ({
                                        ...p,
                                        mode: p.mode === "edit" ? "preview" : "edit",
                                    }))
                                }
                                title="Open preview overlay"
                            >
                                Preview
                            </button>
                        </div>

                        {/* <div className="mt-2 text-xs opacity-70">
                            Unit rail direction (stored):{" "}
                            <span className="font-semibold">{editor.unitRailDirection}</span>
                        </div> */}

                        {isPreview ? (
                            <div className="mt-2 text-xs opacity-70">
                                Preview mode: overlay opened.
                            </div>
                        ) : null}
                    </div>

                    <OrbatEditorSidebar
                        nodes={editor.nodes}
                        parentById={editor.parentById}
                        childrenOrder={editor.childrenOrder}
                        selectedId={editor.selectedId}
                        onSelect={(id) => setEditor((p) => ({ ...p, selectedId: id }))}
                        setNodes={(updater) =>
                            setEditor((p) => ({
                                ...p,
                                nodes: typeof updater === "function" ? updater(p.nodes) : updater,
                            }))
                        }
                        setParentById={(updater) =>
                            setEditor((p) => ({
                                ...p,
                                parentById: typeof updater === "function" ? updater(p.parentById) : updater,
                            }))
                        }
                        setChildrenOrder={(updater) =>
                            setEditor((p) => ({
                                ...p,
                                childrenOrder:
                                    typeof updater === "function" ? updater(p.childrenOrder) : updater,
                            }))
                        }
                    />
                </div>


                {/* droite */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl lg:pt-3">
                    {/* Mobile trigger (only mobile) */}
                    <div className="relative lg:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="z-10 absolute h-9 top-2 right-5 rounded-md border border-black/20 bg-white px-3 text-sm font-semibold hover:border-black/50 cursor-pointer"
                        >
                            Actions
                        </button>
                        {/* <div className="h-12" /> */}
                    </div>

                    {/* Desktop actions (only lg+) */}
                    <div className="hidden lg:flex flex-wrap items-start gap-1 px-3 lg:max-h-none">
                        {actions}
                    </div>

                    {/* Mobile drawer */}
                    {mobileMenuOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setMobileMenuOpen(false)}
                                className="absolute inset-0 bg-black/40"
                            />

                            <div className="absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-white shadow-xl">
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <div className="text-sm font-semibold">Actions</div>
                                    <button
                                        type="button"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="h-9 rounded-md border border-black/20 bg-white px-3 text-sm"
                                    >
                                        Fermer
                                    </button>
                                </div>

                                <div className="flex max-h-full flex-col gap-2 overflow-auto p-3">
                                    {actions}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="min-h-0 flex-1 p-1 lg:p-3">
                        <OrbatBoard
                            contentRef={exportRef}
                            // keep the inline editor as editor (not exportMode)
                            exportMode={false}
                            nodes={editor.nodes}
                            parentById={editor.parentById}
                            childrenOrder={editor.childrenOrder}
                            selectedId={editor.selectedId}
                            onSelect={(id) => setEditor((p) => ({ ...p, selectedId: id }))}
                            onReorderChildren={(parentId, nextChildIds) =>
                                setEditor((p) => ({
                                    ...p,
                                    childrenOrder: { ...p.childrenOrder, [parentId]: nextChildIds },
                                }))
                            }
                            scale={editor.scale}
                            bg={colors.bg}
                            stroke={colors.stroke}
                            shape={colors.shape}
                            onUpdateNode={(id, patch) =>
                                setEditor((p) => ({
                                    ...p,
                                    nodes: p.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
                                }))
                            }
                        />

                        <div className="fixed bottom-7 right-7 flex w-[220px] flex-col rounded-xl border border-black/15 bg-white p-3">
                            <input
                                type="range"
                                min={0.5}
                                max={1.2}
                                step={0.05}
                                value={editor.scale}
                                onChange={(e) => setEditor((p) => ({ ...p, scale: Number(e.target.value) }))}
                                className="w-full"
                            />
                            <div className="hidden md:block text-xs opacity-70">Scale: {Math.round(editor.scale * 100)}%</div>
                        </div>
                    </div>

                </div>

            </div>
        </div >
    );
}
