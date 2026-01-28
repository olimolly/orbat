"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    // Évite mismatch SSR: on n'affiche rien tant que ce n'est pas monté
    if (!mounted) return null;

    const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={[
                "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                "cursor-pointer",
                "bg-control text-control-fg border-control-border",
                "hover:bg-control-hover active:bg-control-pressed",
                "hover:border-black/35 dark:hover:border-white/24",
            ].join(" ")}
            aria-label="Toggle theme"
            title={`Theme: ${theme ?? "unknown"}`}
        >
            {isDark ? "Light" : "Dark"}
        </button>

    );
}
