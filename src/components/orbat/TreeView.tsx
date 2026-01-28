// src/components/orbat/TreeView.tsx
"use client";

import * as React from "react";
import type {
    OrbatNode,
    ParentByNodeId,
    ChildrenOrder,
    NodeId,
    NodeLevel,
} from "@/lib/orbat/types";

type LabelKey = "labelMain" | "labelTop" | "labelBottom";
type PatchKey = LabelKey | "kind" | "displayId";

type Props = {
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder?: ChildrenOrder;

    selectedId?: NodeId | null;
    onSelect?: (id: NodeId | null) => void;

    onAddChild?: (parentId: NodeId, levelHint?: NodeLevel) => void;
    onDelete?: (id: NodeId) => void;

    onUpdateNode?: (id: NodeId, patch: Partial<Pick<OrbatNode, PatchKey>>) => void;

    // reorder intra-parent
    onReorderChildren?: (parentId: NodeId, nextChildIds: NodeId[]) => void;
};

function labelOf(n: OrbatNode) {
    return n.displayId ?? n.labelMain ?? n.labelBottom ?? n.labelTop ?? n.id;
}

function buildNodesById(nodes: OrbatNode[]) {
    const m = new Map<NodeId, OrbatNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
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

function levelBadge(level: NodeLevel) {
    if (level === "LEAD") return "PL";
    if (level === "UNIT") return "U";
    return "SU";
}

function arrayInsertMove<T>(arr: T[], from: number, to: number) {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    const adj = from < to ? to - 1 : to;
    next.splice(adj, 0, item);
    return next;
}

function findAncestorUnitId(
    startId: NodeId | null | undefined,
    nodesById: Map<NodeId, OrbatNode>,
    parentById: ParentByNodeId
): NodeId | null {
    if (!startId) return null;
    let cur: NodeId | null = startId;
    while (cur) {
        const n = nodesById.get(cur);
        if (n?.level === "UNIT") return cur;
        cur = parentById[cur] ?? null;
    }
    return null;
}

/**
 * Styles basés sur tes tokens:
 * bg-control / bg-control-hover / bg-control-pressed
 * border-control-border / text-control-fg
 */
const rowBase =
    "w-full rounded-md border px-2 py-1 text-left transition-colors shadow-sm cursor-pointer " +
    "border-control-border text-control-fg";

const rowIdle = "bg-control hover:bg-control-hover";
const rowSelected =
    "bg-control-hover ring-1 ring-accent/30 border-control-border";

const chipClass =
    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border shadow-sm " +
    "border-control-border bg-control-hover text-[11px] font-semibold text-fg-muted";

const inputClass =
    "min-w-0 flex-1 rounded border px-1.5 py-0.5 text-sm transition " +
    "border-control-border bg-control text-control-fg " +
    "outline-none ring-2 ring-accent/10 focus:ring-accent/30";

const labelInputClass =
    "w-full rounded-md border px-2 py-1 text-sm transition " +
    "border-control-border bg-control text-control-fg " +
    "focus:outline-none focus:ring-2 focus:ring-accent/30";

const subtleLink = "text-xs underline text-fg-muted hover:text-fg";

const ROOT_PARENT_ID = "__ROOT__" as NodeId;

export default function TreeView({
    nodes,
    parentById,
    childrenOrder,
    selectedId,
    onSelect,
    onAddChild,
    onDelete,
    onUpdateNode,
    onReorderChildren,
}: Props) {
    const nodesById = React.useMemo(() => buildNodesById(nodes), [nodes]);
    const childrenMap = React.useMemo(
        () => buildChildrenMap(nodes, parentById),
        [nodes, parentById]
    );

    //  roots = uniquement les LEAD sans parent
    const roots = React.useMemo(() => {
        const raw = nodes
            .filter((n) => n.level === "LEAD" && parentById[n.id] == null)
            .map((n) => n.id);

        //  ordre stable basé sur childrenOrder.__ROOT__
        return stableOrder(ROOT_PARENT_ID, raw, childrenOrder);
    }, [nodes, parentById, childrenOrder]);

    const selectedUnitId = React.useMemo(
        () => findAncestorUnitId(selectedId ?? null, nodesById, parentById),
        [selectedId, nodesById, parentById]
    );

    // Inline edit
    const [editingId, setEditingId] = React.useState<NodeId | null>(null);
    const [draft, setDraft] = React.useState<string>("");

    function startEdit(id: NodeId) {
        const n = nodesById.get(id);
        if (!n) return;
        setEditingId(id);
        setDraft(n.displayId ?? "");
        onSelect?.(id);
    }

    function commitEdit(id: NodeId) {
        if (!onUpdateNode) {
            setEditingId(null);
            return;
        }
        const v = draft.trim();
        onUpdateNode(id, { displayId: v.length ? v : undefined });
        setEditingId(null);
    }

    function cancelEdit() {
        setEditingId(null);
    }

    React.useEffect(() => {
        if (editingId && selectedId !== editingId) setEditingId(null);
    }, [selectedId, editingId]);

    // DnD
    const dragRef = React.useRef<{ parentId: NodeId; draggedId: NodeId } | null>(null);
    const hoverRef = React.useRef<{ parentId: NodeId; dropIndex: number } | null>(null);

    const [dropHint, setDropHint] = React.useState<{
        id: NodeId;
        pos: "before" | "after";
    } | null>(null);

    function onDragStart(parentId: NodeId, draggedId: NodeId) {
        dragRef.current = { parentId, draggedId };
    }

    function clearDnDHints() {
        hoverRef.current = null;
        setDropHint(null);
    }

    function onDropIndex(parentId: NodeId, dropIndex: number, orderedKids: NodeId[]) {
        const ctx = dragRef.current;
        dragRef.current = null;

        if (!ctx) return;
        if (ctx.parentId !== parentId) return;

        const from = orderedKids.indexOf(ctx.draggedId);
        if (from === -1) return;

        const to = Math.max(0, Math.min(dropIndex, orderedKids.length));
        if (to === from) return;

        const next = arrayInsertMove(orderedKids, from, to);
        onReorderChildren?.(parentId, next);
    }

    function setLabel(id: NodeId, key: LabelKey, value: string | undefined) {
        if (!onUpdateNode) return;
        onUpdateNode(id, { [key]: value } as Partial<Pick<OrbatNode, PatchKey>>);
    }

    function labelControls(n: OrbatNode, isSelected: boolean) {
        if (!isSelected) return null;

        const canMain = n.kind === "unitBlufor";
        const hasMain = n.labelMain != null;
        const hasTop = n.labelTop != null;
        const hasBottom = n.labelBottom != null;

        return (
            <div className="ml-2 mt-1 flex flex-wrap items-center justify-around gap-x-3 gap-y-1">
                {onAddChild && n.level !== "SUB" ? (
                    <button
                        type="button"
                        className={subtleLink}
                        onClick={() => {
                            const hint = n.level === "LEAD" ? "UNIT" : "SUB";
                            onAddChild(n.id, hint);
                        }}
                    >
                        + Add child
                    </button>
                ) : null}

                {onUpdateNode ? (
                    <>
                        {canMain && !hasMain ? (
                            <button
                                type="button"
                                className={subtleLink}
                                onClick={() => {
                                    onSelect?.(n.id);
                                    setLabel(n.id, "labelMain", "");
                                }}
                                title="Add main label"
                            >
                                + Label
                            </button>
                        ) : null}

                        {!hasTop ? (
                            <button
                                type="button"
                                className={subtleLink}
                                onClick={() => {
                                    onSelect?.(n.id);
                                    setLabel(n.id, "labelTop", "");
                                }}
                                title="Add top label"
                            >
                                + Top
                            </button>
                        ) : null}

                        {!hasBottom ? (
                            <button
                                type="button"
                                className={subtleLink}
                                onClick={() => {
                                    onSelect?.(n.id);
                                    setLabel(n.id, "labelBottom", "");
                                }}
                                title="Add bottom label"
                            >
                                + Bottom
                            </button>
                        ) : null}
                    </>
                ) : null}

                {onDelete ? (
                    <button
                        type="button"
                        className="text-xs underline text-danger/80 hover:text-danger"
                        onClick={() => onDelete(n.id)}
                        title="Delete element"
                    >
                        Delete
                    </button>
                ) : null}
            </div>
        );
    }

    function labelEditors(n: OrbatNode, isSelected: boolean) {
        const isEditing = editingId === n.id;
        if (!isSelected || !onUpdateNode || isEditing) return null;

        const rows: Array<{ key: LabelKey; value: string }> = [];
        if (n.labelMain != null) rows.push({ key: "labelMain", value: n.labelMain });
        if (n.labelTop != null) rows.push({ key: "labelTop", value: n.labelTop });
        if (n.labelBottom != null) rows.push({ key: "labelBottom", value: n.labelBottom });

        if (rows.length === 0) return null;

        const chip =
            "inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-semibold " +
            "border-control-border bg-control-hover text-fg-muted";

        return (
            <div className="ml-2 mt-2 space-y-2">
                {rows.map((r) => (
                    <div key={r.key} className="flex items-center gap-2">
                        <span className={chip}>
                            {r.key === "labelMain" ? "MAIN" : r.key === "labelTop" ? "TOP" : "BOTTOM"}
                        </span>

                        <input
                            className={labelInputClass}
                            value={r.value}
                            placeholder={
                                r.key === "labelMain"
                                    ? "Main label"
                                    : r.key === "labelTop"
                                        ? "Top label"
                                        : "Bottom label"
                            }
                            title="Esc to remove label"
                            onChange={(e) => setLabel(n.id, r.key, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    e.preventDefault();
                                    setLabel(n.id, r.key, undefined);
                                }
                            }}
                        />

                        <button
                            type="button"
                            className={subtleLink}
                            onClick={() => setLabel(n.id, r.key, undefined)}
                            title="Remove label"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    const renderNode = (id: NodeId, parentId: NodeId | null): React.ReactNode => {
        const n = nodesById.get(id);
        if (!n) return null;

        const rawChildren = childrenMap.get(id) ?? [];
        const kidsAll = stableOrder(id, rawChildren, childrenOrder);

        const kids =
            n.level === "UNIT"
                ? id === selectedUnitId
                    ? kidsAll
                    : kidsAll.filter((cid) => nodesById.get(cid)?.level !== "SUB")
                : kidsAll;

        const isSelected = selectedId === id;
        const isEditing = editingId === id;

        const canDnD = Boolean(onReorderChildren) && parentId != null && !isEditing;

        //  siblings: parent normal => childrenMap; parent ROOT => roots (déjà ordonné)
        const siblings =
            parentId != null
                ? parentId === ROOT_PARENT_ID
                    ? roots
                    : stableOrder(parentId, childrenMap.get(parentId) ?? [], childrenOrder)
                : [];

        const showBefore = dropHint?.id === id && dropHint.pos === "before";
        const showAfter = dropHint?.id === id && dropHint.pos === "after";

        return (
            <li
                key={id}
                className="my-1"
                draggable={canDnD}
                onDragStart={() => {
                    if (!canDnD || !parentId) return;
                    onDragStart(parentId, id);
                }}
                onDragEnd={() => {
                    clearDnDHints();
                }}
                title={canDnD ? "Drag to reorder within same parent" : undefined}
            >
                <div
                    className="relative"
                    onDragLeave={(e) => {
                        if (!canDnD) return;
                        const rel = e.relatedTarget as Node | null;
                        if (rel && e.currentTarget.contains(rel)) return;
                        setDropHint((h) => (h?.id === id ? null : h));
                    }}
                    onDragOver={(e) => {
                        if (!canDnD || !parentId) return;
                        e.preventDefault();

                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const isAfter = y > rect.height / 2;

                        const overIndex = siblings.indexOf(id);
                        if (overIndex === -1) return;

                        const dropIndex = isAfter ? overIndex + 1 : overIndex;
                        hoverRef.current = { parentId, dropIndex };

                        setDropHint({ id, pos: isAfter ? "after" : "before" });
                    }}
                    onDrop={(e) => {
                        if (!canDnD || !parentId) return;
                        e.preventDefault();

                        const h = hoverRef.current;
                        clearDnDHints();

                        if (!h || h.parentId !== parentId) return;
                        onDropIndex(parentId, h.dropIndex, siblings);
                    }}
                >
                    {showBefore ? (
                        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] rounded bg-accent/70" />
                    ) : null}
                    {showAfter ? (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] rounded bg-accent/70" />
                    ) : null}

                    <button
                        type="button"
                        onClick={() => {
                            if (editingId === id) return;
                            onSelect?.(id);
                        }}
                        onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEdit(id);
                        }}
                        className={[
                            rowBase,
                            isSelected ? rowSelected : rowIdle,
                        ].join(" ")}
                    >
                        <span className="inline-flex w-full items-center gap-2">
                            <span className={chipClass}>{levelBadge(n.level)}</span>

                            {isEditing ? (
                                <input
                                    autoFocus
                                    className={inputClass}
                                    value={draft}
                                    placeholder={n.id}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            commitEdit(id);
                                        } else if (e.key === "Escape") {
                                            e.preventDefault();
                                            cancelEdit();
                                        }
                                    }}
                                    onBlur={() => commitEdit(id)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="font-medium">{labelOf(n)}</span>
                            )}

                            {!isEditing ? (
                                <span className="ml-auto shrink-0 text-xs text-fg-muted">
                                    ({n.kind})
                                </span>
                            ) : null}
                        </span>
                    </button>
                </div>

                {!isEditing ? (
                    <>
                        {labelControls(n, isSelected)}
                        {labelEditors(n, isSelected)}
                    </>
                ) : null}

                {kids.length > 0 ? (
                    <ul className="ml-5 mt-1 border-l border-border pl-3">
                        {kids.map((cid) => renderNode(cid, id))}
                    </ul>
                ) : null}
            </li>
        );
    };

    return (
        <div className="rounded-xl border border-border bg-surface-1 px-3 py-2">
            <div className="mb-2 text-sm font-semibold text-fg">Structure</div>

            {/*  roots : parentId="__ROOT__" pour activer le DnD */}
            <ul className="m-0 list-none p-0">
                {roots.map((id) => renderNode(id, ROOT_PARENT_ID))}
            </ul>
        </div>
    );
}
