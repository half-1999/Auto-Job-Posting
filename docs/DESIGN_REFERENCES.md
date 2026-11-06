# Design References, Skills Audit & Licenses

Status: Draft for review · Version 0.2 · Researched Nov 4, 2026

This document records what was inspected, what each source is useful for, its license, and how the project may use it. The rule throughout: **borrow patterns, write original code**. Code is copied only from MIT/ISC sources that are designed to be copied (shadcn/ui), and license notices are preserved.

---

## 1. Design skills audit

### 1.1 Taste Skill (`design-taste-frontend`)

- **Status**: installed locally at `~/.cursor/skills/design-taste-frontend/SKILL.md` (also `taste-skill`, `design-taste-frontend-v1`, `minimalist-ui`, `high-end-visual-design`, `redesign-existing-projects`). The full instructions were read.
- **Scope caveat (from the skill itself, §13)**: it is written for landing pages and portfolios, and explicitly lists "dashboards / dense product UI / admin panels" and "data tables" as out of scope. So we apply its **anti-default rules**, not its layout recipes (heroes, bento, GSAP scroll).
- **Rules adopted**:

| Taste rule | How it applies here |
|---|---|
| §0.B Design Read | "Single-user productivity tool and lightweight CRM for a job seeker, with a quiet Linear/Attio product language, built on owned shadcn/ui components and Tailwind v4 tokens." |
| §1 Dials | `DESIGN_VARIANCE 3`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 6` on desktop and 4 on mobile. These are product-UI values, not the landing-page baseline. |
| §4.1 Inter discouraged as default | Switch to **Geist Sans + Geist Mono** (OFL-1.1, self-hosted via Fontsource). |
| §4.2 Lila rule (no AI purple/indigo default) | Drop the Phase 1 indigo. Use a **monochrome primary** (near-black or near-white buttons) plus **one cobalt accent** for focus, selection, links, and the primary chart series. |
| §4.2 One accent, color lock | Status colors are semantic (success, warning, danger) and are never decorative. |
| §4.4 Cards only for real hierarchy | KPIs in one segmented strip, not five cards. Sections are separated by spacing and hairlines. |
| §4.4 Shape consistency lock | A documented radius rule (UI_UX_PLAN §3.5). |
| §4.5 Full state cycles | Skeletons shaped like the final layout, plus designed empty and error states, for every data view. |
| §4.6 Labels above inputs, no placeholder-as-label | Applies to all forms. |
| §8 No pure `#000`/`#fff` | Off-black and off-white surfaces. |
| §9.D No "Jane Doe", "Acme", fake-perfect numbers | Mock data uses realistic, locale-appropriate names and messy numbers, and is labeled as mock. |
| §9.G Em-dash ban | **No `—` or `–` in any UI string.** It's enforced by a lint script in Phase 2. |
| §3.C Icons | The skill prefers Phosphor and accepts Lucide when the project already depends on it. Our shadcn components import Lucide internally, and mixing two families is banned, so we **keep Lucide** with a global stroke width. |

### 1.2 UI UX Pro Max (`nextlevelbuilder/ui-ux-pro-max-skill`)

- **Status**: **not installed** on this machine. No `ui-ux-pro-max` skill was found in `~/.cursor/skills`, `~/.agents/skills`, or `~/.claude`.
- **Inspected instead**: the official repository, shallow-cloned to a temp folder at commit `dd9a1b4` (Nov 4, 2026). License: **MIT**, about 145k stars, actively maintained.
- **What it actually is**: a skill (`SKILL.md` plus `references/*.md`) and a local Python search tool (`scripts/search.py`, standard library only) over CSV datasets: 79 styles, 192 palettes, 74 font pairings, 119 UX guidelines, 25 chart types, and 22 stack guides including `shadcn` and `react`.
- **Install steps (from its README)**:
  ```bash
  # Cursor
  npm install -g ui-ux-pro-max-cli
  uipro init --ai cursor
  # Claude Code plugin alternative
  /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
  /plugin install ui-ux-pro-max@ui-ux-pro-max-skill
  ```
  Python 3 is required for the search tool (3.11 is available on this machine). It is not installed in the project, because installing a global CLI is your decision.
- **Queries run, and what was kept**:

