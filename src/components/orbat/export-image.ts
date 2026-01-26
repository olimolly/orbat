// src/lib/orbat/export-image.ts
export function downloadDataUrl(filename: string, dataUrl: string): void {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
