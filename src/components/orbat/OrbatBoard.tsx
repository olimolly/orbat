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
    subOffsetX: 0,
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

    const childrenMap = React.useMemo(
        () => buildChildrenMap(safeNodes, parentById),
        [safeNodes, parentById]
    );

    const { slots, edges, computedBoard, slotById } = React.useMemo(() => {
        const nodesByIdLocal = new Map<string, OrbatNode>();
        for (const n of safeNodes) nodesByIdLocal.set(n.id, n);

        // 1) LEAD ids (enfants de ROOT_ID)
        const leadRoots: string[] = [];
        for (const n of safeNodes) {
            if (n.id === ROOT_ID) continue;
            if (n.level === "LEAD" && parentById[n.id] === ROOT_ID) leadRoots.push(n.id);
        }

        const leadIds =
            childrenOrder?.[ROOT_ID]?.length ? childrenOrder[ROOT_ID] : leadRoots;

        // 2) UNIT groups per LEAD
        const unitGroups: string[][] = leadIds.map((leadId) => {
            const raw = (childrenMap.get(leadId) ?? []).filter((id) => nodesByIdLocal.get(id)?.level === "UNIT");
            const ordered = stableOrder(leadId, raw, childrenOrder);
            return ordered;
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

        const leadsNeededW =
            style.marginX * 2 + leadIds.length * style.nodeW + Math.max(0, leadIds.length - 1) * style.colGap;

        const autoW = Math.max(
            680,
            unitsContentW + style.subOffsetX + style.marginX * 2,
            leadsNeededW
        );

        // 4) slots
        const slots: Slot[] = [];
        const slotById = new Map<string, Slot>();

        const yLead = style.marginTop;
        const yUnit = style.marginTop + style.nodeH + style.rowGap;

        // Units centered as one big content block (avec groupGap entre groups)
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

        // LEAD placement:
        // - si lead a des units => center au-dessus des units
        // - sinon => pack à droite (ordre leadIds) sans superposition
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

            // avoid overlap
            if (collides(lx, usedLeadX)) {
                // try shift right then left
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

        // 7) height
        let maxBottom = 0;
        for (const s of slots) maxBottom = Math.max(maxBottom, s.y + s.h);

        const padBottom = exportMode ? 40 : 218;
        const autoH = maxBottom + padBottom;

        // ─────────────────────────────────────────────
        // TRIM bbox (export only) : supprime le vide à droite/gauche/haut
        // ─────────────────────────────────────────────
        let boardW = autoW;
        let boardH = autoH;

        if (exportMode && slots.length > 0) {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;

            // slots bbox
            for (const s of slots) {
                minX = Math.min(minX, s.x);
                maxX = Math.max(maxX, s.x + s.w);
                minY = Math.min(minY, s.y);
                maxY = Math.max(maxY, s.y + s.h);
            }

            // edges bbox (via points)
            for (const e of edges) {
                if (!e.via) continue;
                for (const p of e.via) {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                }
            }

            const PAD = 0; // marge de sécurité pour stroke/antialias

            // shift tout pour commencer à PAD
            const dx = minX - PAD;
            const dy = minY - PAD;

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

                boardW = Math.ceil((maxX - minX) + PAD * 2);
                boardH = Math.ceil((maxY - minY) + PAD * 2);
            }
        }

        return {
            slots,
            edges,
            slotById,
            computedBoard: { w: boardW, h: boardH },
        };

    }, [safeNodes, parentById, childrenOrder, style, exportMode, childrenMap]);

    const w = boardW ?? computedBoard.w;
    const h = boardH ?? computedBoard.h;

    React.useEffect(() => {
        onBoardSize?.({ w, h });
    }, [w, h, onBoardSize]);

    // ─────────────────────────────────────────────
    // DnD
    // ─────────────────────────────────────────────
    const dragRef = React.useRef<{ parentId: NodeId; draggedId: NodeId } | null>(null);
    const hoverRef = React.useRef<{ overId: NodeId; pos: "before" | "after" } | null>(null);

    const [dragging, setDragging] = React.useState<{
        parentId: NodeId;
        draggedId: NodeId;
        level: OrbatNode["level"];
    } | null>(null);

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

    function siblingsOf(parentId: NodeId, level: OrbatNode["level"]): NodeId[] {
        const raw = (childrenMap.get(parentId) ?? []).filter((id) => {
            const n = nodesById.get(id);
            return n?.level === level;
        });

        const ordered = childrenOrder?.[parentId];
        if (!ordered?.length) return raw;

        const orderedFiltered = ordered.filter((id) => raw.includes(id));
        const set = new Set(orderedFiltered);
        const tail = raw.filter((id) => !set.has(id));
        return [...orderedFiltered, ...tail];
    }

    function applyReorder(parentId: NodeId, overId: NodeId, pos: "before" | "after") {
        if (!onReorderChildren) return;

        const ctx = dragRef.current;
        dragRef.current = null;

        if (!ctx) return;
        if (ctx.parentId !== parentId) return;
        if (!dragging) return;

        const sibs = siblingsOf(parentId, dragging.level);
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
            ? { transform: `scale(${scale})`, width: w, height: h }
            : { transform: `scale(${scale})`, width: w / scale, height: h / scale };

    const linkStrokeWidth = 4;
    const linkPad = exportMode ? 0 : Math.ceil(linkStrokeWidth * 2);

    return (
        <div
            ref={boardRef}
            className={[
                "relative",
                exportMode ? "overflow-visible rounded-none" : "border border-border h-full overflow-hidden rounded-xl",
            ].join(" ")}
        >
            <div className={exportMode ? "" : "h-full w-full overflow-auto p-3"}>
                <div ref={contentRef} className="origin-center" style={contentStyle}>
                    <LinksLayer
                        slots={slots}
                        edges={edges}
                        stroke={stroke ?? "#000"}
                        strokeWidth={linkStrokeWidth}
                        pad={linkPad}
                    />

                    {safeNodes.map((node) => {
                        if (node.id === ROOT_ID) return null;

                        const slot = slotById.get(node.id);
                        if (!slot) return null;

                        const isSelected = selectedId === node.id;
                        const parentId = parentById[node.id] ?? null;

                        const hint = dropHint?.id === node.id ? dropHint.pos : null;

                        const isKindOpen = kindEditor?.id === node.id;
                        const canDnD = Boolean(onReorderChildren) && parentId != null && !isKindOpen;

                        const level = node.level;

                        const acceptDrop =
                            canDnD &&
                            dragging != null &&
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
                                onDragStart={() => {
                                    if (!canDnD || !parentId) return;
                                    dragRef.current = { parentId, draggedId: node.id };
                                    setDragging({ parentId, draggedId: node.id, level: node.level });
                                }}
                                onDragEnd={() => {
                                    dragRef.current = null;
                                    setDragging(null);
                                    clearHints();
                                }}
                                onDragOver={(e) => {
                                    if (!acceptDrop || !parentId) return;
                                    e.preventDefault();

                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

                                    //  IMPORTANT: axe selon la direction visuelle
                                    // LEAD/UNIT: rangée horizontale => X
                                    // SUB: pile verticale => Y
                                    const pos: "before" | "after" =
                                        node.level === "SUB"
                                            ? e.clientY - rect.top > rect.height / 2
                                                ? "after"
                                                : "before"
                                            : e.clientX - rect.left > rect.width / 2
                                                ? "after"
                                                : "before";

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
                                    if (!acceptDrop || !parentId) return;
                                    e.preventDefault();

                                    const pos =
                                        hoverRef.current?.overId === node.id ? hoverRef.current.pos : null;

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

                                <OrbatSVG
                                    kind={node.kind}
                                    bg={bg}
                                    stroke={stroke}
                                    shape={shape}
                                    className="block h-full w-full"
                                />

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
                                            {(Object.entries(UNIT_KIND_LABEL) as [UnitKind, string][]).map(
                                                ([k, label]) => (
                                                    <option key={k} value={k}>
                                                        {label}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <div className="mt-2 text-[11px] opacity-70">
                                            Esc ou clic dehors pour fermer.
                                        </div>
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