| Query | Result | Decision |
|---|---|---|
| `"SaaS productivity dashboard CRM minimal" --design-system` | Landing pattern ("Product Demo + Features"), Flat style, teal on teal-tinted background, Plus Jakarta Sans via Google Fonts `<link>` | **Rejected.** It's a landing-page result. A tinted background and black text on teal don't fit a Linear-style app, and remote font links conflict with our CSP and the Taste font rule. Only "no heavy shadows, 150–200 ms transitions" was kept. |
| `"data-dense dashboard minimal monochrome" --domain style` | Data-Dense Dashboard: 36 px table rows, 56 px header, 240 px sidebar, sticky headers, export | **Adopted** as density reference values (adjusted to 232 px sidebar and 36/44 px rows). |
| `"data table mobile responsive" --domain ux` | Card layout or horizontal scroll, touch-sized targets, mobile-first | **Adopted.** Card or list layout on mobile, and horizontal scroll only for the column-mapping table. |
| `"bottom navigation mobile drawer" --domain ux` | Preserve back behavior, sticky nav must not obscure content, correct `inputmode` | **Adopted.** Real routes for every drawer and sheet that represents a page, plus content insets for fixed bars. |
| `"time series trend comparison" --domain chart` | Line or bar for trends, more than 4 points, never hue-only series, **visible data-table fallback** | **Adopted.** Every chart gets a "View as table" toggle and dashed versus solid series styles. |
| `"sidebar theming dark mode" --stack shadcn` | OKLCH semantic variables in `:root` and `.dark`, `@theme inline`, use the shadcn `Sidebar` with `SidebarProvider` | **Adopted.** Phase 2 migrates the tokens from hex to OKLCH and builds the shell on the shadcn `Sidebar`. |
| `"lazy route code splitting" --domain react` | Dynamic imports for heavy components, lazy `useState` init | **Adopted.** `React.lazy` per route, plus lazy Recharts. |

- **Priority table adopted as review order** (from its SKILL.md): Accessibility, then Touch & Interaction, Performance, Style, Layout & Responsive, Typography & Color, Animation, Forms, Navigation, Charts.
- **Pre-delivery checklist**: `references/pro-rules.md` is scoped to native apps. The web-relevant items are merged into the checklist in UI_UX_PLAN §11: 44 px targets, safe areas, focus order, both themes tested, no emoji icons, and press states that don't shift layout.

## 2. Repository research

