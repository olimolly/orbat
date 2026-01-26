export function openPngInNewTabTransparent(dataUrl: string, title = "ORBAT Export") {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
        alert("Popup blocked. Allow popups for this site.");
        return;
    }

    const safeTitle = title.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    win.document.open();
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111; }
    header {
      position: sticky; top:0; display:flex; gap:12px; align-items:center;
      padding:12px 16px; background: rgba(255,255,255,.85); backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(0,0,0,.08);
    }
    header a {
      color:#111; background: transparent; border: 1px solid rgba(0,0,0,.2);
      border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer;
      text-decoration:none;
    }
    header a:hover { border-color: rgba(0,0,0,.55); }
    main { padding: 16px; }

    /* checkerboard to visualize transparency */
    .checker {
      background-color: #f3f4f6;
      background-image:
        linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(0,0,0,.08) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(0,0,0,.08) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.08) 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(0,0,0,.12);
    }

    img { max-width: 100%; height:auto; display:block; margin:0 auto; }
    .muted { opacity:.7; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div style="font-weight:900">${safeTitle}</div>
    <a id="dl" download="orbat.png" href="">Download PNG</a>
    <span class="muted">Fond damier = transparence</span>
  </header>
  <main>
    <div class="checker">
      <img id="img" alt="PNG export" />
    </div>
  </main>
</body>
</html>`);
    win.document.close();

    const img = win.document.getElementById("img") as HTMLImageElement | null;
    const dl = win.document.getElementById("dl") as HTMLAnchorElement | null;
    if (img) img.src = dataUrl;
    if (dl) dl.href = dataUrl;
}
