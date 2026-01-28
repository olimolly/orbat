"use client";

import { useState } from "react";

type Theme = "dark" | "light";
const KEY = "theme";

function readTheme(): Theme {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(() => readTheme());

    function toggle() {
        const current = readTheme();
        const next: Theme = current === "dark" ? "light" : "dark";

        document.documentElement.dataset.theme = next;

        try {
            localStorage.setItem(KEY, next);
        } catch { }

        setTheme(next);
    }

    return (
        <button
            type="button"
            onClick={toggle}
            className="h-9 rounded-md border px-3 text-sm font-semibold
                 border-[var(--color-border)] bg-[var(--color-bg-panel)]
                 text-[var(--color-fg)]
                 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-subtle)]"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
            {theme === "dark" ? "🌙" : "☀️"}
        </button>
    );
}
