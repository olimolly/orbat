// src/components/orbat/OrbatExportPngButton.tsx
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

function isFirefox() {
    if (typeof navigator === "undefined") return false;
    return /firefox/i.test(navigator.userAgent);
}

const controlBtn =
    "h-9 rounded-md border px-3 text-sm font-semibold transition-colors cursor-pointer " +
    "bg-control text-control-fg border-control-border " +
    "hover:bg-control-hover active:bg-control-pressed " +
    "hover:border-black/35 dark:hover:border-white/24";

const controlBtnDisabled =
    "h-9 rounded-md border px-3 text-sm font-semibold transition-colors " +
    "border-control-border bg-surface-1 text-fg-muted opacity-60 cursor-not-allowed";

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
            // Wait for fonts when supported (helps stability + correct render)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fontsReady = (document as any).fonts?.ready as Promise<void> | undefined;
            if (fontsReady) {
                try {
                    await fontsReady;
                } catch {
                    // ignore
                }
            }

            // REAL SIZE: ignores transforms (scale)
            const w = Math.max(1, Math.ceil(el.scrollWidth || el.getBoundingClientRect().width));
            const h = Math.max(1, Math.ceil(el.scrollHeight || el.getBoundingClientRect().height));

            const blob = await toBlob(el, {
                cacheBust: true,
                pixelRatio,
                width: w,
                height: h,

                // Keep transparent background
                style: { background: "transparent" },

                // Firefox workaround: skip font embedding that crashes on some setups
                ...(isFirefox() ? { fontEmbedCSS: "" } : null),

                // Optional: prefer woff2 when embedding is enabled (non-Firefox)
                preferredFontFormat: "woff2",
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

    const disabled = busy || !targetRef.current;

    return (
        <div className="flex flex-wrap items-end self-center gap-1">
            <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={disabled}
                className={className ?? (disabled ? controlBtnDisabled : controlBtn)}
                title="Export the board as a PNG (real size), transparent background"
            >
                {busy ? "Rendering…" : label}
            </button>
        </div>
    );
}
