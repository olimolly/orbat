// lib/orbat/types.ts
export type UnitKind =
    | "antiAir"
    | "antiTank"
    | "artillery"
    | "helicopter"
    | "hQ"
    | "infantry"
    | "maintenance"
    | "mechanized"
    | "mechInfantry"
    | "mechRecon"
    | "medical"
    | "mortar"
    | "motorized"
    | "motorizedRecon"
    | "plane"
    | "recon"
    | "supply"
    | "uav"
    | "uavAir"
    | "uavSwarm"
    | "ugv"
    | "unitBlufor";

export const UNIT_KIND_LABEL: Record<UnitKind, string> = {
    antiAir: "Anti-air",
    antiTank: "Anti-tank",
    artillery: "Artillery",
    helicopter: "Helicopter",
    hQ: "HQ",
    infantry: "Infantry",
    maintenance: "Maintenance",
    mechanized: "Armoured",
    mechInfantry: "Mechanized Infantry",
    mechRecon: "Mechanized Recon",
    medical: "Medical",
    mortar: "Mortar",
    motorized: "Motorized Infantry",
    motorizedRecon: "Motorized Recon",
    plane: "Plane",
    recon: "Recon",
    supply: "Supply",
    uav: "UAV",
    uavAir: "UAV Air",
    uavSwarm: "UAV Swarm",
    ugv: "UGV",
    unitBlufor: "Blufor unit",
};



/**
 * ID naming convention ex: Level + number ("L1" - "U1" - "U2" - "S1" etc.)
 */
export type NodeId = string;

/**
 *  Tree levels
 */
export type NodeLevel = "LEAD" | "UNIT" | "SUB";

/**
 * Orbat main element
 */
export type OrbatNode = {
    id: NodeId;
    level: NodeLevel;
    kind: UnitKind;
    displayId?: string;
    labelMain?: string;
    labelBottom?: string;
    labelTop?: string;
};

/**
 * Permet de regrouper les Lead top-level et de les ordonner.
 */
export const ROOT_ID = "ROOT" as const;
/**
 * List children order by parent
 * childrenOrder["ROOT"] = ["L2","L1"]   // order of LEADs
 * childrenOrder["L1"] = ["U2","U1","U3"]
 * childrenOrder["U1"] = ["S2","S1"]
 */
export type ChildrenOrder = Record<NodeId, NodeId[]>;



/**
 * (children - parent)
 * parentById["L1"] = null → no parent
 * parentById["U3"] = "L1" → U3 is child of L1
 */
export type ParentByNodeId = Record<NodeId, NodeId | null>;



/**
 *  coordonates for the board
 */
export type Slot = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};
