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
    mechanized: "Armored",
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


export type NodeId = string;
export type NodeLevel = "LEAD" | "UNIT" | "SUB";
export type OrbatNode = {
    id: NodeId;
    level: NodeLevel;
    kind: UnitKind;
    displayId?: string;
    labelMain?: string;
    labelBottom?: string;
    labelTop?: string;
};
export type ParentByNodeId = Record<NodeId, NodeId | null>; // enfant, parent
export type ChildrenOrder = Record<NodeId, NodeId[]>;



// TYPE SLOT
export type Slot = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};
