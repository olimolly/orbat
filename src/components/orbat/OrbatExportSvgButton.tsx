"use client";

import * as React from "react";
import { toSvg } from "html-to-image";

type Props = {
    targetRef: React.RefObject<HTMLElement | null>;
    fileName?: string;
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

function dataUrlToSvgText(dataUrl: string) {
    // html-to-image returns: data:image/svg+xml;charset=utf-8,<svg ...>
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return dataUrl;

    const meta = dataUrl.slice(0, comma);
    const data = dataUrl.slice(comma + 1);

    // If base64, decode it. Otherwise it's URI-encoded.
    if (/;base64/i.test(meta)) {
        const bin = atob(data);
        // Convert binary string to UTF-8 string safely
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        return new TextDecoder("utf-8").decode(bytes);
    }
    return decodeURIComponent(data);
}

export default function OrbatExportSvgButton({
    targetRef,
    fileName = "orbat.svg",
    className,
    label = "Download SVG",
}: Props) {
    const [busy, setBusy] = React.useState(false);

    async function handleDownload() {
        const el = targetRef.current;
        if (!el || busy) return;

        setBusy(true);
        try {
            // Wait for fonts when supported (helps stability)
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

            const dataUrl = await toSvg(el, {
                cacheBust: true,
                width: w,
                height: h,

                // Keep transparent background
                style: { background: "transparent" },

                // Firefox workaround: skip font embedding that crashes on some setups
                ...(isFirefox() ? { fontEmbedCSS: "" } : null),

                // Optional: prefer woff2 when embedding is enabled (non-Firefox)
                preferredFontFormat: "woff2",
            });

            if (!dataUrl) {
                alert("SVG export failed (empty result).");
                return;
            }

            const svgText = dataUrlToSvgText(dataUrl);
            const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName.endsWith(".svg") ? fileName : `${fileName}.svg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(`SVG export failed: ${safeMsg(e)}`);
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
                title="Export the board as an SVG (real size), transparent background"
            >
                {busy ? "Rendering…" : label}
            </button>
        </div>
    );
}
