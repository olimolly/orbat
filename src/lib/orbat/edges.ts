export type PortSide = "top" | "bottom" | "left" | "right" | "bottomLeft";

export type ViaPoint = {
    x: number;
    y: number;
    /**
     * Si true, LinksLayer peut dessiner un petit carré à cette jonction (style ORBAT).
     */
    node?: boolean;
};

export type EdgeEndpoint = {
    slotId: string; // référence Slot.id
    side: PortSide; // où on sort/entre sur le slot
};

export type Edge = {
    id: string;
    from: EdgeEndpoint;
    to: EdgeEndpoint;

    /**
     * Points intermédiaires pour forcer un routage orthogonal (angles droits).
     * Ex: tronc -> jonction (T) -> barre -> descente
     */
    via?: ViaPoint[];
};