| Repository | License (verified) | Activity | What's useful | Reuse decision |
|---|---|---|---|---|
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | Active (127k stars) | Component source we already own. `Sidebar` (collapsible icon rail, mobile sheet, cookie or local state), `Command` (cmdk), the data-table guide (TanStack), `Chart` (Recharts wrapper), and blocks such as `sidebar-07` (icon collapse) and `dashboard-01` | **Copy allowed** via the CLI, as designed. Restyle everything: never ship the default state. |
| [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) | MIT | Active (16.5k) | Vite-based (closest to our stack). Patterns: **one nav config feeds the sidebar and the command menu** (`sidebar-data.ts` + `command-menu.tsx`), a `skip-to-main` link, a `navigation-progress` bar, a generic `confirm-dialog`, `profile-dropdown`, and a data-table toolbar with faceted filters | **Pattern reuse, original code.** It uses TypeScript and TanStack Router, and its visuals are default shadcn, which is what we're moving away from. |
| [origin-space/ui-experiments](https://github.com/origin-space/ui-experiments) | **No license file** (checked the repo root) | Last push Dec 2025 | High-quality layout experiments: inset content panels, CRM-style tables, and dense settings layouts | **Visual reference only.** Without a license, default copyright applies, so no code is copied. |
| [cosscom/ui](https://github.com/cosscom/ui) (formerly Origin UI) | MIT (Copyright coss.com, originally Origin UI) | Active (10.8k) | Input variants (inline addons, clear button), stepper, timeline, and badge treatments | Pattern reuse only. It's built on **Base UI**, and mixing primitive libraries with our Radix-based components is banned. |
| [shadcnstore/shadcn-dashboard-landing-template](https://github.com/shadcnstore/shadcn-dashboard-landing-template) | MIT | Active | Vite version available. Dashboard section composition and settings page layout | Pattern reference only. It also uses **Base UI**, and its visual is a generic template. |
| [vite-pwa/vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) | MIT | Active (v2.0.0) | Manifest generation, Workbox `generateSW`, the `virtual:pwa-register/react` hook (`useRegisterSW` returns `needRefresh`, `offlineReady`, `updateServiceWorker`), and the prompt-for-update flow | **Dependency.** See PWA_STRATEGY.md. |
| [vite-pwa/assets-generator](https://github.com/vite-pwa/assets-generator) | MIT | Active | Generates favicon, apple-touch, 192/512, and maskable icons from one SVG | **Dev dependency.** |
| [GoogleChrome/workbox](https://github.com/GoogleChrome/workbox) | MIT | Active | Precaching and routing used by the plugin | Transitive dependency. `workbox-window` is a dev dependency, as the plugin requires. |
| [dip/cmdk](https://github.com/dip/cmdk) | MIT | Maintained | Command palette engine behind shadcn `Command` | **Dependency** (via shadcn). |
| [TanStack/table](https://github.com/TanStack/table) | MIT | Active (npm latest **9.3.1**) | Headless sorting, filtering, selection, pagination | **Dependency.** Phase 3 checks v9 against the shadcn data-table guide, which was written for v8. If incompatible, pin `^8`. |
| [TanStack/virtual](https://github.com/TanStack/virtual) | MIT | Active | Row virtualization | **Not added** unless a real sheet exceeds about 500 rows and pagination proves insufficient. |
| [recharts/recharts](https://github.com/recharts/recharts) | MIT | Active | Charts, via the shadcn `Chart` wrapper | **Dependency**, lazy-loaded. |
| [tremorlabs/tremor](https://github.com/tremorlabs/tremor) | Apache-2.0 | Last push Oct 2025 | Restrained chart styling (thin bars, muted axes, legend-as-filter) | Visual reference only. Copying would need the Apache NOTICE, and we don't copy. |
| [emilkowalski/sonner](https://github.com/emilkowalski/sonner) | MIT | Active | Toasts | **Dependency** (installed). |
| [emilkowalski/vaul](https://github.com/emilkowalski/vaul) | MIT | **README says "This repo is unmaintained"** | Drag-to-dismiss bottom drawers (shadcn `Drawer`) | **Rejected.** Mobile sheets use shadcn `Sheet` (Radix Dialog), `side="bottom"`. |
| [pacocoursey/next-themes](https://github.com/pacocoursey/next-themes) | MIT | Maintained | Theme switching without a flash of the wrong theme, and it works in Vite | **Dependency** (installed). |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) | MIT | Active | Accessible primitives under shadcn | **Dependency** (installed). |
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) | **ISC** (GitHub shows "NOASSERTION"; the LICENSE file was read directly) | Active | Icon family | **Dependency** (installed). |
| [vercel/geist-font](https://github.com/vercel/geist-font) | OFL-1.1 | Active | UI and mono typefaces | **Dependency** via `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` (OFL-1.1, v5.3.0). |
| [rsms/inter](https://github.com/rsms/inter) | OFL-1.1 | — | Phase 1 font | **To be removed** in Phase 2. |
| `tw-animate-css` (npm) | MIT | v1.4.0 | Provides the `animate-in` / `fade-in` classes that shadcn components already use | **Missing from Phase 1**, so dialog animations are currently no-ops. Added in Phase 2. |
| [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter), [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) | MIT | Active | Theme presets, keyboard shortcut handling, dashboard composition | Pattern reference only (Next.js and TypeScript). |
| [refinedev/refine](https://github.com/refinedev/refine), [marmelab/react-admin](https://github.com/marmelab/react-admin) | MIT | Active | Full admin frameworks | **Rejected.** Too heavy for a single-user SPA, and they impose data-provider abstractions we don't need. |

### 2.1 Product references (studied for patterns, no assets used)

| Product | Pattern taken |
|---|---|
| **Linear** | Inset content panel on a slightly darker app background. A 13–14 px dense UI, keyboard-first with `Ctrl/⌘ K`, quiet sidebar with muted icons, status shown by small glyphs plus text, and one-line page headers. |
| **Raycast** | A command palette that is the fastest way to do anything: grouped results, action hints on the right, `↵` to run, and `Esc` to go back. |
| **Vercel** | Monochrome primary buttons, hairline borders over shadows, mono for IDs and timestamps, a status dot plus text for deployment-like states, and minimal charts. |
| **Attio** | Table as the primary surface, saved views as tabs above the table, a record side panel with a timeline, and inline editable cells. |

## 3. Licensing rules for this repo

1. Only MIT, ISC, Apache-2.0, or OFL-1.1 dependencies. A `npm run licenses` check is added in Phase 10, using `license-checker-rseidelsohn` (BSD-3-Clause).
2. Any code adapted from an MIT or Apache source keeps its notice in `THIRD_PARTY_NOTICES.md`. Pattern-level inspiration needs no notice, but is documented here.
3. Repositories without a license (`origin-space/ui-experiments`) are never copied from.
4. Fonts are self-hosted from Fontsource packages (the OFL permits embedding).
