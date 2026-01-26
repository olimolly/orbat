// src/components/orbat/OrbatBoard.tsx
"use client";

import * as React from "react";

import {
    type OrbatNode,
    type ParentByNodeId,
    type ChildrenOrder,
    type Slot,
    type NodeId,
    type UnitKind,
    UNIT_KIND_LABEL,
} from "@/lib/orbat/types";
import type { Edge } from "@/lib/orbat/edges";

import OrbatSVG from "./OrbatSVG";
import LinksLayer, { UNIT_BOTTOMLEFT_INSET } from "./LinksLayer";

type LayoutStyle = {
    nodeW: number;
    nodeH: number;
    marginX: number;
    marginTop: number;
    colGap: number;
    rowGap: number;

    railOffset: number;
    subGap: number;
    subOffsetX: number;

    unitSubRailDrop: number;
    unitSubBranchInset: number;

    groupGap: number;
};

type Props = {
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder?: ChildrenOrder;

    selectedId?: NodeId | null;
    onSelect?: (id: NodeId | null) => void;

    onReorderChildren?: (parentId: NodeId, nextChildIds: NodeId[]) => void;

    onUpdateNode?: (id: NodeId, patch: Partial<Pick<OrbatNode, "kind">>) => void;

    style?: Partial<LayoutStyle>;
    bg?: string;
    stroke?: string;
    shape?: string;
    labelSize?: string;
    boardW?: number;
    boardH?: number;
    scale?: number;

    boardRef?: React.RefObject<HTMLDivElement | null>;
    contentRef?: React.RefObject<HTMLDivElement | null>; // contenu (export)

    exportMode?: boolean;

    // NEW
    scaleMode?: "compensate" | "visual";
    onBoardSize?: (size: { w: number; h: number }) => void;
};

const DEFAULT_STYLE: LayoutStyle = {
    nodeW: 220,
    nodeH: 165,
    marginX: 40,
    marginTop: 40,
    colGap: 60,
    rowGap: 115,

    railOffset: 60,
    subGap: 18,
    subOffsetX: 40,
    unitSubRailDrop: 18,
    unitSubBranchInset: 14,

    groupGap: 60,
};

function centerX(slot: Slot) {
    return slot.x + slot.w / 2;
}
function centerY(slot: Slot) {
    return slot.y + slot.h / 2;
}

function stableOrder(
    parentId: NodeId,
    rawChildren: NodeId[],
    childrenOrder: ChildrenOrder | undefined
): NodeId[] {
    const ordered = childrenOrder?.[parentId];
    if (!ordered?.length) return rawChildren;

    const set = new Set(ordered);
    const tail = rawChildren.filter((id) => !set.has(id));
    return [...ordered.filter((id) => rawChildren.includes(id)), ...tail];
}

function arrayInsertMove<T>(arr: T[], from: number, to: number) {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    const adj = from < to ? to - 1 : to;
    next.splice(adj, 0, item);
    return next;
}

function buildChildrenMap(nodes: OrbatNode[], parentById: ParentByNodeId) {
    const children = new Map<NodeId, NodeId[]>();
    for (const n of nodes) children.set(n.id, []);
    for (const n of nodes) {
        const p = parentById[n.id];
        if (!p) continue;
        if (!children.has(p)) children.set(p, []);
        children.get(p)!.push(n.id);
    }
    return children;
}

