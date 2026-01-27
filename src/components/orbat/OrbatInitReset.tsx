// src/components/orbat/OrbatInitReset.tsx
"use client";

import * as React from "react";

export type UnitRailDirection = "horizontal" | "vertical";

export type InitParams = {
    leadCount: number;       // default 1
    unitsPerLead: number;    // default 3
    subsPerUnit: number;     // default 0
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

export default function OrbatInitReset({ value, onChange, onInit }: Props) {
    const [open, setOpen] = React.useState(false);

    function update(partial: Partial<InitParams>) {
        onChange({ ...value, ...partial });
    }

    return (
        <div className="flex flex-wrap items-end rounded-xl border border-black/15 bg-white gap-1 p-1.5">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold opacity-80">CONFIG</span>
                {/* <div className="text-sm font-semibold">Preset</div> */}
                {/* <div className="text-xs opacity-70">Structure par défaut (LEAD → UNIT → SUB)</div> */}
                <button
                    type="button"
                    className="rounded-md border border-black/20 bg-white p-1.5 text-sm hover:border-black/50"
                    onClick={() => setOpen((v) => !v)}
                    style={{ minWidth: "72px" }}
                >
                    {open ? "Close" : "Preset"}
                </button>
            </div>

            {/* Collapsible: height collapse + width animation (CSS-only) */}
            <div
                className={[
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none",
                ].join(" ")}
            >
                <div className="overflow-hidden">
                    <div
                        className={[
                            "overflow-hidden inline-block align-top",
                            "transition-[max-width] duration-200 ease-out motion-reduce:transition-none",
                            open ? "max-w-[900px]" : "max-w-0",
                        ].join(" ")}
                    >
                        <div className="flex flex-wrap items-end gap-1">
                            {/* LEAD */}
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-xs font-semibold opacity-80">PLATOON</span>
                                <input
                                    className="rounded-md border border-black/20 p-1.5"
                                    type="number"
                                    min={1}
                                    max={6}
                                    value={value.leadCount}
                                    onChange={(e) => update({ leadCount: clampInt(Number(e.target.value), 1, 6) })}
                                />
                            </label>

                            {/* UNIT / LEAD */}
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-xs font-semibold opacity-80">SQUAD</span>
                                <input
                                    className="rounded-md border border-black/20 p-1.5"
                                    type="number"
                                    min={0}
                                    max={12}
                                    value={value.unitsPerLead}
                                    onChange={(e) => update({ unitsPerLead: clampInt(Number(e.target.value), 0, 12) })}
                                />
                            </label>

                            {/* SUB / UNIT */}
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-xs font-semibold opacity-80">TEAM</span>
                                <input
                                    className="rounded-md border border-black/20 p-1.5"
                                    type="number"
                                    min={0}
                                    max={12}
                                    value={value.subsPerUnit}
                                    onChange={(e) => update({ subsPerUnit: clampInt(Number(e.target.value), 0, 12) })}
                                />
                            </label>

                            {/* Rail direction */}
                            <fieldset className="flex items-center gap-3 rounded-md border border-black/10 p-1.5">
                                <legend className="sr-only">Unit rail direction</legend>

                                <label className="flex items-center gap-1 text-sm">
                                    <input
                                        type="radio"
                                        title="Horizontal"
                                        name="unitRailDirection"
                                        checked={value.unitRailDirection === "horizontal"}
                                        onChange={() => update({ unitRailDirection: "horizontal" })}
                                    />
                                    ↔
                                </label>

                                <label className="flex items-center gap-1 text-sm">
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
                                    className="rounded-md border border-black/20 text-sm hover:border-black/50 p-1.5"
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
                                    className="rounded-md bg-black text-sm font-semibold text-white hover:opacity-90 p-1.5"
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
