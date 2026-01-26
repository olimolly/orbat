// src/components/orbat/OrbatColorPresetSelect.tsx
"use client";

import * as React from "react";

export type OrbatColors = {
    bg: string;
    stroke: string;
    shape: string;
};

export const ORBAT_COLOR_PRESETS = {
    p1: {
        label: "Blue / Dark contour",
        colors: {
            bg: "#b3d9ff",
            stroke: "#111827",
            shape: "#111827",
        },
    },
    p2: {
        label: "Blue / NATO",
        colors: {
            bg: "#b3d9ff",
            stroke: "#0033a0",
            shape: "#0033a0",
        },
    },
    p3: {
        label: "Light / Neutral",
        colors: {
            bg: "#f3f4f6",
            stroke: "#1f2937",
            shape: "#0f172a",
        },
    },
} as const;

export type OrbatColorPresetId = keyof typeof ORBAT_COLOR_PRESETS;

export function getOrbatColors(presetId: OrbatColorPresetId): OrbatColors {
    return ORBAT_COLOR_PRESETS[presetId].colors;
}

function cls(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}


export default function OrbatColorPresetSelect({
    value,
    onChange,
    className,
}: {
    value: OrbatColorPresetId;
    onChange: (next: OrbatColorPresetId) => void;
    label?: string;
    className?: string;
}) {
    const entries = Object.entries(ORBAT_COLOR_PRESETS) as Array<
        [OrbatColorPresetId, (typeof ORBAT_COLOR_PRESETS)[OrbatColorPresetId]]
    >;

    return (
        <div className="flex flex-wrap items-end self-center rounded-xl border border-black/15 bg-white gap-1 p-1.5">

            <div className={cls("grid gap-1 ", className)}>
                {/* <div className="text-xs font-semibold opacity-80">{label}</div> */}
                <div className="flex flex-wrap gap-2 justify-self-start w-fit">
                    {entries.map(([id, p]) => {
                        const active = id === value;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onChange(id)}
                                className={
                                    cls(
                                        "flex h-9 w-9 items-center justify-center rounded-md border p-0.5 cursor-pointer transition",
                                        active
                                            ? "border-black ring-1 ring-black/40"
                                            : "hover:ring-1 hover:ring-black/20"
                                    )}
                                style={{
                                    background: p.colors.bg,
                                    borderWidth: 3,
                                    borderColor: p.colors.stroke,
                                    color: p.colors.shape,
                                }}
                                title={p.label}
                                aria-pressed={active}
                            >
                                <span className="text-sm font-semibold leading-none">♦</span>
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>

    );
}
