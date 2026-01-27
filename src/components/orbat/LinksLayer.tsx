// components/orbat/LinksLayer.tsx
"use client";

import type { Slot } from "@/lib/orbat/types";
import type { Edge, PortSide, ViaPoint } from "@/lib/orbat/edges";

type Pt = { x: number; y: number };

export const UNIT_BOTTOMLEFT_INSET = 2;

function port(slot: Slot, side: PortSide): Pt {
    switch (side) {
        case "top":
            return { x: Math.round(slot.x + slot.w / 2), y: Math.round(slot.y) };
        case "bottom":
            return { x: Math.round(slot.x + slot.w / 2), y: Math.round(slot.y + slot.h) };
        case "left":
            return { x: Math.round(slot.x), y: Math.round(slot.y + slot.h / 2) };
        case "right":
            return { x: Math.round(slot.x + slot.w), y: Math.round(slot.y + slot.h / 2) };
        case "bottomLeft":
            return {
                x: Math.round(slot.x + UNIT_BOTTOMLEFT_INSET),
                y: Math.round(slot.y + slot.h),
            };
    }
}

function pathFromPoints(points: Pt[]): string {
    return points.reduce(
        (d, p, i) => d + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
        ""
    );
}

function isOrthogonal(points: Pt[], eps = 0.75): boolean {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        if (dx > eps && dy > eps) return false;
    }
    return true;
}

export default function LinksLayer({
    slots,
    edges,
    stroke = "#0033a0",
    strokeWidth = 8,
    junctionSize = 14,
}: {
    slots: Slot[];
    edges: Edge[];
    stroke?: string;
    strokeWidth?: number;
    junctionSize?: number;
}) {
    const slotById = new Map(slots.map((s) => [s.id, s]));

    const maxRight = Math.max(0, ...slots.map((s) => s.x + s.w));
    const maxBottom = Math.max(0, ...slots.map((s) => s.y + s.h));

    // square caps + arrondis => un peu plus que *2
    const pad = Math.ceil(strokeWidth * 4);

    return (
        <svg
            className="absolute left-0 top-0 pointer-events-none overflow-visible"
            width={maxRight + pad}
            height={maxBottom + pad}
            style={{ width: maxRight + pad, height: maxBottom + pad }}
        >
            {edges.map((e) => {
                const aSlot = slotById.get(e.from.slotId);
                const bSlot = slotById.get(e.to.slotId);
                if (!aSlot || !bSlot) return null;

                const a = port(aSlot, e.from.side);
                const b = port(bSlot, e.to.side);
                const via: ViaPoint[] = e.via ?? [];

                const points: Pt[] = [
                    a,
                    ...via.map(({ x, y }) => ({ x: Math.round(x), y: Math.round(y) })),
                    b,
                ];

                if (!isOrthogonal(points)) return null;

                const d = pathFromPoints(points);

                return (
                    <g key={e.id}>
                        <path
                            d={d}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                        />

                        {via
                            .filter((p) => p.node)
                            .map((p, i) => (
                                <rect
                                    key={i}
                                    x={Math.round(p.x - junctionSize / 2)}
                                    y={Math.round(p.y - junctionSize / 2)}
                                    width={junctionSize}
                                    height={junctionSize}
                                    fill={stroke}
                                />
                            ))}
                    </g>
                );
            })}
        </svg>
    );
}
