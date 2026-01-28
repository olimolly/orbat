// src/components/orbat/OrbatEditorSidebar.tsx
"use client";

import * as React from "react";
import {
    type OrbatNode,
    type ParentByNodeId,
    type ChildrenOrder,
    type NodeId,
    type NodeLevel,
    type UnitKind,
    UNIT_KIND_LABEL,
} from "@/lib/orbat/types";
import TreeView from "./TreeView";

type Props = {
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder: ChildrenOrder;

    selectedId: NodeId | null;
    onSelect?: (id: NodeId | null) => void;

    setNodes?: React.Dispatch<React.SetStateAction<OrbatNode[]>>;
    setParentById?: React.Dispatch<React.SetStateAction<ParentByNodeId>>;
    setChildrenOrder?: React.Dispatch<React.SetStateAction<ChildrenOrder>>;
};

function nextId(prefix: string, nodes: OrbatNode[]) {
    const used = new Set(nodes.map((n) => n.id));
    for (let i = 1; i < 9999; i++) {
        const id = `${prefix}${i}`;
        if (!used.has(id)) return id;
    }
    return `${prefix}${Date.now()}`;
}

function buildNodesById(nodes: OrbatNode[]) {
    const m = new Map<string, OrbatNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
}

function parentOf(id: NodeId, parentById: ParentByNodeId): NodeId | null {
    const p = parentById[id];
    return p == null ? null : p;
}

function findAncestor(
    startId: NodeId,
    targetLevel: NodeLevel,
    nodesById: Map<string, OrbatNode>,
    parentById: ParentByNodeId
): NodeId | null {
    let cur: NodeId | null = startId;
    while (cur) {
        const n = nodesById.get(cur);
        if (n?.level === targetLevel) return cur;
        cur = parentOf(cur, parentById);
    }
    return null;
}

function buildChildrenMap(nodes: OrbatNode[], parentById: ParentByNodeId) {
    const children = new Map<string, string[]>();
    for (const n of nodes) children.set(n.id, []);
    for (const n of nodes) {
        const p = parentById[n.id];
        if (!p) continue;
        if (!children.has(p)) children.set(p, []);
        children.get(p)!.push(n.id);
    }
    return children;
}

type UndoSnapshot = {
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder: ChildrenOrder;
    selectedId: NodeId | null;
    message: string;
};

