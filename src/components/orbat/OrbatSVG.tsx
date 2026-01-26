// components/orbat/OrbatSVG.tsx
import type { OrbatSVGProps } from "@/lib/orbat/svg-types";
import { ORBAT_SVG_REGISTRY, type OrbatSVGKind } from "./registry";

type Props = OrbatSVGProps & { kind: OrbatSVGKind };

export default function OrbatSVG({ kind, ...props }: Props) {
    const Svg = ORBAT_SVG_REGISTRY[kind];

    if (typeof Svg !== "function") {
        console.error("[OrbatSVG] invalid kind or broken import:", kind);
        console.error("[OrbatSVG] available:", Object.keys(ORBAT_SVG_REGISTRY));
        return null;
    }

    return <Svg {...props} />;
}
