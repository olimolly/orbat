"use client";

import type { EditorState } from "@/lib/orbat/io";
import { downloadJson, safeParseJson, parseOrbatExport, copyJsonToClipboard } from "@/lib/orbat/io";

type Props = {
    editor: EditorState;
    onImport: (state: EditorState) => void;
};

const controlBtn =
    "rounded-md border px-2 py-1.5 text-sm font-semibold transition-colors cursor-pointer " +
    "bg-control text-control-fg border-control-border " +
    "hover:bg-control-hover active:bg-control-pressed " +
    "hover:border-black/35 dark:hover:border-white/24";

export default function OrbatImportExport({ editor, onImport }: Props) {
    return (
        <div className="flex flex-wrap items-end gap-1 rounded-xl border border-border bg-surface-1 p-1.5 text-fg">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-fg-muted">EXPORT / IMPORT</span>

                <button
                    type="button"
                    className={controlBtn}
                    onClick={async () => {
                        const payload = {
                            version: 1 as const,
                            meta: { exportedAt: new Date().toISOString() },
                            state: editor,
                        };

                        const ok = await copyJsonToClipboard(payload);
                        if (!ok) alert("Copy failed (clipboard blocked).");
                    }}
                >
                    Copy JSON
                </button>
            </div>

            <div className="flex flex-col gap-1">
                <button
                    type="button"
                    className={controlBtn}
                    onClick={() => {
                        const payload = {
                            version: 1 as const,
                            meta: { exportedAt: new Date().toISOString() },
                            state: editor,
                        };

                        downloadJson(`orbat-${new Date().toISOString().slice(0, 10)}.json`, payload);
                    }}
                >
                    Export JSON
                </button>
            </div>

            <div className="flex flex-col gap-1">
                <div className="text-xs text-fg-muted">Import remplace l’état courant (structure + ordre).</div>

                <input
                    type="file"
                    accept="application/json"
                    className={[
                        "block max-w-xs text-sm text-fg",
                        "file:mr-2 file:rounded-md file:border file:px-2.5 file:py-1.5",
                        "file:text-sm file:font-semibold file:transition-colors file:cursor-pointer",
                        "file:bg-control file:text-control-fg file:border-control-border",
                        "hover:file:bg-control-hover active:file:bg-control-pressed",
                        "hover:file:border-black/35 dark:hover:file:border-white/24",
                    ].join(" ")}
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = ""; // allow re-import same file
                        if (!file) return;

                        const text = await file.text();
                        const raw = safeParseJson(text);
                        const parsed = parseOrbatExport(raw);

                        if (!parsed) {
                            alert("Invalid ORBAT JSON file.");
                            return;
                        }

                        onImport(parsed.state);
                    }}
                />
            </div>
        </div>
    );
}
