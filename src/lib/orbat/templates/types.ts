// src/lib/orbat/templates/types.ts
import type { Slot } from "@/lib/orbat/types";
import type { Edge } from "@/lib/orbat/edges";

export type OrbatTemplateId = "hq_2_children" | "hq_3_children";

export type OrbatTemplate = {
    id: OrbatTemplateId;
    label: string;
    board: { w: number; h: number }; // utile pour cadrer le container
    slots: Slot[];
    edges: Edge[];
};
