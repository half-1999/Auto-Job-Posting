# UI / UX Plan (v2: premium, mobile-first redesign)

Status: Draft for review · Version 0.2
Companion docs: [WIREFRAMES.md](./WIREFRAMES.md) (desktop and mobile wireframes), [PWA_STRATEGY.md](./PWA_STRATEGY.md) (install, offline, update UX), [DESIGN_REFERENCES.md](./DESIGN_REFERENCES.md) (skills, repositories, licenses)

---

## 1. Design read and principles

**Design read**: a single-user productivity tool and lightweight CRM for a job seeker, with a quiet Linear/Attio product language. It is built on owned shadcn/ui components and Tailwind v4 tokens.

**Dials** (Taste skill vocabulary): `DESIGN_VARIANCE 3` (predictable product layout), `MOTION_INTENSITY 3` (feedback and state transitions only), `VISUAL_DENSITY 6` on desktop and 4 on mobile.

**Principles**

1. **The table is the product.** Applications and history are dense, fast, keyboard-friendly lists. Charts support decisions; they're not decoration.
2. **Quiet chrome, meaningful color.** Neutral surfaces and a monochrome primary button. One cobalt accent, used only for focus, selection, links, and the primary data series. Green, amber, and red appear only for real state.
3. **One container level.** The app background holds the navigation. Content sits on a single inset panel. Inside the panel, structure comes from spacing, type, and hairlines, not nested cards.
4. **Every action has a visible result.** Pressed, loading, success, and failure states for every control. Success is shown only after an API 2xx response.
5. **No surprise sends.** Outbound actions are always reviewed, confirmed, and visibly different from navigation.
6. **Mobile is designed, not shrunk.** On phones, navigation, selection, editing, and confirmation each have their own touch-first patterns (§7).
7. **Keyboard parity.** Everything reachable by mouse is reachable by keyboard, and the command palette reaches everything.

**Explicitly avoided**: gradient fills and gradient text, glassmorphism on content, rows of colorful KPI cards, nested rounded containers, decorative status dots, oversized headings, emoji icons, perpetual animations, "Acme / John Doe" mock data, placeholder lorem text, and em-dashes in UI copy.

## 2. Token system

All tokens are CSS custom properties in `src/index.css` (OKLCH, per shadcn CLI v4 guidance). They're exposed to Tailwind through `@theme inline`. Components never use raw hex or palette classes like `bg-blue-500`.

### 2.1 Color: neutrals (cool zinc family, hue 286; one palette for the whole app)

| Token | Role | Light | Dark |
|---|---|---|---|
| `--canvas` | App background behind the panel, sidebar | `oklch(0.975 0.002 286)` | `oklch(0.135 0.004 286)` |
| `--background` | Content panel, inputs | `oklch(0.995 0 0)` | `oklch(0.165 0.004 286)` |
| `--muted` | Hover rows, table header, segmented track | `oklch(0.967 0.002 286)` | `oklch(0.2 0.005 286)` |
| `--accent` (shadcn name, means "selected surface") | Selected row, pressed item, active nav | `oklch(0.94 0.004 286)` | `oklch(0.24 0.006 286)` |
| `--border` | Hairlines, inputs | `oklch(0.915 0.004 286)` | `oklch(1 0 0 / 8%)` |
| `--border-strong` | Input hover, dividers in dense areas | `oklch(0.86 0.006 286)` | `oklch(1 0 0 / 14%)` |
| `--foreground` | Primary text | `oklch(0.21 0.006 286)` | `oklch(0.96 0.002 286)` |
| `--muted-foreground` | Secondary text (≥ 4.5:1 on background) | `oklch(0.5 0.012 286)` | `oklch(0.72 0.01 286)` |
| `--subtle-foreground` | Placeholders, disabled labels (≥ 4.5:1 on background) | `oklch(0.56 0.01 286)` | `oklch(0.64 0.01 286)` |
| `--primary` / `--primary-foreground` | Primary buttons (monochrome) | `oklch(0.21 0.006 286)` / `oklch(0.985 0 0)` | `oklch(0.96 0.002 286)` / `oklch(0.2 0.006 286)` |

### 2.2 Color: accent and semantic

