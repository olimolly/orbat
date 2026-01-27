# ORBAT Creator

ORBAT Creator is a web app to build, edit, and export military-style ORBAT (Order of Battle) diagrams — fast, clean, and reusable.

## Why ORBAT Creator?

Creating clear ORBATs usually means fighting with drawing tools. ORBAT Creator focuses on the essentials:
- Structured unit hierarchies (leaders, units, sub-units)
- Consistent layout and readable connectors
- Quick edits (rename, reorder, change unit type/role)
- Exportable data you can reuse in other tools

## Key features

- **Hierarchy editor**: build multi-level structures (parent → child) and reorganize easily
- **Visual board**: interactive diagram rendering with connectors
- **Unit types & roles**: standardized unit kinds with labels/icons
- **Templates**: start from predefined node/edge layouts (e.g., L1U3, L2U6, etc.)
- **Import / Export**: JSON export for storage/sharing + SVG-ready rendering pipeline *(if enabled in your build)*

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Client-side SVG rendering for diagrams

## Getting started

### Requirements
- Node.js 18+ (20+ recommended)
- pnpm (recommended)
