// src/lib/orbat/svg-types.ts
import type { ComponentType } from "react";

export type OrbatSVGProps = {
    bg?: string;
    stroke?: string;
    shape?: string;
    className?: string;
    title?: string;
};

export type OrbatSVGComponent = ComponentType<OrbatSVGProps>;