| Token | Use | Light | Dark |
|---|---|---|---|
| `--brand` (cobalt) | Focus ring, selection checkbox, links, active nav indicator, primary chart series, "Sending" state | `oklch(0.53 0.17 258)` | `oklch(0.72 0.13 255)` |
| `--success` | Sent → Replied, Offer, connected | `oklch(0.5 0.13 152)` | `oklch(0.74 0.14 152)` |
| `--warning` | Expiring session, Auto-Reply, Uncertain, offline | `oklch(0.52 0.12 65)` | `oklch(0.8 0.13 75)` |
| `--destructive` | Failed, Bounced, Rejected, delete | `oklch(0.55 0.2 27)` | `oklch(0.7 0.17 25)` |

- All semantic tokens meet **≥ 4.5:1 as text** on `--background` in their theme. Badge fills use `color-mix(in oklch, var(--x) 10%, transparent)` with the token as text.
- **Ring**: `--ring: var(--brand)`, 2 px plus a 2 px offset in `--background`.
- **Charts**: `--chart-1: var(--brand)` (sent), `--chart-2: var(--success)` (replies), `--chart-3: var(--destructive)` (failed), `--chart-4: var(--muted-foreground)` (other). Series are also distinguished by line style (solid, dashed) and by direct labels, never by hue alone.
- **Theme color meta**: light `#f6f6f8`, dark `#08080a`, matching `--canvas`, so mobile browser chrome blends with the app.

