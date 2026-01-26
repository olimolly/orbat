"use client";

import type { EditorState } from "@/lib/orbat/io";
import {
    downloadJson,
    safeParseJson,
    parseOrbatExport,
    copyJsonToClipboard,
} from "@/lib/orbat/io";

type Props = {
    editor: EditorState;
    onImport: (state: EditorState) => void;
};

export default function OrbatImportExport({ editor, onImport }: Props) {
    return (
        <div className="flex flex-wrap items-end rounded-xl border border-black/15 bg-white gap-1 p-1.5">
            <div className="flex flex-col gap-1" >
                <span className="text-xs font-semibold opacity-80">EXPORT / IMPORT</span>
                <button
                    type="button"
                    className="rounded-md border border-black/20 bg-white p-1.5 text-sm font-semibold hover:border-black/50"
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
            <div className="flex flex-col gap-1" >
                <button
                    type="button"
                    className="rounded-md border border-black/20 bg-white p-1.5 text-sm font-semibold hover:border-black/50"
                    onClick={() => {
                        const payload = {
                            version: 1 as const,
                            meta: { exportedAt: new Date().toISOString() },
                            state: editor,
                        };

                        downloadJson(
                            `orbat-${new Date().toISOString().slice(0, 10)}.json`,
                            payload
                        );
                    }}
                >
                    Export JSON
                </button>
            </div>

            <div className="flex flex-col gap-1" >
                <div className="text-xs opacity-70">
                    Import remplace l’état courant (structure + ordre).
                </div>
                <input
                    type="file"
                    accept="application/json"
                    className="block max-w-xs text-sm file:p-1.5 file:rounded-md file:border file:border-black/20 file:bg-white file:file:p-1.5 file:font-semibold hover:file:border-black/50 "
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
