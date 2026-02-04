"use client";

import * as React from "react";

import {
    ROOT_ID,
    type OrbatNode,
    type ParentByNodeId,
    type ChildrenOrder,
    type Slot,
    type NodeId,
    type UnitKind,
    UNIT_KIND_LABEL,
} from "@/lib/orbat/types";
import type { Edge } from "@/lib/orbat/edges";

import LinksLayer, { UNIT_BOTTOMLEFT_INSET } from "../orbat/LinksLayer";
import OrbatSVG from "../orbat/OrbatSVG";
import { buildChildrenMap, siblingsOfLevel, stableOrder } from "@/lib/orbat/tree";

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
    contentRef?: React.RefObject<HTMLDivElement | null>;

    exportMode?: boolean;

    scaleMode?: "compensate" | "visual";
    onBoardSize?: (size: { w: number; h: number }) => void;
};

const DEFAULT_STYLE: LayoutStyle = {
    nodeW: 220,
    nodeH: 165,
    marginX: 0,
    marginTop: 0,
    colGap: 60,
    rowGap: 115,

    railOffset: 60,
    subGap: 18,
    subOffsetX: 24,
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

function arrayInsertMove<T>(arr: T[], from: number, to: number) {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    const adj = from < to ? to - 1 : to;
    next.splice(adj, 0, item);
    return next;
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
    const safeNodes = React.useMemo(() => (Array.isArray(nodes) ? nodes : []), [nodes]);

    const style = React.useMemo<LayoutStyle>(() => {
        return { ...DEFAULT_STYLE, ...(styleOverride ?? {}) };
    }, [styleOverride]);

    const nodesById = React.useMemo(() => {
        const m = new Map<NodeId, OrbatNode>();
        for (const n of safeNodes) m.set(n.id, n);
        return m;
    }, [safeNodes]);

    const childrenMap = React.useMemo(() => buildChildrenMap(safeNodes, parentById), [safeNodes, parentById]);

    const { slots, edges, computedBoard, slotById } = React.useMemo(() => {
        const nodesByIdLocal = new Map<string, OrbatNode>();
        for (const n of safeNodes) nodesByIdLocal.set(n.id, n);

        // 1) LEAD ids (enfants de ROOT_ID)
        const leadRoots: string[] = [];
        for (const n of safeNodes) {
            if (n.id === ROOT_ID) continue;
            if (n.level === "LEAD" && parentById[n.id] === ROOT_ID) leadRoots.push(n.id);
        }

        const orderedLeads = childrenOrder?.[ROOT_ID];
        const leadIds = orderedLeads && orderedLeads.length > 0 ? orderedLeads : leadRoots;

        // 2) UNIT groups per LEAD
        const unitGroups: string[][] = leadIds.map((leadId) => {
            const raw = (childrenMap.get(leadId) ?? []).filter((id) => nodesByIdLocal.get(id)?.level === "UNIT");
            return stableOrder(leadId, raw, childrenOrder);
        });

        // Flatten units in lead order
        const unitIds: string[] = [];
        for (const group of unitGroups) for (const id of group) unitIds.push(id);

        // 3) board width
        const groupWidths = unitGroups.map((g) =>
            g.length === 0 ? 0 : g.length * style.nodeW + (g.length - 1) * style.colGap
        );
        const nonEmptyGroups = unitGroups.filter((g) => g.length > 0).length;

        const unitsContentW =
            groupWidths.reduce((a, b) => a + b, 0) + Math.max(0, nonEmptyGroups - 1) * style.groupGap;

        const leadsNeededW = style.marginX * 2 + leadIds.length * style.nodeW + Math.max(0, leadIds.length - 1) * style.colGap;

        const autoW = Math.max(680, unitsContentW + style.marginX * 2, leadsNeededW);

        // 4) slots
        const slots: Slot[] = [];
        const slotById = new Map<string, Slot>();

        const yLead = style.marginTop;
        const yUnit = style.marginTop + style.nodeH + style.rowGap;

        // Units centered as one big content block (avec groupGap entre groups)
        if (unitsContentW > 0) {
            let cursorX = style.marginX;

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

        // LEAD placement
        const minX = style.marginX;
        const maxX = autoW - style.marginX - style.nodeW;
        const step = style.nodeW + style.colGap;

        function leadHasUnits(leadId: string) {
            return unitIds.some((uid) => parentById[uid] === leadId);
        }

        function desiredXForLeadWithUnits(leadId: string) {
            const children = unitIds.filter((uid) => parentById[uid] === leadId);
            const centers = children
                .map((uid) => slotById.get(uid))
                .filter((s): s is Slot => Boolean(s))
                .map((s) => centerX(s));

            const minC = Math.min(...centers);
            const maxC = Math.max(...centers);
            const targetCenter = (minC + maxC) / 2;
            return Math.round(targetCenter - style.nodeW / 2);
        }

        function collides(x: number, used: number[]) {
            for (const u of used) {
                if (Math.abs(u - x) < step * 0.85) return true;
            }
            return false;
        }

        const usedLeadX: number[] = [];
        let rightCursor = maxX;

        for (const leadId of leadIds) {
            if (!nodesByIdLocal.get(leadId)) continue;

            const hasUnits = leadHasUnits(leadId);

            let lx = hasUnits ? desiredXForLeadWithUnits(leadId) : rightCursor;
            lx = Math.max(minX, Math.min(maxX, lx));

            if (collides(lx, usedLeadX)) {
                let found = false;

                // right
                for (let k = 1; k < 50; k++) {
                    const cand = Math.max(minX, Math.min(maxX, lx + k * step));
                    if (!collides(cand, usedLeadX)) {
                        lx = cand;
                        found = true;
                        break;
                    }
                }

                // left
                if (!found) {
                    for (let k = 1; k < 50; k++) {
                        const cand = Math.max(minX, Math.min(maxX, lx - k * step));
                        if (!collides(cand, usedLeadX)) {
                            lx = cand;
                            break;
                        }
                    }
                }
            }

            const s: Slot = { id: leadId, x: lx, y: yLead, w: style.nodeW, h: style.nodeH };
            slots.push(s);
            slotById.set(leadId, s);
            usedLeadX.push(lx);

            if (!hasUnits) rightCursor = Math.max(minX, lx - step);
        }

        // 5) SUB placement (vertical under UNIT, ordered)
        const unitToSubs = new Map<string, string[]>();

        for (const unitId of unitIds) {
            const raw = (childrenMap.get(unitId) ?? []).filter((id) => nodesByIdLocal.get(id)?.level === "SUB");
            const ordered = stableOrder(unitId, raw, childrenOrder);
            unitToSubs.set(unitId, ordered);
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

        const leadUnitRailY = leadIds.length > 0 && unitIds.length > 0 ? yLead + style.nodeH + style.railOffset : null;

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
                    px === cx ? [{ x: px, y: leadUnitRailY }] : [{ x: px, y: leadUnitRailY }, { x: cx, y: leadUnitRailY }];

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

        // 7) height
        let maxBottom = 0;
        for (const s of slots) maxBottom = Math.max(maxBottom, s.y + s.h);

        const padBottom = exportMode ? 40 : 218;
        const autoH = maxBottom + padBottom;

        // TRIM bbox (export only)
        let boardW2 = autoW;
        let boardH2 = autoH;

        if (exportMode && slots.length > 0) {
            let minX2 = Infinity;
            let maxX2 = -Infinity;
            let minY2 = Infinity;
            let maxY2 = -Infinity;

            for (const s of slots) {
                minX2 = Math.min(minX2, s.x);
                maxX2 = Math.max(maxX2, s.x + s.w);
                minY2 = Math.min(minY2, s.y);
                maxY2 = Math.max(maxY2, s.y + s.h);
            }

            for (const e of edges) {
                if (!e.via) continue;
                for (const p of e.via) {
                    minX2 = Math.min(minX2, p.x);
                    maxX2 = Math.max(maxX2, p.x);
                    minY2 = Math.min(minY2, p.y);
                    maxY2 = Math.max(maxY2, p.y);
                }
            }

            const PAD = 0;
            const dx = minX2 - PAD;
            const dy = minY2 - PAD;

            if (Number.isFinite(dx) && Number.isFinite(dy)) {
                for (const s of slots) {
                    s.x -= dx;
                    s.y -= dy;
                }
                for (const e of edges) {
                    if (!e.via) continue;
                    for (const p of e.via) {
                        p.x -= dx;
                        p.y -= dy;
                    }
                }

                boardW2 = Math.ceil(maxX2 - minX2 + PAD * 2);
                boardH2 = Math.ceil(maxY2 - minY2 + PAD * 2);
            }
        }

        return {
            slots,
            edges,
            slotById,
            computedBoard: { w: boardW2, h: boardH2 },
        };
    }, [safeNodes, parentById, childrenOrder, style, exportMode, childrenMap]);

    const w = boardW ?? computedBoard.w;
    const h = boardH ?? computedBoard.h;

    React.useEffect(() => {
        onBoardSize?.({ w, h });
    }, [w, h, onBoardSize]);

    // ─────────────────────────────────────────────
    // DnD (Drop gaps)
    // ─────────────────────────────────────────────
    const dragRef = React.useRef<{ parentId: NodeId; draggedId: NodeId; level: OrbatNode["level"] } | null>(null);

    const [dragging, setDragging] = React.useState<{
        parentId: NodeId;
        draggedId: NodeId;
        level: OrbatNode["level"];
    } | null>(null);

    const [dropHint, setDropHint] = React.useState<{
        parentId: NodeId;
        level: OrbatNode["level"];
        index: number;
    } | null>(null);

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
        setDropHint(null);
    }

    const siblingsOf = React.useCallback(
        (parentId: NodeId, level: OrbatNode["level"]) =>
            siblingsOfLevel(parentId, level, childrenMap, nodesById, childrenOrder),
        [childrenMap, nodesById, childrenOrder]
    );



    function applyReorderAt(parentId: NodeId, insertIndex: number) {
        if (!onReorderChildren) return;

        const ctx = dragRef.current;
        dragRef.current = null;

        if (!ctx) return;
        if (ctx.parentId !== parentId) return;

        const nextAll = reorderWithinLevelComplete(parentId, ctx.level, ctx.draggedId, insertIndex);
        if (!nextAll) return;

        onReorderChildren(parentId, nextAll);
    }

    function reorderWithinLevelComplete(
        parentId: NodeId,
        level: OrbatNode["level"],
        draggedId: NodeId,
        dropIndex: number
    ): NodeId[] | null {
        const rawAll = childrenMap.get(parentId) ?? [];
        const all = stableOrder(parentId, rawAll, childrenOrder);

        const sibs = all.filter((cid) => nodesById.get(cid)?.level === level);

        const from = sibs.indexOf(draggedId);
        if (from === -1) return null;

        const to = Math.max(0, Math.min(dropIndex, sibs.length));
        if (to === from) return null;

        const moved = arrayInsertMove(sibs, from, to);

        let k = 0;
        const nextAll = all.map((cid) => {
            const nn = nodesById.get(cid);
            if (nn?.level !== level) return cid;
            return moved[k++];
        });

        return nextAll;
    }


    const contentStyle: React.CSSProperties =
        scaleMode === "visual"
            ? { transform: `scale(${scale})`, width: w, height: h }
            : { transform: `scale(${scale})`, width: w / scale, height: h / scale };

    const overlayW = scaleMode === "visual" ? w : w / scale;
    const overlayH = scaleMode === "visual" ? h : h / scale;

    const dragSiblings = React.useMemo(() => {
        if (!dragging) return null;

        const sibIds = siblingsOf(dragging.parentId, dragging.level);

        const sibSlots = sibIds
            .map((id) => slotById.get(id))
            .filter((s): s is Slot => Boolean(s));

        sibSlots.sort((a, b) => (dragging.level === "SUB" ? a.y - b.y : a.x - b.x));

        return { parentId: dragging.parentId, level: dragging.level, sibSlots };
    }, [dragging, slotById, siblingsOf]);

    type DropGap = { index: number; x: number; y: number; w: number; h: number };

    const dropGaps = React.useMemo<DropGap[]>(() => {
        if (!dragSiblings) return [];
        const { level, sibSlots } = dragSiblings;
        if (sibSlots.length === 0) return [];

        const gaps: DropGap[] = [];

        const GAP_W = Math.max(12, Math.round(style.colGap * 0.6));
        const GAP_H = Math.max(12, Math.round(style.subGap * 0.6));

        if (level === "SUB") {
            const first = sibSlots[0];
            gaps.push({ index: 0, x: first.x, y: first.y - GAP_H, w: first.w, h: GAP_H });

            for (let i = 0; i < sibSlots.length - 1; i++) {
                const a = sibSlots[i];
                const b = sibSlots[i + 1];
                const y = a.y + a.h;
                const h2 = Math.max(GAP_H, b.y - y);
                gaps.push({ index: i + 1, x: a.x, y, w: a.w, h: h2 });
            }

            const last = sibSlots[sibSlots.length - 1];
            gaps.push({ index: sibSlots.length, x: last.x, y: last.y + last.h, w: last.w, h: GAP_H });
        } else {
            const first = sibSlots[0];
            gaps.push({ index: 0, x: first.x - GAP_W, y: first.y, w: GAP_W, h: first.h });

            for (let i = 0; i < sibSlots.length - 1; i++) {
                const a = sibSlots[i];
                const b = sibSlots[i + 1];
                const x = a.x + a.w;
                const w2 = Math.max(GAP_W, b.x - x);
                gaps.push({ index: i + 1, x, y: a.y, w: w2, h: a.h });
            }

            const last = sibSlots[sibSlots.length - 1];
            gaps.push({ index: sibSlots.length, x: last.x + last.w, y: last.y, w: GAP_W, h: last.h });
        }

        return gaps;
    }, [dragSiblings, style]);

    const linkStrokeWidth = 4;

    return (
        <div
            ref={boardRef}
            className={[
                "relative",
                exportMode ? "overflow-visible rounded-none" : "border border-border h-full overflow-hidden rounded-xl",
            ].join(" ")}
        >
            <div className={exportMode ? "" : "h-full w-full overflow-auto p-3"}>
                <div ref={contentRef} className="origin-top-left" style={{ ...contentStyle, transformOrigin: "0 0" }}>
                    <LinksLayer slots={slots} edges={edges} stroke={stroke ?? "#000"} strokeWidth={linkStrokeWidth} />

                    {/* Drop gaps overlay */}
                    {dragSiblings && dropGaps.length > 0 ? (
                        <div className="absolute left-0 top-0" style={{ width: overlayW, height: overlayH }}>
                            {dropGaps.map((g) => {
                                const active =
                                    !!dropHint &&
                                    dropHint.parentId === dragSiblings.parentId &&
                                    dropHint.level === dragSiblings.level &&
                                    dropHint.index === g.index;

                                return (
                                    <div
                                        key={g.index}
                                        className="absolute z-40 pointer-events-auto"
                                        style={{ left: g.x, top: g.y, width: g.w, height: g.h }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDropHint({
                                                parentId: dragSiblings.parentId,
                                                level: dragSiblings.level,
                                                index: g.index,
                                            });
                                        }}
                                        onDragLeave={(e) => {
                                            const rel = e.relatedTarget as Node | null;
                                            if (rel && (e.currentTarget as HTMLElement).contains(rel)) return;
                                            if (active) clearHints();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const idx = g.index;
                                            clearHints();
                                            applyReorderAt(dragSiblings.parentId, idx);
                                        }}
                                    >
                                        {active ? (
                                            <div
                                                className="pointer-events-none absolute bg-black/60 rounded"
                                                style={
                                                    dragSiblings.level === "SUB"
                                                        ? {
                                                            left: 0,
                                                            right: 0,
                                                            top: "50%",
                                                            height: 2,
                                                            transform: "translateY(-50%)",
                                                        }
                                                        : {
                                                            top: 0,
                                                            bottom: 0,
                                                            left: "50%",
                                                            width: 2,
                                                            transform: "translateX(-50%)",
                                                        }
                                                }
                                            />
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}

                    {safeNodes.map((node) => {
                        if (node.id === ROOT_ID) return null;

                        const slot = slotById.get(node.id);
                        if (!slot) return null;

                        const isSelected = selectedId === node.id;
                        const parentId = parentById[node.id] ?? null;

                        const isKindOpen = kindEditor?.id === node.id;
                        const canDnD = Boolean(onReorderChildren) && parentId != null && !isKindOpen;

                        // Optionnel : mute les autres nodes pendant drag (pas nécessaire au fonctionnement)
                        const level = node.level;

                        const acceptDrop =
                            dragging != null &&
                            parentId != null &&
                            dragging.parentId === parentId &&
                            dragging.level === level;

                        const mutePointer = dragging != null && !acceptDrop && dragging.draggedId !== node.id;

                        return (
                            <div
                                key={node.id}
                                className={[
                                    "absolute cursor-pointer orbat-node",
                                    mutePointer ? "pointer-events-none" : "",
                                    isSelected ? "orbat-node--active" : "hover:ring-1",
                                ].join(" ")}
                                style={{
                                    left: slot.x,
                                    top: slot.y,
                                    width: slot.w,
                                    height: slot.h,
                                }}
                                draggable={canDnD}
                                onDragStart={(e) => {
                                    if (!canDnD || !parentId) return;
                                    e.dataTransfer?.setData("text/plain", node.id);
                                    e.dataTransfer?.setDragImage?.(e.currentTarget, 10, 10);
                                    dragRef.current = { parentId, draggedId: node.id, level: node.level };
                                    setDragging({ parentId, draggedId: node.id, level: node.level });
                                }}
                                onDragEnd={() => {
                                    dragRef.current = null;
                                    setDragging(null);
                                    clearHints();
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
                                    <div
                                        className="pointer-events-none absolute inset-x-0 top-1.5 text-center orbat-label"
                                        style={{ color: shape }}
                                    >
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
                                        className={[
                                            "absolute right-2 top-2 z-50 w-56 rounded-xl border border-black/20 p-2 shadow-sm",
                                            "bg-popover text-fg border-border",
                                            "ring-1 ring-black/5 dark:ring-white/10",
                                        ].join(" ")}
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
                                            className="ui-select h-9 w-full rounded-md border bg-control px-2 text-sm text-control-fg border-control-border focus:outline-none focus:ring-2 focus:ring-accent/30"
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