export default function OrbatBoard({
    nodes,
    parentById,
    childrenOrder,
    selectedId,
    onSelect,
    onReorderChildren,
    onUpdateNode,
    style: styleOverride,
    bg,
    stroke,
    shape,
    boardW,
    boardH,
    scale = 1,
    labelSize = "3.75rem",
    boardRef,
    contentRef,
    exportMode = false,
    scaleMode = "compensate",
    onBoardSize,
}: Props) {
    const style = React.useMemo<LayoutStyle>(() => {
        return { ...DEFAULT_STYLE, ...(styleOverride ?? {}) };
    }, [styleOverride]);

    const nodesById = React.useMemo(() => {
        const m = new Map<NodeId, OrbatNode>();
        for (const n of nodes) m.set(n.id, n);
        return m;
    }, [nodes]);

    const childrenMap = React.useMemo(() => buildChildrenMap(nodes, parentById), [nodes, parentById]);

    const { slots, edges, computedBoard, slotById } = React.useMemo(() => {
        const nodesByIdLocal = new Map<string, OrbatNode>();
        for (const n of nodes) nodesByIdLocal.set(n.id, n);

        // 1) LEAD roots
        const roots: string[] = [];
        for (const n of nodes) {
            if (n.level === "LEAD" && parentById[n.id] == null) roots.push(n.id);
        }
        const leadIds = childrenOrder?.__ROOT__?.length ? childrenOrder.__ROOT__ : roots;

        // 2) UNIT ids (global list, in lead order)
        const unitIds: string[] = [];
        for (const leadId of leadIds) {
            const ordered = childrenOrder?.[leadId];
            if (ordered?.length) {
                for (const id of ordered) {
                    const n = nodesByIdLocal.get(id);
                    if (n?.level === "UNIT" && parentById[id] === leadId) unitIds.push(id);
                }
            } else {
                for (const n of nodes) {
                    if (n.level === "UNIT" && parentById[n.id] === leadId) unitIds.push(n.id);
                }
            }
        }

        // Build UNIT groups per LEAD
        const unitGroups: string[][] = leadIds.map((leadId) => {
            const ordered = childrenOrder?.[leadId];
            if (ordered?.length) {
                return ordered.filter(
                    (id) => nodesByIdLocal.get(id)?.level === "UNIT" && parentById[id] === leadId
                );
            }
            return nodes
                .filter((n) => n.level === "UNIT" && parentById[n.id] === leadId)
                .map((n) => n.id);
        });

        // 3) board width
        const groupWidths = unitGroups.map((g) =>
            g.length === 0 ? 0 : g.length * style.nodeW + (g.length - 1) * style.colGap
        );
        const nonEmptyGroups = unitGroups.filter((g) => g.length > 0).length;

        const unitsContentW =
            groupWidths.reduce((a, b) => a + b, 0) + Math.max(0, nonEmptyGroups - 1) * style.groupGap;

        const autoW = Math.max(unitsContentW + style.subOffsetX + 40, 680);

        // 4) slots placement
        const slots: Slot[] = [];
        const slotById = new Map<string, Slot>();

        const yLead = style.marginTop;
        const yUnit = style.marginTop + style.nodeH + style.rowGap;

        if (unitsContentW > 0) {
            let cursorX = Math.max(style.marginX, Math.round((autoW - unitsContentW) / 2));

            for (let gi = 0; gi < unitGroups.length; gi++) {
                const group = unitGroups[gi];
                if (group.length === 0) continue;

                for (let i = 0; i < group.length; i++) {
                    const id = group[i];
                    const s: Slot = { id, x: cursorX, y: yUnit, w: style.nodeW, h: style.nodeH };
                    slots.push(s);
                    slotById.set(id, s);
                    cursorX += style.nodeW + style.colGap;
                }

                const hasNextGroup = unitGroups.slice(gi + 1).some((g) => g.length > 0);
                if (hasNextGroup) cursorX += style.groupGap;
            }
        }

        // LEAD desired X
        type LeadPos = { id: string; desiredX: number };
        const leadPositions: LeadPos[] = [];

        for (const leadId of leadIds) {
            const children = unitIds.filter((uid) => parentById[uid] === leadId);
            if (children.length === 0) {
                leadPositions.push({ id: leadId, desiredX: style.marginX });
                continue;
            }

            const centers = children
                .map((uid) => slotById.get(uid))
                .filter(Boolean)
                .map((s) => centerX(s!));

            const minC = Math.min(...centers);
            const maxC = Math.max(...centers);
            const targetCenter = (minC + maxC) / 2;

            leadPositions.push({
                id: leadId,
                desiredX: Math.round(targetCenter - style.nodeW / 2),
            });
        }

        leadPositions.sort((a, b) => a.desiredX - b.desiredX);

        const minX = style.marginX;
        const maxX = autoW - style.marginX - style.nodeW;

        let prevX = -Infinity;
        for (const lp of leadPositions) {
            let lx = Math.max(minX, Math.min(maxX, lp.desiredX));
            if (lx < prevX + style.nodeW + style.colGap) lx = prevX + style.nodeW + style.colGap;
            lx = Math.max(minX, Math.min(maxX, lx));

            const s: Slot = { id: lp.id, x: lx, y: yLead, w: style.nodeW, h: style.nodeH };
            slots.push(s);
            slotById.set(lp.id, s);
            prevX = lx;
        }

        // 5) SUB placement
        const unitToSubs = new Map<string, string[]>();

        for (const unitId of unitIds) {
            const ordered = childrenOrder?.[unitId];
            let subsForUnit: string[] = [];

            if (ordered?.length) {
                subsForUnit = ordered.filter(
                    (id) => nodesByIdLocal.get(id)?.level === "SUB" && parentById[id] === unitId
                );
            } else {
                subsForUnit = nodes
                    .filter((n) => n.level === "SUB" && parentById[n.id] === unitId)
                    .map((n) => n.id);
            }

            unitToSubs.set(unitId, subsForUnit);
        }

        for (const unitId of unitIds) {
            const uSlot = slotById.get(unitId);
            if (!uSlot) continue;

            const subsForUnit = unitToSubs.get(unitId) ?? [];
            for (let i = 0; i < subsForUnit.length; i++) {
                const subId = subsForUnit[i];

                const y = uSlot.y + style.nodeH + style.subGap + i * (style.nodeH + style.subGap);

                const s: Slot = {
                    id: subId,
                    x: uSlot.x + style.subOffsetX,
                    y,
                    w: style.nodeW,
                    h: style.nodeH,
                };
                slots.push(s);
                slotById.set(subId, s);
            }
        }

        // 6) edges
        const edges: Edge[] = [];

        const leadUnitRailY =
            leadIds.length > 0 && unitIds.length > 0 ? yLead + style.nodeH + style.railOffset : null;

        if (leadUnitRailY != null) {
            for (const unitId of unitIds) {
                const leadId = parentById[unitId];
                if (!leadId) continue;

                const pSlot = slotById.get(leadId);
                const cSlot = slotById.get(unitId);
                if (!pSlot || !cSlot) continue;

                const px = Math.round(centerX(pSlot));
                const cx = Math.round(centerX(cSlot));

                const via =
                    px === cx
                        ? [{ x: px, y: leadUnitRailY }]
                        : [{ x: px, y: leadUnitRailY }, { x: cx, y: leadUnitRailY }];

                edges.push({
                    id: `${leadId}-${unitId}`,
                    from: { slotId: leadId, side: "bottom" },
                    to: { slotId: unitId, side: "top" },
                    via,
                });
            }
        }

        for (const unitId of unitIds) {
            const subsForUnit = unitToSubs.get(unitId) ?? [];
            if (subsForUnit.length === 0) continue;

            const uSlot = slotById.get(unitId);
            if (!uSlot) continue;

            const railX = Math.round(uSlot.x + UNIT_BOTTOMLEFT_INSET);
            const railStartY = Math.round(uSlot.y + uSlot.h + style.unitSubRailDrop);

            for (const subId of subsForUnit) {
                const sSlot = slotById.get(subId);
                if (!sSlot) continue;

                const targetX = Math.round(sSlot.x);
                const targetY = Math.round(centerY(sSlot));
                const xApproach = targetX - style.unitSubBranchInset;

                edges.push({
                    id: `${unitId}-${subId}`,
                    from: { slotId: unitId, side: "bottomLeft" },
                    to: { slotId: subId, side: "left" },
                    via: [
                        { x: railX, y: railStartY },
                        { x: railX, y: targetY },
                        { x: xApproach, y: targetY },
                    ],
                });
            }
        }

        // 7) auto height
        let maxBottom = 0;
        for (const s of slots) maxBottom = Math.max(maxBottom, s.y + s.h);

        // padding bas: grand en UI, petit en export
        const padBottom = exportMode ? 40 : 218;
        const autoH = maxBottom + padBottom;

        return {
            slots,
            edges,
            slotById,
            computedBoard: { w: autoW, h: autoH },
        };
    }, [nodes, parentById, childrenOrder, style, exportMode]);

    const w = boardW ?? computedBoard.w;
    const h = boardH ?? computedBoard.h;

    React.useEffect(() => {
        onBoardSize?.({ w, h });
    }, [w, h, onBoardSize]);

    // DnD refs (logic only)
    const dragRef = React.useRef<{ parentId: NodeId; draggedId: NodeId } | null>(null);
    const hoverRef = React.useRef<{ overId: NodeId; pos: "before" | "after" } | null>(null);

    const [dropHint, setDropHint] = React.useState<{ id: NodeId; pos: "before" | "after" } | null>(
        null
    );

    const [kindEditor, setKindEditor] = React.useState<{ id: NodeId } | null>(null);

    React.useEffect(() => {
        if (!kindEditor) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setKindEditor(null);
        }
        function onPointerDown(e: PointerEvent) {
            const el = e.target as HTMLElement | null;
            if (el?.closest?.("[data-kind-popover]")) return;
            setKindEditor(null);
        }

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointerdown", onPointerDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [kindEditor]);

    function clearHints() {
        hoverRef.current = null;
        setDropHint(null);
    }

    function siblingsOf(parentId: NodeId): NodeId[] {
        const ordered = childrenOrder?.[parentId];
        if (ordered?.length) return ordered;

        const raw = childrenMap.get(parentId) ?? [];
        return stableOrder(parentId, raw, childrenOrder);
    }

    function applyReorder(parentId: NodeId, overId: NodeId, pos: "before" | "after") {
        if (!onReorderChildren) return;

        const ctx = dragRef.current;
        dragRef.current = null;

        if (!ctx) return;
        if (ctx.parentId !== parentId) return;

        const sibs = siblingsOf(parentId);
        const from = sibs.indexOf(ctx.draggedId);
        const overIndex = sibs.indexOf(overId);
        if (from === -1 || overIndex === -1) return;

        const to = pos === "after" ? overIndex + 1 : overIndex;
        if (to === from) return;

        const next = arrayInsertMove(sibs, from, to);
        onReorderChildren(parentId, next);
    }

    const contentStyle: React.CSSProperties =
        scaleMode === "visual"
            ? {
                transform: `scale(${scale})`,
                width: w,
                height: h,
            }
            : {
                transform: `scale(${scale})`,
                width: w / scale,
                height: h / scale,
            };

    return (
        <div
            ref={boardRef}
            className={[
                "relative",
                exportMode ? "overflow-visible rounded-none" : " border h-full overflow-hidden rounded-xl",
            ].join(" ")}
        >
            <div className={exportMode ? "" : "h-full w-full overflow-auto"}>
                <div ref={contentRef} className="origin-top-left" style={contentStyle}>
                    <LinksLayer slots={slots} edges={edges} stroke={stroke ?? "#000"} strokeWidth={4} />

                    {nodes.map((node) => {
                        const slot = slotById.get(node.id);
                        if (!slot) return null;

                        const isSelected = selectedId === node.id;
                        const parentId = parentById[node.id] ?? null;

                        const hint = dropHint?.id === node.id ? dropHint.pos : null;

                        const isKindOpen = kindEditor?.id === node.id;
                        const canDnD = Boolean(onReorderChildren) && parentId != null && !isKindOpen;

                        return (
                            <div
                                key={node.id}
                                className={[
                                    "absolute cursor-pointer orbat-node",
                                    isSelected ? "orbat-node--active" : "hover:ring-1",
                                ].join(" ")}
                                style={{
                                    left: slot.x,
                                    top: slot.y,
                                    width: slot.w,
                                    height: slot.h,
                                }}
                                draggable={canDnD}
                                onDragStart={() => {
                                    if (!canDnD || !parentId) return;
                                    dragRef.current = { parentId, draggedId: node.id };
                                }}
                                onDragEnd={() => {
                                    dragRef.current = null;
                                    clearHints();
                                }}
                                onDragOver={(e) => {
                                    if (!canDnD || !parentId) return;
                                    e.preventDefault();

                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const y = e.clientY - rect.top;
                                    const pos: "before" | "after" = y > rect.height / 2 ? "after" : "before";

                                    hoverRef.current = { overId: node.id, pos };
                                    setDropHint({ id: node.id, pos });
                                }}
                                onDragLeave={(e) => {
                                    if (!canDnD) return;
                                    const rel = e.relatedTarget as Node | null;
                                    if (rel && e.currentTarget.contains(rel)) return;
                                    if (dropHint?.id === node.id) clearHints();
                                }}
                                onDrop={(e) => {
                                    if (!canDnD || !parentId) return;
                                    e.preventDefault();

                                    const pos = hoverRef.current?.overId === node.id ? hoverRef.current.pos : null;
                                    clearHints();
                                    if (!pos) return;

                                    applyReorder(parentId, node.id, pos);
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect?.(node.id);
                                }}
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!onUpdateNode) return;
                                    setKindEditor({ id: node.id });
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Select ${node.id}`}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onSelect?.(node.id);
                                    }
                                }}
                            >
                                {hint === "before" ? (
                                    <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] rounded bg-black/60" />
                                ) : null}
                                {hint === "after" ? (
                                    <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-[2px] rounded bg-black/60" />
                                ) : null}

                                <OrbatSVG kind={node.kind} bg={bg} stroke={stroke} shape={shape} className="block h-full w-full" />

                                {node.labelMain ? (
                                    <div
                                        className="pointer-events-none absolute inset-0 flex items-center justify-center text-center font-bold truncate"
                                        style={{ color: shape, fontSize: labelSize }}
                                    >
                                        {node.labelMain}
                                    </div>
                                ) : null}

                                {node.labelTop ? (
                                    <div className="pointer-events-none absolute inset-x-0 top-1.5 text-center orbat-label" style={{ color: shape }}>
                                        {node.labelTop}
                                    </div>
                                ) : null}

                                {node.labelBottom ? (
                                    <div
                                        className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center orbat-label"
                                        style={{ color: shape }}
                                    >
                                        {node.labelBottom}
                                    </div>
                                ) : null}

                                {isKindOpen ? (
                                    <div
                                        data-kind-popover
                                        className="absolute right-2 top-2 z-50 w-56 rounded-xl border border-black/20 bg-white p-2 shadow-sm"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="mb-1 flex items-center justify-between">
                                            <div className="text-xs font-semibold opacity-80">Kind</div>
                                            <button
                                                type="button"
                                                className="text-xs underline opacity-70 hover:opacity-100"
                                                onClick={() => setKindEditor(null)}
                                            >
                                                Close
                                            </button>
                                        </div>

                                        <select
                                            className="h-9 w-full rounded-md border border-black/20 bg-white px-2 text-sm"
                                            value={nodesById.get(node.id)?.kind ?? "unitBlufor"}
                                            onChange={(e) => {
                                                const next = e.target.value as UnitKind;
                                                onUpdateNode?.(node.id, { kind: next });
                                                setKindEditor(null);
                                            }}
                                        >
                                            {(Object.entries(UNIT_KIND_LABEL) as [UnitKind, string][]).map(([k, label]) => (
                                                <option key={k} value={k}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="mt-2 text-[11px] opacity-70">Esc ou clic dehors pour fermer.</div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
