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
import { ROOT_ID } from "@/lib/orbat/types";
import { buildChildrenMap, stableOrder } from "@/lib/orbat/tree";

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

    // Reorder happens on OrbatBoard only (TreeView just reflects that)
    onReorderChildren?: (parentId: NodeId, nextChildIds: NodeId[]) => void;
    enableTreeDnD?: boolean;
};

function labelOf(n: OrbatNode) {
    return n.displayId ?? n.labelMain ?? n.labelBottom ?? n.labelTop ?? n.id;
}

function buildNodesById(nodes: OrbatNode[]) {
    const m = new Map<NodeId, OrbatNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
}

function levelBadge(level: NodeLevel) {
    if (level === "ROOT") return "R";
    if (level === "LEAD") return "PL";
    if (level === "UNIT") return "U";
    return "SU";
}

/** Styles (obsolète-like) */
const rowBase =
    "w-full rounded-md border px-2 py-1 text-left transition-colors shadow-sm cursor-pointer " +
    "border-control-border text-control-fg";
const rowIdle = "bg-control hover:bg-control-hover";
const rowSelected = "bg-control-hover ring-1 ring-accent/30 border-control-border";

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

const miniBtn =
    "h-7 w-9 rounded-md border text-sm font-bold transition-colors " +
    "bg-control text-control-fg border-control-border " +
    "hover:bg-control-hover active:bg-control-pressed " +
    "hover:border-black/35 dark:hover:border-white/24 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

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
    enableTreeDnD,
}: Props) {
    const safeNodes = React.useMemo(() => (Array.isArray(nodes) ? nodes : []), [nodes]);
    const nodesById = React.useMemo(() => buildNodesById(safeNodes), [safeNodes]);
    const childrenMap = React.useMemo(
        () => buildChildrenMap(safeNodes, parentById),
        [safeNodes, parentById]
    );

    // Accordion par parent : pour chaque parent, un seul enfant "ouvert"
    type OpenChildByParent = Record<NodeId, NodeId | null>;

    const [openChildByParent, setOpenChildByParent] = React.useState<OpenChildByParent>(() => ({
        [ROOT_ID]: null,
    }));

    // Inline rename
    const [editingId, setEditingId] = React.useState<NodeId | null>(null);
    const [draft, setDraft] = React.useState("");

    React.useEffect(() => {
        if (editingId && selectedId !== editingId) setEditingId(null);
    }, [selectedId, editingId]);

    // click timers (single click vs dbl click)
    const clickTimersRef = React.useRef<Map<NodeId, number>>(new Map());

    React.useEffect(() => {
        const timers = clickTimersRef.current; // capture stable

        return () => {
            for (const t of timers.values()) window.clearTimeout(t);
            timers.clear();
        };
    }, []);


    function clearClickTimer(id: NodeId) {
        const t = clickTimersRef.current.get(id);
        if (t != null) {
            window.clearTimeout(t);
            clickTimersRef.current.delete(id);
        }
    }

    function scheduleSingleClick(id: NodeId, fn: () => void) {
        clearClickTimer(id);
        const t = window.setTimeout(() => {
            clickTimersRef.current.delete(id);
            fn();
        }, 60);
        clickTimersRef.current.set(id, t);
    }

    function orderedKids(parentId: NodeId) {
        const raw = childrenMap.get(parentId) ?? [];
        return stableOrder(parentId, raw, childrenOrder);
    }

    function isExpanded(nodeId: NodeId, parentId: NodeId | null): boolean {
        if (nodeId === ROOT_ID) return true;
        if (!parentId) return false;
        return openChildByParent[parentId] === nodeId;
    }

    function ensureExpanded(nodeId: NodeId, parentId: NodeId | null) {
        if (!parentId) return;
        setOpenChildByParent((prev) => {
            if (prev[parentId] === nodeId) return prev;
            return { ...prev, [parentId]: nodeId };
        });
    }


    // Quand selectedId change (clic dans OrbatBoard), ouvrir toute la chaîne ROOT -> ... -> selected
    React.useEffect(() => {
        if (!selectedId) return;

        setOpenChildByParent((prev): OpenChildByParent => {
            const next: OpenChildByParent = { ...prev };

            // ROOT doit exister
            if (!(ROOT_ID in next)) next[ROOT_ID] = null;

            let child: NodeId | null = selectedId;

            while (child && child !== ROOT_ID) {
                const parent: NodeId = (parentById[child] ?? ROOT_ID) as NodeId;
                next[parent] = child;
                child = parent;
            }

            return next;
        });
    }, [selectedId, parentById]);

    React.useEffect(() => {
        if (!selectedId) return;

        // laisse React rendre l'arbre "ouvert" avant de scroller
        const raf = window.requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-node-id="${selectedId}"]`);
            el?.scrollIntoView({ block: "nearest", inline: "nearest" });
        });

        return () => window.cancelAnimationFrame(raf);
    }, [selectedId, openChildByParent]);


    function startEdit(id: NodeId) {
        const n = nodesById.get(id);
        if (!n || !onUpdateNode) return;
        setEditingId(id);
        setDraft(n.displayId ?? "");
        onSelect?.(id);
    }

    function commitEdit(id: NodeId) {
        const v = draft.trim();
        setEditingId(null);
        if (!onUpdateNode) return;
        onUpdateNode(id, { displayId: v.length ? v : undefined });
    }

    function cancelEdit() {
        setEditingId(null);
    }

    function setLabel(id: NodeId, key: LabelKey, value: string | undefined) {
        if (!onUpdateNode) return;
        onUpdateNode(id, { [key]: value } as Partial<Pick<OrbatNode, PatchKey>>);
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

        const kids = orderedKids(id);
        const hasChildren = kids.length > 0;
        const open = isExpanded(id, parentId);

        const isSelected = selectedId === id;
        const isEditing = editingId === id;

        const canRemove = Boolean(onDelete) && id !== ROOT_ID;
        const canAddChild = Boolean(onAddChild) && n.level !== "SUB";

        // Hint: reorder is on OrbatBoard
        const showReorderHint = Boolean(onReorderChildren) && parentId != null && !isEditing;

        const showAddMain = isSelected && Boolean(onUpdateNode) && n.kind === "unitBlufor" && n.labelMain == null;
        const showAddTop = isSelected && Boolean(onUpdateNode) && n.labelTop == null;
        const showAddBottom = isSelected && Boolean(onUpdateNode) && n.labelBottom == null;

        return (
            <li key={id} className="my-1" data-node-id={id}>
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (editingId === id) return;

                                scheduleSingleClick(id, () => {
                                    onSelect?.(id);
                                    if (hasChildren) ensureExpanded(id, parentId);
                                });
                            }}
                            onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                clearClickTimer(id);
                                startEdit(id);
                            }}
                            className={[rowBase, isSelected ? rowSelected : rowIdle, "select-none"].join(" ")}
                            title={showReorderHint ? "Reorder on board (drag & drop)" : undefined}
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
                                    <span className="ml-auto shrink-0 text-xs text-fg-muted">({n.kind})</span>
                                ) : null}

                            </span>
                        </button>

                        {!isEditing ? (
                            <>
                                {canRemove ? (
                                    <button type="button" className={miniBtn} onClick={() => onDelete?.(id)} title="Remove">
                                        −
                                    </button>
                                ) : null}

                                {canAddChild ? (
                                    <button
                                        type="button"
                                        className={miniBtn}
                                        onClick={() => {
                                            const hint: NodeLevel =
                                                n.level === "ROOT" ? "LEAD" : n.level === "LEAD" ? "UNIT" : "SUB";
                                            onAddChild?.(id, hint);

                                            ensureExpanded(id, parentId);
                                        }}
                                        title="Add child"
                                    >
                                        +
                                    </button>
                                ) : null}
                            </>
                        ) : null}
                    </div>

                    {isSelected && !isEditing ? (
                        <div className="ml-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {showAddMain ? (
                                <button type="button" className={subtleLink} onClick={() => setLabel(id, "labelMain", "")}>
                                    + Label
                                </button>
                            ) : null}
                            {showAddTop ? (
                                <button type="button" className={subtleLink} onClick={() => setLabel(id, "labelTop", "")}>
                                    + Top
                                </button>
                            ) : null}
                            {showAddBottom ? (
                                <button type="button" className={subtleLink} onClick={() => setLabel(id, "labelBottom", "")}>
                                    + Bottom
                                </button>
                            ) : null}

                            {canRemove ? (
                                <button
                                    type="button"
                                    className="text-xs underline text-danger/80 hover:text-danger"
                                    onClick={() => onDelete?.(id)}
                                    title="Delete element"
                                >
                                    Delete
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    {!isEditing ? labelEditors(n, isSelected) : null}

                    {kids.length > 0 && open ? (
                        <ul className="ml-5 mt-1 border-l border-border pl-3">
                            {kids.map((cid) => renderNode(cid, id))}
                        </ul>
                    ) : null}
                </div>
            </li>
        );
    };

    return (
        <div className="rounded-xl border border-border bg-surface-1 px-3 py-2">
            <div className="mb-2 text-sm font-semibold text-fg">Structure</div>
            <ul className="m-0 list-none p-0">{renderNode(ROOT_ID, null)}</ul>
        </div>
    );
}
