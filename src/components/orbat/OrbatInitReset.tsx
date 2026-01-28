// src/components/orbat/OrbatInitReset.tsx
"use client";

import * as React from "react";

export type UnitRailDirection = "horizontal" | "vertical";

export type InitParams = {
    leadCount: number; // default 1
    unitsPerLead: number; // default 3
    subsPerUnit: number; // default 0
    unitRailDirection: UnitRailDirection; // default "horizontal" (pas appliqué)
};

type Props = {
    value: InitParams;
    onChange: (next: InitParams) => void;
    onInit: (params: InitParams) => void;
};

function clampInt(n: number, min: number, max: number) {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

const controlBase =
    "rounded-md border px-2 py-1.5 text-sm transition-colors " +
    "bg-control text-control-fg border-control-border " +
    "hover:bg-control-hover active:bg-control-pressed " +
    "hover:border-black/35 dark:hover:border-white/24";

const inputBase =
    "rounded-md border p-1.5 text-sm transition-colors " +
    "bg-control text-control-fg border-control-border " +
    "focus:outline-none focus:ring-2 focus:ring-accent/30 " +
    "hover:border-black/35 dark:hover:border-white/24";

export default function OrbatInitReset({ value, onChange, onInit }: Props) {
    const [open, setOpen] = React.useState(false);

    function update(partial: Partial<InitParams>) {
        onChange({ ...value, ...partial });
    }

    return (
        <div className="flex flex-wrap items-end gap-1 rounded-xl border border-border bg-surface-1 p-1.5 text-fg">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-fg-muted">CONFIG</span>

                <button
                    type="button"
                    className={[controlBase, "min-w-[72px] cursor-pointer"].join(" ")}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? "Close" : "Preset"}
                </button>
            </div>

            {/* Collapsible */}
            <div
                className={[
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                    open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 pointer-events-none",
                ].join(" ")}
            >
                <div className="overflow-hidden">
                    <div
                        className={[
                            "inline-block align-top overflow-hidden",
                            "transition-[max-width] duration-200 ease-out motion-reduce:transition-none",
                            open ? "max-w-[900px]" : "max-w-0",
                        ].join(" ")}
                    >
                        <div className="flex flex-wrap items-end gap-1">
                            {/* LEAD */}
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-xs font-semibold text-fg-muted">PLATOON</span>
                                <input
                                    className={inputBase}
                                    type="number"
                                    min={1}
                                    max={6}
                                    value={value.leadCount}
                                    onChange={(e) =>
                                        update({ leadCount: clampInt(Number(e.target.value), 1, 6) })
                                    }
                                />
                            </label>

                            {/* UNIT / LEAD */}
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-xs font-semibold text-fg-muted">SQUAD</span>
                                <input
                                    className={inputBase}
                                    type="number"
                                    min={0}
                                    max={12}
                                    value={value.unitsPerLead}
                                    onChange={(e) =>
                                        update({
                                            unitsPerLead: clampInt(Number(e.target.value), 0, 12),
                                        })
                                    }
                                />
                            </label>

                            {/* SUB / UNIT */}
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-xs font-semibold text-fg-muted">TEAM</span>
                                <input
                                    className={inputBase}
                                    type="number"
                                    min={0}
                                    max={12}
                                    value={value.subsPerUnit}
                                    onChange={(e) =>
                                        update({ subsPerUnit: clampInt(Number(e.target.value), 0, 12) })
                                    }
                                />
                            </label>

                            {/* Rail direction */}
                            <fieldset className="flex items-center gap-3 rounded-md border border-control-border bg-control px-2 py-1.5">
                                <legend className="sr-only">Unit rail direction</legend>

                                <label className="flex items-center gap-1 text-sm text-control-fg cursor-pointer">
                                    <input
                                        type="radio"
                                        title="Horizontal"
                                        name="unitRailDirection"
                                        checked={value.unitRailDirection === "horizontal"}
                                        onChange={() => update({ unitRailDirection: "horizontal" })}
                                    />
                                    ↔
                                </label>

                                <label className="flex items-center gap-1 text-sm text-fg-muted">
                                    <input
                                        disabled
                                        type="radio"
                                        title="Vertical"
                                        name="unitRailDirection"
                                        checked={value.unitRailDirection === "vertical"}
                                        onChange={() => update({ unitRailDirection: "vertical" })}
                                    />
                                    ↕
                                </label>
                            </fieldset>

                            {/* Actions */}
                            <div className="ml-auto flex items-center gap-2">
                                <button
                                    type="button"
                                    className={[controlBase, "cursor-pointer"].join(" ")}
                                    onClick={() =>
                                        onChange({
                                            leadCount: 1,
                                            unitsPerLead: 3,
                                            subsPerUnit: 0,
                                            unitRailDirection: "horizontal",
                                        })
                                    }
                                >
                                    Defaults
                                </button>

                                <button
                                    type="button"
                                    className={[
                                        "rounded-md px-2 py-1.5 text-sm font-semibold transition-colors cursor-pointer",
                                        "bg-accent text-white hover:bg-accent-hover active:opacity-90",
                                    ].join(" ")}
                                    onClick={() => {
                                        onInit(value);
                                        setOpen(false);
                                    }}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