export default function OrbatEditorSidebar({
    nodes,
    parentById,
    childrenOrder,
    selectedId,
    onSelect,
    setNodes,
    setParentById,
    setChildrenOrder,
}: Props) {
    const nodesById = React.useMemo(() => buildNodesById(nodes), [nodes]);

    const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;

    const targetLeadId =
        selectedId ? findAncestor(selectedId, "LEAD", nodesById, parentById) : null;

    const targetUnitId =
        selectedId ? findAncestor(selectedId, "UNIT", nodesById, parentById) : null;

    const leadRoots = React.useMemo(() => {
        const res: string[] = [];
        for (const n of nodes) {
            if (n.level === "LEAD" && parentById[n.id] == null) res.push(n.id);
        }
        const ordered = childrenOrder.__ROOT__ ?? [];
        if (ordered.length === 0) return res;

        const set = new Set(ordered);
        const tail = res.filter((id) => !set.has(id));
        return [...ordered.filter((id) => res.includes(id)), ...tail];
    }, [nodes, parentById, childrenOrder.__ROOT__]);

    // ─────────────────────────────────────────────
    // UNDO (toast) : snapshot avant delete
    // ─────────────────────────────────────────────
    const [undo, setUndo] = React.useState<UndoSnapshot | null>(null);
    const undoTimerRef = React.useRef<number | null>(null);

    const canEdit = !!(onSelect && setNodes && setParentById && setChildrenOrder);
    const hasSelection = selectedId != null;

    const clearUndoSoon = React.useCallback((ms = 6000) => {
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = window.setTimeout(() => setUndo(null), ms);
    }, []);

    const pushUndo = React.useCallback(
        (message: string) => {
            setUndo({
                nodes,
                parentById,
                childrenOrder,
                selectedId,
                message,
            });
            clearUndoSoon();
        },
        [nodes, parentById, childrenOrder, selectedId, clearUndoSoon]
    );

    const handleUndo = React.useCallback(() => {
        if (!undo) return;
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;

        setNodes?.(undo.nodes);
        setParentById?.(undo.parentById);
        setChildrenOrder?.(undo.childrenOrder);
        onSelect?.(undo.selectedId);

        setUndo(null);
    }, [undo, setNodes, setParentById, setChildrenOrder, onSelect]);

    React.useEffect(() => {
        return () => {
            if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        };
    }, []);

    // ─────────────────────────────────────────────
    // Mutations
    // ─────────────────────────────────────────────
    const updateNode = React.useCallback(
        (
            id: NodeId,
            patch: Partial<
                Pick<OrbatNode, "displayId" | "labelMain" | "labelTop" | "labelBottom" | "kind">
            >
        ) => {
            setNodes?.((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
        },
        [setNodes]
    );

    const addChild = React.useCallback(
        (parentId: NodeId, level: NodeLevel) => {
            if (!setNodes || !setParentById || !setChildrenOrder || !onSelect) return;

            const prefix = level === "LEAD" ? "L" : level === "UNIT" ? "U" : "S";
            const id = nextId(prefix, nodes);

            const n: OrbatNode = { id, displayId: id, level, kind: "unitBlufor" };

            setNodes((prev) => [...prev, n]);
            setParentById((prev) => ({ ...prev, [id]: parentId }));
            setChildrenOrder((prev) => ({
                ...prev,
                [parentId]: [...(prev[parentId] ?? []), id],
            }));

            onSelect(id);
        },
        [nodes, setNodes, setParentById, setChildrenOrder, onSelect]
    );

    const addLead = React.useCallback(() => {
        if (!setNodes || !setParentById || !setChildrenOrder || !onSelect) return;

        const id = nextId("L", nodes);

        const n: OrbatNode = {
            id,
            displayId: id,
            level: "LEAD",
            kind: "unitBlufor",
            labelMain: "PL",
        };

        setNodes((prev) => [...prev, n]);
        setParentById((prev) => ({ ...prev, [id]: null }));
        setChildrenOrder((prev) => ({
            ...prev,
            __ROOT__: [...(prev.__ROOT__ ?? []), id],
        }));

        onSelect(id);
    }, [nodes, setNodes, setParentById, setChildrenOrder, onSelect]);

    const deleteCascade = React.useCallback(
        (startId: NodeId) => {
            if (!setNodes || !setParentById || !setChildrenOrder || !onSelect) return 0;

            const childrenMap = buildChildrenMap(nodes, parentById);

            const toDelete = new Set<string>();
            const stack = [startId];
            while (stack.length) {
                const cur = stack.pop()!;
                toDelete.add(cur);
                for (const k of childrenMap.get(cur) ?? []) stack.push(k);
            }

            setNodes((prev) => prev.filter((n) => !toDelete.has(n.id)));

            setParentById((prev) => {
                const next: ParentByNodeId = { ...prev };
                for (const del of toDelete) delete next[del];
                for (const k of Object.keys(next)) {
                    if (next[k] && toDelete.has(next[k]!)) next[k] = null;
                }
                return next;
            });

            setChildrenOrder((prev) => {
                const next: ChildrenOrder = { ...prev };
                for (const del of toDelete) delete next[del];
                for (const key of Object.keys(next)) {
                    next[key] = (next[key] ?? []).filter((cid) => !toDelete.has(cid));
                }
                next.__ROOT__ = (next.__ROOT__ ?? []).filter((id) => !toDelete.has(id));
                return next;
            });

            if (selectedId && toDelete.has(selectedId)) onSelect(null);
            return toDelete.size;
        },
        [nodes, parentById, selectedId, setNodes, setParentById, setChildrenOrder, onSelect]
    );

    const reorderChildren = React.useCallback(
        (parentId: NodeId, nextChildIds: NodeId[]) => {
            setChildrenOrder?.((prev) => ({
                ...prev,
                [parentId]: nextChildIds,
            }));
        },
        [setChildrenOrder]
    );

    const setSelectedKind = React.useCallback(
        (nextKind: UnitKind) => {
            if (!selectedId) return;
            setNodes?.((prev) =>
                prev.map((n) => (n.id === selectedId ? { ...n, kind: nextKind } : n))
            );
        },
        [selectedId, setNodes]
    );

    // ─────────────────────────────────────────────
    // +/- actions (avec undo)
    // ─────────────────────────────────────────────
    const canLeadPlus = true;
    const canLeadMinus = hasSelection && targetLeadId != null && leadRoots.length > 1;

    const canUnitPlus = targetLeadId != null;
    const canUnitMinus = hasSelection && targetUnitId != null;

    const canSubPlus = targetUnitId != null;
    const canSubMinus = hasSelection && selectedNode?.level === "SUB";

    const handleLeadPlus = React.useCallback(() => addLead(), [addLead]);

    const handleLeadMinus = React.useCallback(() => {
        if (!canLeadMinus || !targetLeadId) return;
        pushUndo(`Deleted ${targetLeadId} (LEAD)`);
        const count = deleteCascade(targetLeadId);
        setUndo((u) =>
            u ? { ...u, message: `Deleted ${targetLeadId} (LEAD) — ${count} node(s)` } : u
        );
        clearUndoSoon();
    }, [canLeadMinus, targetLeadId, pushUndo, deleteCascade, clearUndoSoon]);

    const handleUnitPlus = React.useCallback(() => {
        if (!canUnitPlus || !targetLeadId) return;
        addChild(targetLeadId, "UNIT");
    }, [canUnitPlus, targetLeadId, addChild]);

    const handleUnitMinus = React.useCallback(() => {
        if (!canUnitMinus || !targetUnitId) return;
        pushUndo(`Deleted ${targetUnitId} (UNIT)`);
        const count = deleteCascade(targetUnitId);
        setUndo((u) =>
            u ? { ...u, message: `Deleted ${targetUnitId} (UNIT) — ${count} node(s)` } : u
        );
        clearUndoSoon();
    }, [canUnitMinus, targetUnitId, pushUndo, deleteCascade, clearUndoSoon]);

    const handleSubPlus = React.useCallback(() => {
        if (!canSubPlus || !targetUnitId) return;
        addChild(targetUnitId, "SUB");
    }, [canSubPlus, targetUnitId, addChild]);

    const handleSubMinus = React.useCallback(() => {
        if (!canSubMinus || !selectedNode) return;
        const id = selectedNode.id;
        pushUndo(`Deleted ${id} (SUB)`);
        const count = deleteCascade(id);
        setUndo((u) => (u ? { ...u, message: `Deleted ${id} (SUB) — ${count} node(s)` } : u));
        clearUndoSoon();
    }, [canSubMinus, selectedNode, pushUndo, deleteCascade, clearUndoSoon]);

    // Keyboard delete/backspace (stable deps)
    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (!canEdit) return;

            const el = e.target as HTMLElement | null;
            const tag = el?.tagName?.toLowerCase();
            const isTyping =
                tag === "input" ||
                tag === "textarea" ||
                (el as unknown as { isContentEditable?: boolean })?.isContentEditable;

            if (isTyping) return;

            if (e.key !== "Delete" && e.key !== "Backspace") return;
            if (!hasSelection) return;

            if (selectedNode?.level === "SUB") {
                e.preventDefault();
                handleSubMinus();
                return;
            }
            if (targetUnitId) {
                e.preventDefault();
                handleUnitMinus();
                return;
            }
            if (targetLeadId) {
                e.preventDefault();
                handleLeadMinus();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [
        canEdit,
        hasSelection,
        selectedNode?.level,
        targetUnitId,
        targetLeadId,
        handleSubMinus,
        handleUnitMinus,
        handleLeadMinus,
    ]);

    function btnClass(enabled: boolean) {
        return [
            "inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm font-semibold",
            "transition-colors cursor-pointer",
            enabled
                ? [
                    // LIGHT: blanc net + bordure soft
                    "bg-control text-control-fg border-control-border",
                    "hover:bg-control-hover hover:border-black/35",
                    "active:bg-control-pressed",
                    // DARK: “du blanc qui sort” (voile)
                    "dark:hover:border-white/24",
                ].join(" ")
                : [
                    "cursor-not-allowed opacity-50",
                    "bg-surface-1 text-fg-muted border-border",
                ].join(" "),
        ].join(" ");
    }



    return (
        <div className="flex flex-col gap-3">
            {/* Actions compactes +/- */}
            <div className="rounded-xl border border-border bg-surface-1 py-2">
                <div className="flex flex-row">
                    <div className="flex flex-col flex-auto items-center justify-between gap-1">
                        <div className="text-sm text-fg">
                            PLATOON{" "}
                            <span className="text-xs text-fg-muted">{targetLeadId ?? "—"}</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                className={btnClass(canLeadMinus && canEdit)}
                                onClick={handleLeadMinus}
                                disabled={!canLeadMinus || !canEdit}
                            >
                                −
                            </button>
                            <button
                                type="button"
                                className={btnClass(canLeadPlus && canEdit)}
                                onClick={handleLeadPlus}
                                disabled={!canLeadPlus || !canEdit}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col flex-auto items-center justify-between gap-1">
                        <div className="text-sm text-fg">
                            SQUAD{" "}
                            <span className="text-xs text-fg-muted">
                                ({targetLeadId ?? "—"} / unit: {targetUnitId ?? "—"})
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                className={btnClass(canUnitMinus && canEdit)}
                                onClick={handleUnitMinus}
                                disabled={!canUnitMinus || !canEdit}
                            >
                                −
                            </button>
                            <button
                                type="button"
                                className={btnClass(canUnitPlus && canEdit)}
                                onClick={handleUnitPlus}
                                disabled={!canUnitPlus || !canEdit}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col flex-auto items-center justify-between gap-1">
                        <div className="text-sm text-fg">
                            TEAM{" "}
                            <span className="text-xs text-fg-muted">({targetUnitId ?? "—"})</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                className={btnClass(canSubMinus && canEdit)}
                                onClick={handleSubMinus}
                                disabled={!canSubMinus || !canEdit}
                            >
                                −
                            </button>
                            <button
                                type="button"
                                className={btnClass(canSubPlus && canEdit)}
                                onClick={handleSubPlus}
                                disabled={!canSubPlus || !canEdit}
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tree view */}
            <TreeView
                nodes={nodes}
                parentById={parentById}
                childrenOrder={childrenOrder}
                selectedId={selectedId}
                onSelect={canEdit ? onSelect : undefined}
                onAddChild={
                    canEdit
                        ? (parentId, hint) => {
                            const p = nodesById.get(parentId);
                            if (!p) return;
                            if (p.level === "SUB") return;

                            const level: NodeLevel = hint ?? (p.level === "LEAD" ? "UNIT" : "SUB");
                            addChild(parentId, level);
                        }
                        : undefined
                }
                onDelete={
                    canEdit
                        ? (id) => {
                            const n = nodesById.get(id);
                            if (!n) return;

                            pushUndo(`Deleted ${id} (${n.level})`);
                            const count = deleteCascade(id);
                            setUndo((u) =>
                                u ? { ...u, message: `Deleted ${id} (${n.level}) — ${count} node(s)` } : u
                            );
                            clearUndoSoon();
                        }
                        : undefined
                }
                onUpdateNode={canEdit ? updateNode : undefined}
                onReorderChildren={canEdit ? reorderChildren : undefined}
            />

            {/* Inspector (Kind) */}
            <div className="rounded-xl border border-border bg-surface-1 p-2 px-3">
                <div className="flex items-baseline justify-between">
                    <div className="text-sm font-semibold text-fg">Selector</div>
                    <div className="text-xs font-semibold text-fg-muted">Kind / Type of SVG</div>
                </div>

                <label className="mt-2 grid gap-1">
                    <select
                        title="Click a node in the tree, then change its kind here."
                        className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-fg disabled:opacity-50"
                        disabled={!selectedNode || !canEdit}
                        value={selectedNode?.kind ?? "unitBlufor"}
                        onChange={(e) => setSelectedKind(e.target.value as UnitKind)}
                    >
                        {(Object.keys(UNIT_KIND_LABEL) as UnitKind[]).map((k) => (
                            <option key={k} value={k}>
                                {UNIT_KIND_LABEL[k]}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Toast UNDO */}
            {undo ? (
                <div className="sticky bottom-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 p-3 shadow-sm">
                        <div className="text-sm text-fg">
                            {undo.message} <span className="text-xs text-fg-muted">(Undo available)</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-fg hover:bg-surface-3"
                                onClick={handleUndo}
                                disabled={!canEdit}
                            >
                                Undo
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm font-semibold text-fg-muted hover:text-fg"
                                onClick={() => setUndo(null)}
                                title="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );

}
