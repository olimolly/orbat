// src/lib/orbat/tree.ts
import type { ChildrenOrder, NodeId, OrbatNode, ParentByNodeId } from "@/lib/orbat/types";

/**
 * Map<parentId, childIds[]>
 * (inclut une entrée vide pour chaque node existant)
 */
export function buildChildrenMap(nodes: OrbatNode[], parentById: ParentByNodeId) {
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

/**
 * Applique childrenOrder[parentId] si présent, sinon garde rawChildren.
 * Ajoute en "tail" les enfants non listés dans l'order.
 */
export function stableOrder(
    parentId: NodeId,
    rawChildren: NodeId[],
    childrenOrder?: ChildrenOrder
): NodeId[] {
    const ordered = childrenOrder?.[parentId];
    if (!ordered?.length) return rawChildren;

    const set = new Set(ordered);
    const tail = rawChildren.filter((id) => !set.has(id));
    return [...ordered.filter((id) => rawChildren.includes(id)), ...tail];
}

/**
 * Renvoie les siblings d'un parent filtrés par level, puis ordonnés.
 * -> utilisé par OrbatBoard DnD, puis TreeView plus tard.
 */
export function siblingsOfLevel(
    parentId: NodeId,
    level: OrbatNode["level"],
    childrenMap: Map<NodeId, NodeId[]>,
    nodesById: Map<NodeId, OrbatNode>,
    childrenOrder?: ChildrenOrder
): NodeId[] {
    const raw = (childrenMap.get(parentId) ?? []).filter((id) => nodesById.get(id)?.level === level);
    return stableOrder(parentId, raw, childrenOrder);
}
