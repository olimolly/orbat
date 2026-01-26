// src/components/orbat/registry.ts
import type { OrbatSVGComponent } from "@/lib/orbat/svg-types";

import MechInfantry from "@/components/orbat/svg/MechInfantry";
import MechRecon from "./svg/MechRecon";
import AntiAir from "./svg/AntiAir";
import AntiTank from "./svg/AntiTank";
import Artillery from "./svg/Artillery";
import Helicopter from "./svg/Helicopter";
import HQ from "./svg/HQ";
import Infantry from "./svg/Infantry";
import Mechanized from "./svg/Mechanized";
import Plane from "./svg/Plane";
import Recon from "./svg/Recon";
import UAV from "./svg/UAV";
import UnitBlufor from "./svg/UnitBlufor";
import Maintenance from "./svg/Maintenance";
import Medical from "./svg/Medical";
import Mortar from "./svg/Mortar";
import Motorized from "./svg/Motorized";
import MotorizedRecon from "./svg/MotorizedRecon";
import Supply from "./svg/Supply";
import UAVAir from "./svg/UAVAir";
import UAVSwarm from "./svg/UAVSwarm";
import UGV from "./svg/UGV";

export const ORBAT_SVG_REGISTRY = {
    antiAir: AntiAir,
    antiTank: AntiTank,
    artillery: Artillery,
    helicopter: Helicopter,
    hQ: HQ,
    infantry: Infantry,
    maintenance: Maintenance,
    mechanized: Mechanized,
    mechInfantry: MechInfantry,
    mechRecon: MechRecon,
    medical: Medical,
    mortar: Mortar,
    motorized: Motorized,
    motorizedRecon: MotorizedRecon,
    plane: Plane,
    recon: Recon,
    supply: Supply,
    uav: UAV,
    uavAir: UAVAir,
    uavSwarm: UAVSwarm,
    ugv: UGV,
    unitBlufor: UnitBlufor,
} satisfies Record<string, OrbatSVGComponent>;

export type OrbatSVGKind = keyof typeof ORBAT_SVG_REGISTRY;