### 2.3 Typography (Geist Sans and Geist Mono, self-hosted, Latin subset preloaded)

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-xs` | 12 / 16 | 400–500 | Meta, timestamps, badge labels, axis labels |
| `text-sm` | 13 / 20 | 400–500 | Table cells, secondary UI, sidebar items |
| `text-base` (desktop) | 14 / 20 | 400 | Default UI text |
| `text-md` | 16 / 24 | 400 | **Mobile body and all inputs on touch devices** (prevents iOS zoom on focus), email preview body |
| `text-lg` | 18 / 26 | 600 | Section titles, mobile page titles |
| `text-xl` | 20 / 28 | 600 | Desktop page titles (the largest heading in the app) |
| `text-2xl` | 24 / 30 | 600, `tabular-nums` | KPI values only |

- Letter-spacing `-0.011em` at 18 px and above, `0` below. Mono (Geist Mono 13/20) for IDs, placeholders (`{{job_title}}`), email addresses in dense tables, and timestamps in logs.
- Reading width for email previews and long text: `max-w-[68ch]`.

### 2.4 Spacing (4 px base)

Scale: `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64`.

| Semantic | Mobile (< 768) | Tablet (768–1279) | Desktop (≥ 1280) |
|---|---|---|---|
| Page gutter | 16 | 24 | 32 |
| Section gap | 24 | 28 | 32 |
| Control gap (inline) | 8 | 8 | 8 |
| Form field stack | 16 | 16 | 20 |
| Table row height | list rows ≥ 56 | 44 | 36 (compact), 44 (comfortable setting) |

### 2.5 Radius (shape lock)

| Token | Value | Applies to |
|---|---|---|
| `--radius-control` | 6 px | Buttons, inputs, selects, segmented controls, nav items, row hover |
| `--radius-panel` | 8 px | Content panel, popovers, menus, KPI strip, chart blocks, toasts |
| `--radius-overlay` | 12 px | Dialogs, command palette, bottom sheets (top corners only) |
| `rounded-full` | pill | Status badges, avatars, the switch track |

Nothing else may be rounded, and containers never nest rounded borders.

### 2.6 Elevation

| Token | Light | Dark |
|---|---|---|
| `--shadow-pop` (popover, menu, toast) | `0 1px 2px oklch(0.2 0.01 286 / 6%), 0 4px 16px oklch(0.2 0.01 286 / 8%)` | `0 0 0 1px oklch(1 0 0 / 8%), 0 8px 24px oklch(0 0 0 / 40%)` |
| `--shadow-modal` (dialog, palette, sheet) | `0 2px 4px oklch(0.2 0.01 286 / 6%), 0 16px 48px oklch(0.2 0.01 286 / 14%)` | `0 0 0 1px oklch(1 0 0 / 10%), 0 24px 64px oklch(0 0 0 / 55%)` |
| Scrim | `oklch(0.2 0.01 286 / 40%)` | `oklch(0 0 0 / 60%)` |

Cards and panels have no shadow, only a 1 px border.

### 2.7 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 80 ms | `:active` feedback (`scale-[0.98]` on buttons, background shift on rows) |
| `--dur-fast` | 120 ms | Hover color, checkbox, switch |
| `--dur-base` | 180 ms | Popover, tooltip, tabs indicator, toast enter |
| `--dur-slow` | 240 ms | Dialog, sheet, drawer, palette enter |
| exit | 0.7 × enter | All exits are faster than entries |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Entering |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting |

- Implementation: CSS transitions plus `tw-animate-css` (the classes shadcn already emits). **No animation library.**
- Only `transform` and `opacity` are animated. Under `prefers-reduced-motion: reduce`, transforms are removed and opacity fades are capped at 80 ms.
- Every animation answers "what changed?" (an overlay opened, a row was sent, a filter applied). There are no idle loops; the only exception is the spinner on an in-flight action.

### 2.8 Icons, z-index, breakpoints

- **Icons**: Lucide only, tree-shaken named imports. `stroke-width: 1.75` globally. Sizes are `--icon-sm 14` (dense tables), `--icon-md 16` (default), and `--icon-lg 20` (mobile nav, empty states). Decorative icons get `aria-hidden`; icon-only buttons get `aria-label` plus a tooltip on desktop.
- **Z-index scale** (in `lib/constants.js`): `sticky 10 · header 20 · bottomBar 30 · overlay 40 · modal 50 · toast 60`.
- **Breakpoints**: Tailwind defaults (`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`) plus a custom `desk: 1440px`. Styles are written mobile-first; the base is 320 px.

## 3. App shell and navigation

### 3.1 Navigation config (single source)

`src/app/navigation.js` exports one array (id, label, path, icon, group, shortcut, `mobileTab: boolean`). The sidebar, mobile drawer, bottom tab bar, command palette, and breadcrumbs all read it, so nothing is duplicated (pattern from shadcn-admin).

| Group | Item | Shortcut | Mobile bottom tab |
|---|---|---|---|
| Workspace | Dashboard | `G` then `D` | Yes |
| Workspace | Applications | `G` then `A` | Yes |
| Workspace | Campaigns | `G` then `C` | Yes |
| Workspace | Templates | `G` then `T` | No |
| Data | Email History | `G` then `H` | Yes |
| Data | Reports | `G` then `R` | No |
| Data | Google Sheets | `G` then `S` | No |
| (footer) | Settings | `G` then `,` | No |

### 3.2 Desktop (≥ 1024 px)

- **Sidebar** on `--canvas`: 232 px, or a 52 px icon rail (toggle with `[`, the state is remembered). It's built on the shadcn `Sidebar` with `collapsible="icon"`.
  - Top: app mark and "JobApply", plus a search trigger styled as an input showing `Ctrl K`.
  - Groups use 12 px muted labels. Items are 32 px tall (13 px text, 16 px icon), and the active item has an `--accent` fill and `--foreground` text.
  - Footer: sync status row ("Synced 4 min ago"), then the profile button (avatar, name, connection glyph).
- **Content panel**: inset 8 px from the canvas edges, 8 px radius, 1 px border, `--background`. It scrolls independently, and the sidebar never scrolls with the content.
- **Page header** (inside the panel, sticky, 52 px): title (20 px) with an optional count ("Applications 128"), then on the right: secondary actions, the primary action, and the notification bell.
- **Skip link** "Skip to content" is the first focusable element.

### 3.3 Tablet (768–1023 px)

- The sidebar defaults to the icon rail (labels appear in tooltips). Clicking the logo opens the full sidebar as an overlay sheet.
- Detail panels (application record, template preview) open as right sheets at 420 px instead of an inline third column.

### 3.4 Mobile (< 768 px)

- **Compact header** (48 px plus `env(safe-area-inset-top)`): menu button (opens the drawer), page title (16 px, 600), then on the right the search button and the sync or offline glyph. The header hides on scroll down and reappears on scroll up, but **only on list pages**. It's implemented with IntersectionObserver, not a scroll listener.
- **Bottom tab bar** (56 px plus `env(safe-area-inset-bottom)`): Dashboard, Applications, Campaigns, History, **Menu**. Icons are 20 px with 11 px labels; every target is at least 48 × 48. "Menu" opens the drawer.
- **Navigation drawer** (left `Sheet`, 85 vw, max 320 px):
  - Profile block (avatar, email, connection state).
  - Every nav item from the config.
  - **Install app** (when available, see PWA_STRATEGY.md), theme switcher (segmented), and Settings.
  - The drawer closes on navigation, on scrim tap, and on `Esc`. Focus returns to the menu button.
- **Primary action placement**: a sticky bottom action bar sits above the tab bar for flows that end in a commit, such as "Review 5 recipients", "Save template", or "Sync now". There are no floating action buttons.
- **Back behavior**: every full-screen sheet that represents content (application detail, template editor, campaign step) is a real route. The browser or hardware back button closes it (UI UX Pro Max navigation rule).
- **No horizontal page overflow** at 320 px. Wide content (the column-mapping table) scrolls inside its own container with an edge fade.

## 4. Global UI elements

| Element | Desktop | Mobile | Behavior and states |
|---|---|---|---|
| **Command palette** (cmdk via shadcn `Command`) | `Ctrl/⌘ K` or `/`. Centered 640 px, 12 px radius | Search button opens a full-screen sheet with the input autofocused | Groups: **Go to** (pages), **Actions** (Sync now, New campaign, New template, Check replies, Toggle theme, Install app, Reconnect Google), **Applications** (search company, recruiter, title, email), **Templates**. Right-aligned shortcut hints. `↵` runs, `Esc` closes or goes back. Shows the 5 most recent items when empty. Results are searched from in-memory data only (no network). |
| **Global search** | The same palette, opened in "Applications" scope via the sidebar search field | Same | Matches are highlighted. "Show all results in Applications" applies the query as the table filter. |
| **Notification center** | Bell in the page header with an unread count (a number badge, not a dot). Popover 360 px | Bell in the drawer header, and a full-screen sheet | **In-app events only** (no push): sync finished or failed, campaign finished (N sent, M failed), replies found, pending sheet updates, update available, session expiring. Stored in LocalStorage (latest 50). Actions: mark all read, and click-through to the relevant page or filter. Count announced via `aria-live="polite"`. |
| **Profile menu** | Sidebar footer button opens a dropdown | Drawer profile block | Email and name, Google connection (Connected, Expiring in N min, Expired, Disconnected), granted permissions, **Install app**, Theme, Keyboard shortcuts, Settings, Disconnect. |
| **Theme switcher** | Profile menu (Light, Dark, System radio) and the command palette | Segmented control in the drawer | Applied without a flash (next-themes `class` strategy). Also updates `<meta name="theme-color">`. |
| **Sync status indicator** | Sidebar footer row plus the page header on Applications | Header glyph; tapping opens a small sheet | States: **Synced** (relative time, refreshes every minute), **Syncing** (spinner, "Reading 128 rows"), **Sync failed** (warning icon, "Retry"), **Offline** ("Showing data from 10:42"), **Not connected**. Clicking runs Sync now. |
| **Connection indicators** | Profile button glyph plus the Settings → Google account panel | Drawer profile block | Google: connected, expiring, expired, disconnected. Sheet: connected, no access, not set. Network: online, offline. Each state uses an icon **and** text, never color alone. |
| **Toasts** (sonner) | Bottom right, max 3 visible | Top center, under the header, so they don't collide with the tab bar | Success auto-dismisses after 4 s. Errors persist and have "Details". Promise toast for sync. Undo for reversible actions (delete template, mark Do Not Email). |
| **Confirmation dialogs** | `AlertDialog` (480 px) | Bottom `Sheet` with full-width buttons, primary at the bottom (thumb reach) | Destructive or outbound actions name the exact effect ("Delete template", "Send 12 emails"). The send dialog requires a checkbox. `Esc` is disabled while a send is in flight. |
| **Skeleton loaders** | Shaped like the final layout (KPI strip, table rows, chart frame) | Shaped like the list rows | Shown only when there's no cached data. With a snapshot present, data renders immediately and a 2 px top progress bar shows refresh. |
| **Onboarding** | Full-page setup route `/welcome` (not a modal) with a 4-step left rail | Single column, one step per screen, progress text "Step 2 of 4" | Steps: **Connect Google**, then **Choose your sheet**, then **Map columns**, then **First sync**. Optional afterwards: sender profile and resume. Each step explains why the permission is needed in one sentence. You can leave and return, and progress is remembered. Afterwards, the Dashboard shows a dismissible setup checklist until profile and resume are done. |
| **Offline, install, update** | See PWA_STRATEGY.md §6 | Same | Offline banner, "Back online" toast, update-available toast with Reload, install modal. |
| **Keyboard shortcuts sheet** | `?` | Not shown | Lists all shortcuts, generated from the navigation config plus page actions. |

## 5. Pages

Each page lists its purpose, the desktop and mobile layouts, interactions, and states. Wireframes are in WIREFRAMES.md.

### 5.1 Dashboard `/`
- **Purpose**: answers "what needs my attention, and how is outreach going?" in one screen.
- **Desktop**:
  - Header: "Dashboard", Sync now (secondary), New campaign (primary).
  - **KPI strip**: one bordered panel with 5 segments divided by hairlines. Applications, Emails sent, Failed, Replies, Reply rate. Each segment shows the value (24 px), label (12 px), and the change versus the previous 30 days (12 px, an arrow icon plus text).
  - Two columns (7/5) below:
    - Left: **Needs attention** list (failed sends, uncertain replies, pending sheet updates, invalid rows from the last sync, session expiring), each with an inline action. Then **Weekly activity** (12-week bars, sent versus replies).
    - Right: **Pipeline** (a single horizontal stacked bar of application statuses plus a legend with counts) and **Recent activity** (last 8 Email_Log events).
- **Mobile**: KPI strip as a 2 × 2 grid with Reply rate full width, inside one bordered block. The order is Needs attention, KPIs, Weekly activity, Pipeline, Recent activity. The chart is full width at 180 px height, and its labels are reduced to every other week.
- **Interactions**: a KPI segment links to a filtered Applications or History view. Attention items run their action inline (Retry, Verify in Gmail, Reconnect).
- **States**: first run shows the setup checklist in place of the attention list, and KPIs show "-" (never 0 before the first sync). Loading uses a skeleton strip and frames. A sync error shows an inline alert above the KPIs.

### 5.2 Google Sheets `/sheets`
- **Purpose**: connect, verify, and remap the source sheet. Sync status lives here too.
- **Desktop**:
  - **Connection summary**: spreadsheet title (linked to Google Sheets), tab name, last sync, and counts (imported, skipped, invalid) as a definition list. Actions: Sync now, Change sheet, Edit mapping.
  - **Column mapping**: a table with three columns: Sheet header, Maps to (select), and Sample values (3 values, mono). Required fields are marked "Required" in text.
  - **Last sync report**: invalid rows with a reason and row number, plus "Open row in Sheets" links.
- **Setup flow** (first time, or Change sheet): URL input (paste-friendly, validates as you type, shows the extracted ID), then the worksheet list (radio list with row counts), then mapping (auto-mapped, with changes highlighted), then the confirmation to add missing system columns (lists exactly which headers will be appended), then Save and sync.
- **Mobile**: the summary is a stacked list. Mapping becomes one row per app field, each with the sheet column `Select` and sample values below it. No table.
- **States**: no access (403) shows an inline error with "Check sharing" guidance. A tab that no longer exists triggers the re-select flow. Offline disables Sync now with a "Needs a connection" note.

### 5.3 Applications `/applications` and `/applications/:id`
- **Desktop**:
  - Header: "Applications 128", then Import status (the sync indicator) and Email selected (primary, enabled when rows are selected).
  - **Saved views** as tabs: All, Not contacted, Awaiting reply, Replied, Needs attention, with counts.
  - **Toolbar**: search (debounced 150 ms), faceted filters (Application status, Email status, Reply status, Template) as popover checklists with counts, column visibility, density toggle.
  - **Table** (TanStack): checkbox, Company and Role (two lines), Recruiter (name and mono email), Status (inline `Select` writing to the sheet), Email, Reply, Last sent (relative, absolute in a tooltip), and a row menu.
  - Sticky header. Pages of 50 with a "1–50 of 128" pager.
  - **Bulk bar** slides up from the bottom of the panel when rows are selected: "3 selected", Email, Mark Do Not Email, Clear.
- **Detail** (`/applications/:id`): a right sheet (480 px) with all fields, editable user fields (status, notes), a **timeline** from Email_Log (sent, reply detected, failures), and links to "Open in Sheets" and "Open thread in Gmail".
- **Mobile**:
  - A **list** replaces the table. Each 64 px row shows Company (600) and Role (muted) on the left; on the right, the last sent date and a reply glyph with text; below, a badge row (Email status, Reply status).
  - Search field is sticky under the header, with a **Filter** button opening a bottom sheet (status chips at least 44 px, plus Apply and Reset). Views appear as horizontally scrolling chips.
  - **Selection mode**: a "Select" button in the header switches rows to show 44 px checkboxes, and a bottom action bar shows "Email 3", "Do Not Email", and "Cancel". Tapping a row outside selection mode opens the detail as a full-screen route.
  - "Show 50 more" replaces pagination.
- **States**:
  - Empty before connecting: an empty state with "Connect a sheet".
  - Empty after a filter: "No applications match these filters" with Clear filters.
  - Loading: 8 skeleton rows. Error: an inline alert with Retry.

### 5.4 Email Campaigns `/campaigns`, `/campaigns/new`, `/campaigns/:id`
- **List**: past campaigns grouped from Email_Log (date, template, sent / failed / replied counts, duration). New campaign is the primary action. Empty state: "Send your first campaign" with a short explanation of the review steps.
- **Composer** `/campaigns/new` (also reached from "Email selected"). Steps: **Recipients**, **Message**, **Attachment**, **Review**.
  - Desktop: step rail on the left (240 px) showing completion state, content in the center, a summary column on the right (recipients, template, attachment, estimated duration, daily limit used).
  - Mobile: a segmented progress header ("Recipients · 2 of 4"), a single column, and a sticky bottom bar with Back and Continue. The summary is collapsed into a "Summary" disclosure.
  - **Recipients**: selectable list (search, filter chips) with excluded rows shown in a collapsed "8 excluded" section, each with its reason (Already sent, Do Not Email, Invalid email, Emailed 3 days ago). Mobile rows have 44 px checkbox targets, and the whole row toggles selection. "Select all eligible" is available.
  - **Message**: template picker (desktop: a list with subject preview; mobile: a bottom sheet list). Then subject and body editors (the same editor component as Templates), with "Changes apply to this campaign only".
  - **Attachment**: resume chip (name, size, saved date) with Replace and Remove. Upload is a drop zone on desktop and a file button on mobile. PDF only, ≤ 5 MB, with an inline error.
  - **Review**: a per-recipient preview pager ("3 of 12", previous and next, with the recipient list on desktop), shown as an email card (From, To, Subject, body at 16 px, attachment chip). Warnings for unresolved placeholders block the affected recipient with a "Fix in template" link. Ends with **Send test to me** and **Send 12 emails**.
  - **Confirm**: see §4 Confirmation dialogs. The dialog shows the count, template, attachment, From, pace, estimated time, today's usage, and exclusions, plus a checkbox "I reviewed the previews".
- **Sending view** `/campaigns/:id` (live):
  - Progress header (bar and "4 of 12 sent", with the next send countdown), plus Pause and Cancel.
  - A live list with per-recipient state (queued, sending, sent, failed with reason), plus "Keep this tab open" guidance and a Screen Wake Lock when supported.
  - On completion: a summary (sent, failed), **Retry failed**, and View in History.
- **States**: session expiring before start triggers a pre-flight block with Reconnect. Offline pauses the campaign with "Paused: offline" and Resume only after approval (PWA_STRATEGY §5). The daily limit reached stops the campaign with an explanation.

### 5.5 Email Templates `/templates`, `/templates/:id`
- **Desktop ≥ 1280**: three panes. Template list (240 px: name, subject preview, "Default" label), then the editor, then a live preview (420 px). At 1024–1279 there are two panes, with preview as a tab.
- **Editor**:
  - Name; Subject (single line, with a character count past 70); Body (auto-growing textarea, Geist Mono optional toggle).
  - **Toolbar** above the body: **Insert variable** (popover list with descriptions and sample values), plus Preview recipient (select an application or sample).
  - Typing `{{` opens the same variable list at the caret (keyboard navigable, `↵` inserts).
  - Unknown or empty placeholders are underlined in the preview, with a warning count.
  - Autosaves (debounced 800 ms) with a "Saved" status, and Undo via toast for delete.
- **Mobile**: the list screen, then the editor screen (full-screen route) with a segmented **Edit / Preview** control at the top. The toolbar is a horizontally scrollable row (Insert variable, Preview as, Mono) that stays sticky at the top of the scroll area. Insert variable opens a bottom sheet. Inputs are 16 px. Duplicate and Delete sit in an overflow menu.
- **States**: deleting the last template is blocked with an explanation. Defaults can be restored from Settings → Data.

### 5.6 Email History `/history`
- **Desktop**: table from Email_Log: time, recipient (name and email), company, subject, template, result, reply status, and a Gmail link. Filters for result, reply status, date range, and campaign. Primary action: **Check replies**. The first time, a dialog explains the extra read-only metadata permission and what it can and can't see.
- **Mobile**: grouped by day ("Today", "Yesterday", "Mon 2 Nov") with compact rows. Filters in a bottom sheet. Check replies sits in the header overflow.
- **Interactions**: checking shows progress ("Checking 34 threads"), and each row's reply badge updates as it resolves. Uncertain rows show the reason and a "Verify in Gmail" link.

### 5.7 Reports `/reports`
- **Desktop**:
  - Range control (Last 12 weeks, Last 12 months, Custom) and Export (CSV menu: Applications, Email log).
  - KPI strip (as on the Dashboard, for the selected range). Activity chart (bars for weeks, line for months: sent, replies, failed).
  - Status breakdown (horizontal bars with counts and percentages, not a donut). Reply rate by template (a small table with an inline bar, no background track).
- Each chart has a **View as table** toggle and a one-sentence text summary ("Replies rose from 3 to 7 over the last 4 weeks"), computed from the data.
- **Mobile**: one column, with range as a segmented control. Charts are 200 px tall and horizontally readable (fewer ticks). Tables appear in place of charts on screens under 360 px wide.
- Recharts is lazy-loaded for this route and for the Dashboard chart block.

### 5.8 Settings `/settings/:section`
- **Desktop**: left sub-navigation (Profile, Resume, Sending, Google account, Notifications, Appearance, Install app, Data & storage, Keyboard shortcuts, About) with content at max 640 px. Each section is a form with labels above inputs and a Save bar that appears when there are changes.
- **Mobile**: the section list, then a section screen with a sticky Save bar.
- **Highlights**:
  - **Google account**: granted scopes in plain language, Reconnect, Grant reply-tracking permission, Disconnect.
  - **Install app**: see PWA_STRATEGY §4.
  - **Data & storage**: an offline snapshot toggle, Clear local data (lists exactly what is removed), and export or import templates.
  - **About**: version, Check for update, and licenses (THIRD_PARTY_NOTICES).

## 6. Interaction specification

| Interaction | Specification |
|---|---|
| Hover (pointer: fine) | Rows and items get `--muted`. Buttons shift background one step. 120 ms. No hover-only affordances: every hover action also exists in a menu. |
| Press | Buttons `scale-[0.98]` for 80 ms; rows shift background. Layout bounds never change. |
| Focus | 2 px `--brand` ring with a 2 px offset on every focusable element, never removed. Focus is not obscured by sticky bars (scroll-padding equals header plus bar height). |
| Selection | Checkbox in `--brand`, and the row gets an `--accent` fill. `Shift`-click selects a range on desktop. `Space` toggles on a focused row. |
| Keyboard in tables | `↑/↓` moves row focus, `↵` opens detail, `x` toggles selection, `e` emails the selection, `/` focuses search. |
| Inline edit (status) | Select opens, change writes, an optimistic badge with a spinner is shown, then confirmed on 2xx, or reverted with an error toast. |
| Async buttons | The label stays, an inline spinner replaces the icon, and the button is disabled. Successes show a toast or inline confirmation, never a silent change. |
| Destructive | Confirm with an exact label, or provide Undo when the action is reversible locally. |
| Forms | Validate on blur, then live after the first error. Errors appear below the field and are linked with `aria-describedby`. On submit, the first invalid field is focused. |
| Long operations | Determinate progress whenever the total is known (sync rows, campaign sends, reply checks). |
| Empty states | Icon (20 px, muted), a one-line title, one sentence, and one action. Never a decorative illustration. |

## 7. Mobile-first specification

| Device class | Width | Layout rules |
|---|---|---|
| Small phone | 320–375 | Single column, 16 px gutter, bottom tab bar, list rows, KPI 2 × 2, charts 180 px, dialogs as bottom sheets, and no side-by-side form fields. Verified at **320** with no horizontal overflow. |
| Standard phone | 390–430 | Same, with KPI labels at full length. |
| Tablet | 768–1024 | Icon-rail sidebar, 24 px gutter, table with essential columns (Company/Role, Status, Email, Reply), detail as a right sheet, two-column dashboard from 900 px. |
| Laptop | 1280 | Full sidebar, all columns, two-pane templates. |
| Desktop | ≥ 1440 | Three-pane templates, content max width 1440 inside the panel, wider tables. |

- **Touch targets**: at least 44 × 44 (48 for the tab bar) under `pointer-coarse:`, with 8 px minimum spacing between targets. Visually small icons get padded hit areas.
- **Inputs**: 16 px font on touch, the correct `type` and `inputmode` (`email`, `url`, `numeric`), `autocomplete` attributes, and `enterkeyhint` (Next, Done, Search).
- **Safe areas**: `viewport-fit=cover`, with `env(safe-area-inset-*)` applied to the header, tab bar, bottom sheets, and the sticky action bar. Content gets a bottom inset equal to bar heights.
- **Gestures**: none are required. No swipe-only actions; every action has a visible button. Bottom sheets close by scrim tap, Close button, `Esc`, or back.
- **Keyboard on mobile**: the sticky action bar hides while the virtual keyboard is open (detected via `visualViewport` resize) so it never covers the focused field.
- **Performance on phones**: charts render after the list (lazy), and there are no layout-shifting skeleton swaps (reserved heights).

## 8. Accessibility

- WCAG 2.2 AA: contrast verified per token pair in both themes (Phase 2 test script), non-text contrast ≥ 3:1 for borders of inputs and focus rings.
- Landmarks: `nav` (sidebar and tab bar), `main`, `header`. One `h1` per page, and a sequential heading order.
- Every icon-only control has an accessible name. Toggles expose `aria-pressed` or `aria-expanded`. Sort headers expose `aria-sort`.
- Live regions: sync progress, campaign progress, and the notification count (`polite`). Send errors use `assertive`.
- Dialogs and sheets trap focus and return it to their trigger. The palette is a `combobox` pattern (cmdk).
- Color is never the only signal: status badges always have text, and failure states add an icon.
- Reduced motion is respected. Text scales to 200% browser zoom without loss of function.

## 9. Content and copy rules

- Name exact actions: "Send 12 emails", "Sync now", "Add 7 missing columns". Never "Submit" or "OK".
- Errors say what happened, then what to do: "Gmail rejected priya.raman@ (no domain). Fix the address in your sheet, then retry."
- No em-dashes or en-dashes in UI strings (Taste §9.G). Use periods, commas, or colons. This is enforced by `npm run lint:copy`, which greps `src/**/*.jsx` for `—` and `–`.
- Mock data (Phase 3 only) uses realistic Indian and international names and companies, is labeled "Mock data" in the header, and never claims real metrics.
- Relative times ("4 min ago") always have the absolute time in a tooltip or `title`.

## 10. Phase 1 deltas this plan changes

| Phase 1 state | v2 decision | Reason |
|---|---|---|
| Inter + JetBrains Mono | Geist + Geist Mono | Taste §4.1, Vercel reference, one family with a matching mono |
| Indigo primary `#4F46E5` | Monochrome primary + cobalt `--brand` accent | Taste §4.2 Lila rule, Linear and Vercel reference |
| Hex tokens | OKLCH tokens with `--canvas`, `--border-strong`, `--subtle-foreground`, motion, radius, and shadow tokens | shadcn v4 guidance (UI UX Pro Max stack result) |
| `tw-animate-css` missing | Added | shadcn `animate-in` classes are currently no-ops |
| `--info` status color | Merged into `--brand` | One accent; fewer colors |
| Design-system showcase as the app root | Moved to a dev-only route `/_design` | It becomes a living style guide, not the product |
| `StatCard` (one card per metric) | Replaced by a `KpiStrip` (one panel, segmented) | Avoids a row of cards |

## 11. Pre-delivery checklist (merged from Taste §14 and UI UX Pro Max `pro-rules.md`, web-relevant items)

- [ ] Both themes reviewed on every page, and contrast pairs pass (script plus manual check).
- [ ] 320, 375, 390, 430, 768, 1024, 1280, and 1440 widths checked, with no horizontal overflow.
- [ ] All touch targets at least 44 px on touch devices, and safe areas respected.
- [ ] Keyboard-only pass: skip link, palette, table, dialogs, and sheets.
- [ ] Reduced motion on: no transform animations.
- [ ] One accent, one radius system, one icon family with consistent stroke.
- [ ] No em-dashes in UI copy (`lint:copy` passes), no placeholder text, and mock data is labeled.
- [ ] Every data view has designed loading, empty, error, and offline states.
- [ ] No success UI without a real API success.

## 12. Design decisions (confirmed Nov 4, 2026)

1. **Typeface**: Geist and Geist Mono.
2. **Accent**: cobalt.
3. **Mobile navigation**: bottom tab bar plus a drawer behind "Menu".
4. **Manifest orientation**: `any`.
5. **Offline snapshot**: on by default, clearable and switchable in Settings.
6. **UI UX Pro Max CLI**: not installed. Its guidance is captured in DESIGN_REFERENCES.md.
