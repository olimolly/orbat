"use client";

import * as React from "react";
import { toBlob } from "html-to-image";

type Props = {
    targetRef: React.RefObject<HTMLElement | null>;
    fileName?: string;
    pixelRatio?: number;
    className?: string;
    label?: string;
};

function safeMsg(e: unknown) {
    if (e instanceof Error) return `${e.name}: ${e.message}`;
    return String(e);
}

export default function OrbatExportPngButton({
    targetRef,
    fileName = "orbat.png",
    pixelRatio = 2,
    className,
    label = "Download PNG",
}: Props) {
    const [busy, setBusy] = React.useState(false);

    async function handleDownload() {
        const el = targetRef.current;
        if (!el || busy) return;

        setBusy(true);
        try {
            // REAL SIZE: ignores transforms (scale)
            const w = Math.max(1, Math.round(el.scrollWidth));
            const h = Math.max(1, Math.round(el.scrollHeight));

            const blob = await toBlob(el, {
                cacheBust: true,
                pixelRatio,
                width: w,
                height: h,
                style: { background: "transparent" },
            });

            if (!blob) {
                alert("PNG export failed (empty blob).");
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(`PNG export failed: ${safeMsg(e)}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-wrap items-end self-center gap-1">
            <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={busy || !targetRef.current}
                className={
                    className ??
                    [
                        "h-9 rounded-md border text-sm font-semibold p-1.5 m-1.5",
                        busy || !targetRef.current
                            ? "border-black/10 bg-black/5 opacity-60 cursor-not-allowed"
                            : "border-black/20 bg-white hover:border-black/50",
                    ].join(" ")
                }
                title="Export the board as a PNG (real size), transparent background"
            >
                {busy ? "Rendering…" : label}
            </button>
        </div>
    );
}
