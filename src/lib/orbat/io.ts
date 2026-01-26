// src/lib/orbat/io.ts
import type {
    OrbatNode,
    ParentByNodeId,
    ChildrenOrder,
    NodeId,
} from "@/lib/orbat/types";
import type {
    InitParams,
    UnitRailDirection,
} from "@/components/orbat/OrbatInitReset";
import type { OrbatColorPresetId } from "@/components/orbat/OrbatColorPresetSelect";

/* ───────────────────────────── */
/* Types                         */
/* ───────────────────────────── */

export type EditorState = {
    initParams: InitParams;
    unitRailDirection: UnitRailDirection;
    nodes: OrbatNode[];
    parentById: ParentByNodeId;
    childrenOrder: ChildrenOrder;
    selectedId: NodeId | null;
    scale: number;
    colorPresetId: OrbatColorPresetId;
};

export type OrbatExportFile = {
    version: 1;
    meta: {
        exportedAt: string;
    };
    state: EditorState;
};

/* ───────────────────────────── */
/* Utils                         */
/* ───────────────────────────── */

export function downloadJson(filename: string, data: unknown): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

export function safeParseJson(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

/* ───────────────────────────── */
/* Type guards                   */
/* ───────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isEditorState(value: unknown): value is EditorState {
    if (!isRecord(value)) return false;

    return (
        isRecord(value.initParams) &&
        typeof value.unitRailDirection === "string" &&
        Array.isArray(value.nodes) &&
        isRecord(value.parentById) &&
        isRecord(value.childrenOrder) &&
        (typeof value.selectedId === "string" || value.selectedId === null) &&
        typeof value.scale === "number" &&
        typeof value.colorPresetId === "string"
    );
}


export async function copyJsonToClipboard(data: unknown): Promise<boolean> {
    const text = JSON.stringify(data, null, 2);

    // Modern API (preferred)
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // continue to fallback
        }
    }

    // Fallback (deprecated but still required in some environments)
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.select();

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const ok = document.execCommand("copy");

        ta.remove();
        return ok;
    } catch {
        return false;
    }
}

/* ───────────────────────────── */
/* Parser                        */
/* ───────────────────────────── */

export function parseOrbatExport(
    raw: unknown
): OrbatExportFile | null {
    if (!isRecord(raw)) return null;
    if (raw.version !== 1) return null;
    if (!isRecord(raw.meta)) return null;
    if (!isEditorState(raw.state)) return null;

    return {
        version: 1,
        meta: {
            exportedAt:
                typeof raw.meta.exportedAt === "string"
                    ? raw.meta.exportedAt
                    : new Date().toISOString(),
        },
        state: raw.state,
    };
}
