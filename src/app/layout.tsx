// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-sans",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`min-h-screen flex flex-col bg-bg text-fg ${inter.className}`}>
        {/* NAVBAR GLOBALE */}
        <header className="border-b border-bg-subtle/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/orbats" className="font-semibold tracking-tight">
              Orbat Creator
            </Link>
            <nav className="flex items-center gap-3 text-sm text-fg-muted">
              <Link className="hover:text-fg" href="/editor">Orbat offline</Link>
            </nav>
          </div>
        </header>

        {children}

        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "rounded-md shadow-md",
              success: "bg-green-600 text-white",
              error: "bg-red-600 text-white",
              warning: "bg-yellow-500 text-black",
            },
          }}
        />
      </body>
    </html>
  );
}
