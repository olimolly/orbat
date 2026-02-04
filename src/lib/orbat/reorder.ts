import type { ChildrenOrder, NodeId, NodeLevel, OrbatNode, ParentByNodeId } from "@/lib/orbat/types";
import { buildChildrenMap, stableOrder } from "@/lib/orbat/tree";

function arrayInsertMove<T>(arr: T[], from: number, to: number) {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    const adj = from < to ? to - 1 : to;
    next.splice(adj, 0, item);
    return next;
}

/**
 * Réordonne uniquement les siblings d'un `level` sous `parentId`,
 * MAIS retourne une liste COMPLETE de children (préserve les autres levels).
 */
export function reorderWithinLevelComplete(
    nodes: OrbatNode[],
    parentById: ParentByNodeId,
    childrenOrder: ChildrenOrder,
    parentId: NodeId,
    level: NodeLevel,
    draggedId: NodeId,
    dropIndex: number
): NodeId[] | null {
    const nodesById = new Map<NodeId, OrbatNode>(nodes.map(n => [n.id, n]));
    const childrenMap = buildChildrenMap(nodes, parentById);

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
