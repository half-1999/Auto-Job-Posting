# Development Roadmap

Status: Draft for review · Version 0.2 (adds the UI/UX v2 redesign, mobile-first work, and the PWA)

Phase 1 is complete. Implementation resumes at **Phase 2** after this plan is approved.

---

## 1. Folder structure (v2)

```
job-apply-automation/
├─ docs/                                 # planning docs (this folder)
├─ public/
│  ├─ logo.svg                           # source mark for icon generation (Phase 4)
│  └─ (generated) favicon.ico, pwa-*.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png
├─ scripts/
│  └─ lint-copy.js                       # fails on em-dash/en-dash in UI strings
├─ src/
│  ├─ main.jsx                           # root render, early beforeinstallprompt capture
│  ├─ index.css                          # OKLCH tokens, @theme inline, base styles
│  │
│  ├─ app/
│  │  ├─ App.jsx                         # router + lazy routes
│  │  ├─ providers.jsx                   # Theme, Tooltip, Auth, Sheet, Settings, Notifications
│  │  ├─ navigation.js                   # single nav config (sidebar, tabs, drawer, palette)
│  │  └─ shortcuts.js                    # global keyboard shortcuts
│  │
│  ├─ components/
│  │  ├─ ui/                             # shadcn-generated primitives (restyled)
│  │  ├─ layout/                         # AppShell, AppSidebar, ContentPanel, PageHeader,
│  │  │                                  # MobileHeader, BottomTabBar, NavDrawer, SkipLink
│  │  ├─ global/                         # CommandPalette, NotificationCenter, ProfileMenu,
│  │  │                                  # SyncStatus, ConnectionStatus, OfflineBanner
│  │  └─ common/                         # DataTable, ResponsiveList, KpiStrip, StatusBadge,
│  │                                     # EmptyState, ResponsiveDialog, FilterSheet, Stepper,
│  │                                     # ThemeSwitcher, TimeAgo, ChartFrame, ActionBar
│  │
│  ├─ features/
│  │  ├─ onboarding/    WelcomePage.jsx, steps/*.jsx
│  │  ├─ dashboard/     DashboardPage.jsx, NeedsAttention.jsx, RecentActivity.jsx, PipelineBar.jsx
│  │  ├─ sheets/        SheetsPage.jsx, SheetSetupFlow.jsx, ColumnMapper.jsx
│  │  ├─ applications/  ApplicationsPage.jsx, ApplicationDetail.jsx, columns.jsx, ApplicationRow.jsx
│  │  ├─ templates/     TemplatesPage.jsx, TemplateEditor.jsx, VariablePicker.jsx, TemplatePreview.jsx, useTemplates.js
│  │  ├─ campaigns/     CampaignsPage.jsx, Composer.jsx, steps/*.jsx, ConfirmSend.jsx,
│  │  │                 SendingView.jsx, useCampaign.js
│  │  ├─ history/       HistoryPage.jsx, useEmailLog.js
│  │  ├─ reports/       ReportsPage.jsx, charts/*.jsx (lazy)
│  │  ├─ settings/      SettingsPage.jsx, sections/*.jsx
│  │  └─ design-system/ DesignSystemPage.jsx   # dev-only route /_design
│  │
│  ├─ pwa/
│  │  ├─ useInstallPrompt.js             # install state machine (PWA_STRATEGY §4)
│  │  ├─ InstallDialog.jsx               # Chromium + iOS + manual variants
│  │  ├─ UpdatePrompt.jsx                # useRegisterSW toasts
│  │  ├─ useOnlineStatus.js
│  │  └─ useWakeLock.js
│  │
│  ├─ context/          AuthContext.jsx, SheetContext.jsx, SettingsContext.jsx, NotificationContext.jsx
│  ├─ services/         http.js, googleAuth.js, sheetsService.js, gmailService.js   # only Google I/O
│  ├─ lib/              constants.js, storage.js, statusTones.js, utils.js, sheetParser.js,
│  │                    validation.js, dedupe.js, templateEngine.js, mime.js, fileStore.js,
│  │                    replyClassifier.js, reportMetrics.js, csv.js, defaultTemplates.js, platform.js
│  ├─ hooks/            use-mobile.js (shadcn), useMediaQuery.js, useKeyboardOpen.js
│  ├─ mocks/            applications.mock.js, emailLog.mock.js   # VITE_USE_MOCKS only
│  └─ test/             setup.js
├─ components.json · vite.config.js · jsconfig.json · vercel.json · .env.example · package.json
└─ THIRD_PARTY_NOTICES.md                # added in Phase 10
```

Layering is unchanged. Components never import `services/`. `lib/` is pure. `pwa/` holds browser-capability code (install, network, wake lock) and makes no Google calls.

## 2. Dependencies (v2 changes)

| Change | Package | License | Phase |
|---|---|---|---|
| Add | `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` | OFL-1.1 | 2 |
| Remove | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | — | 2 |
| Add | `tw-animate-css` (missing from Phase 1; shadcn animations depend on it) | MIT | 2 |
| Add | `cmdk` (via `shadcn add command`) | MIT | 2 |
| Add | `@tanstack/react-table` (check v9 against the shadcn guide, or pin `^8`) | MIT | 3 |
| Add (dev) | `culori` (contrast test for OKLCH token pairs) | MIT | 2 |
| Add | `vite-plugin-pwa` | MIT | 4 |
| Add (dev) | `workbox-window`, `@vite-pwa/assets-generator` | MIT | 4 |
| Add (dev) | `license-checker-rseidelsohn` | BSD-3-Clause | 10 |

Still not used: animation libraries (Motion or GSAP), state libraries, form libraries, `vaul` (unmaintained), Base UI, and date libraries.

## 3. Budgets

| Metric | Budget |
|---|---|
| Initial JS (shell plus the Dashboard route, gzip) | ≤ 180 KB |
| Any other route chunk (gzip) | ≤ 60 KB, except the lazy Recharts chunk (≤ 110 KB) |
| CSS (gzip) | ≤ 25 KB |
| Fonts preloaded | 1 file (Geist Latin variable). Mono loads on demand. |
| Lighthouse (mobile, production) | Performance ≥ 90, Accessibility 100, Best Practices 100 |
| Core Web Vitals (lab) | LCP < 2.5 s, CLS < 0.1, INP < 200 ms |

These are checked in CI from Phase 2 onwards, with `vite build` size output asserted by a small script.

## 4. Phases

### Phase 1: Project initialization and design system v1 ✅ Done (Nov 4, 2026)

Vite, React, Tailwind v4, shadcn (JavaScript), the `@/` alias, Vitest, oxlint, Prettier, constants, the storage wrapper, `StatusBadge`, `StatCard`, `EmptyState`, `ThemeToggle`, and a showcase page. 12 tests pass, and the bundle is 139 KB gzipped.
**Known gaps carried into Phase 2**: `tw-animate-css` is missing, the indigo accent and Inter font are replaced by v2, and the showcase is at the app root.

---

### Phase 2: Design system v2, app shell, and global UI (≈ 3–4 days)

**Tasks**
- Tokens: migrate to OKLCH, add canvas, border-strong, subtle-foreground, brand, radius, shadow, motion, and z-index tokens (UI_UX_PLAN §2). Switch to Geist. Add `tw-animate-css`. Set the global Lucide stroke to 1.75.
- Restyle the shadcn primitives in use (button heights 32/36 desktop and 44 under `pointer-coarse`; inputs 16 px on touch; badge; table; dialog; sheet; tooltip; dropdown) to match the tokens. Never ship the default state.
- `navigation.js` single config. `AppShell` with the desktop sidebar (expanded and icon rail), tablet rail, mobile header, bottom tab bar, and nav drawer. Inset `ContentPanel`, sticky `PageHeader`, `SkipLink`.
- Router with `React.lazy` per route, placeholder pages using real empty states, a route-level skeleton fallback, and a 2 px navigation progress bar.
- Global UI: `CommandPalette` (pages and actions, with data groups wired in Phase 3), `NotificationCenter` (local store), `ProfileMenu`, `ThemeSwitcher` (with the theme-color meta update), `SyncStatus` and `ConnectionStatus` driven by a mock state, sonner placement per breakpoint, `ResponsiveDialog` (dialog on desktop, bottom sheet on mobile), `ConfirmDialog`, and the keyboard shortcuts sheet.
- Replace `StatCard` with `KpiStrip`. Move the showcase to `/_design` (dev only) and update it to the v2 tokens.
- `scripts/lint-copy.js` (em-dash ban) and a token contrast test (`culori`).

**Files**: `src/index.css`, `src/app/*`, `src/components/layout/*`, `src/components/global/*`, `src/components/common/*`, `src/components/ui/*` (restyle), `src/features/design-system/*`, `src/lib/constants.js`, `scripts/lint-copy.js`, `package.json`.

**Dependencies**: Phase 1.

**Expected output**: a navigable shell on every breakpoint. Light and dark themes are final, and the command palette, notification center, profile menu, and theme switcher all work.

**Testing**:
- Unit tests: navigation config consumers render every item, the palette filters and runs actions, the notification store caps at 50, and the contrast test passes for every text/background pair in both themes.
- Manual: 320, 375, 390, 430, 768, 1024, 1280, and 1440; keyboard-only pass; reduced motion.

**Completion criteria**:
- No horizontal overflow at 320 px.
- All targets are at least 44 px under coarse pointers.
- `lint`, `lint:copy`, `test`, and `build` pass.
- The initial JS budget is met.

---

### Phase 3: Page UIs with mock data, mobile-first ✅ Done (Nov 4, 2026)

**Result**: all pages, `/welcome`, the composer, the mock sending view, and every state run on mock data (`npm run dev:mock`). 149 tests pass, including axe checks on 11 pages in both themes. No page overflows from 320 to 1440 px. Initial JS is 179.3 of 180 KB gzipped and CSS is 17.4 of 25 KB.

**Deviations**:
- TanStack Table is pinned to v8. `axe-core` was added as a dev dependency.
- Mock scenarios (populated, empty, not connected, error) are switchable and stored in sessionStorage. The mock loader is dropped from normal builds.
- A minimal `templateEngine.js` was pulled forward from Phase 7 so previews and blocking work. "Save draft" in the composer is omitted.
- The desktop sidebar container is a `<nav>` so it forms a named landmark.
- Install, notifications, resume upload, Gmail links, and every Google action are disabled with a visible reason.
- Risk: the initial JS has under 1 KB headroom. Phase 4 must keep new code out of the initial chunk or raise the budget deliberately.

**Tasks**
- `DataTable` (TanStack: sort, faceted filters, selection, pagination, density, column visibility, keyboard row navigation) and `ResponsiveList` (mobile rows, selection mode, "Show 50 more").
- All 8 pages plus the `/welcome` onboarding, per UI_UX_PLAN §5 and WIREFRAMES. Include every state: loading, empty, filtered-empty, error, and offline placeholders.
- Applications detail as a route-backed sheet. Campaign composer steps, confirm sheet, and sending view driven by a mock queue that sends nothing. Template editor with the variable picker and `{{` trigger, plus the Edit/Preview segmented control on mobile.
- Charts in `ChartFrame`, with a "View as table" toggle and a text summary. Recharts lazy-loaded.
- Command palette data groups (applications, templates) from mock data.
- Mock data with realistic names, labeled "Mock data" in the header. `VITE_USE_MOCKS=true` only.

**Files**: `src/features/**`, `src/components/common/DataTable.jsx`, `ResponsiveList.jsx`, `FilterSheet.jsx`, `Stepper.jsx`, `ActionBar.jsx`, `ChartFrame.jsx`, `src/mocks/*`.

**Dependencies**: Phase 2.

**Expected output**: the complete product UI, fully interactive on mock data, on phone, tablet, and desktop.

**Testing**:
- Unit tests:
  - DataTable selection with Shift-range, filters, and keyboard navigation.
  - ResponsiveList selection mode.
  - The variable picker inserts at the caret.
  - The composer step guards (can't continue without recipients; a blocked recipient is excluded from the send count).
- Accessibility: axe checks on each page in both themes.
- Manual: every wireframe flow on a real Android phone and an iPhone (Safari).

**Completion criteria**: AC-16 passes. Every page matches its wireframe on mobile and desktop. Every state is designed. The mock badge is visible. No API calls exist yet.

---

### Phase 4: Progressive Web App ✅ Done (Nov 4, 2026)

**Result**: `vite-plugin-pwa` 2.0.0 (`generateSW`, `registerType: 'prompt'`), icons generated from `public/logo.svg` (`pwa-assets.config.js`), install state machine and dialog, update prompt, offline screen, back-online toast, and `vercel.json`. 170 tests pass. Verified on a `vite preview` build: the service worker activates; Cache Storage holds only same-origin build assets (no cross-origin entries, 4 Latin font files); a full reload offline serves the shell with the banner and Offline screen; reconnecting shows "Back online" and runs nothing; a second build shows "A new version is available.", Later adds a notification and the Settings → About "Update ready" panel, and Reload swaps the version. Initial JS 180.0 of 180 KB.

**Deviations**:
- After a dismissed native prompt the state becomes `manual` (browser-menu steps), not `available`: a `beforeinstallprompt` event can be prompted only once.
- The update toast, back-online toast, install dialog, and Offline screen load as lazy chunks to keep the initial budget. The service worker is registered only in production builds.
- `vercel.json` also sets `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `nosniff`, a referrer policy, immutable caching for `/assets/*`, and an SPA rewrite.
- `testTimeout` is 15 s because lazy route chunks can transform slowly under full-suite load.
- Not done here: the Dashboard "Install JobApply" checklist row (needs completed-sync counts from Phase 6), and manual installs on real Windows, Android, and iOS devices.
- Risk: initial JS has no headroom left. Chunk-split overhead (about 20 small initial chunks) is the main cost; Phase 5 needs a chunking pass or a deliberate budget change.

**Tasks**
- `vite-plugin-pwa` with the manifest, `generateSW` config, and `registerType: 'prompt'` (PWA_STRATEGY §3, §5). Index.html head entries. Icons from `public/logo.svg` via `@vite-pwa/assets-generator`.
- `useInstallPrompt` (early event capture, platform detection, installed detection), `InstallDialog` (Chromium, iOS, and manual variants), install entries in Settings, the profile menu, the mobile drawer, and the palette.
- `UpdatePrompt` (update-available toast, Reload, Later, deferral during a campaign, periodic checks). The offline-ready toast.
- `useOnlineStatus`, `OfflineBanner`, the in-app Offline screen, disabled-action messaging, and the "Back online" toast with a pending-work list (wired to real pending items in Phases 6 and 8).
- `vercel.json`: `no-cache` headers for `sw.js` and `registerSW.js`, plus CSP `worker-src` and `manifest-src`.

**Files**: `vite.config.js`, `index.html`, `public/*`, `src/pwa/*`, `src/main.jsx`, `src/features/settings/sections/InstallSection.jsx`, `vercel.json`.

**Dependencies**: Phase 2 (shell). Phase 3 is recommended first so the offline states cover real pages.

**Expected output**: the app installs on Chromium desktop and Android, shows correct iOS guidance, loads offline after the first visit, and prompts for updates.

**Testing**:
- Unit tests: the install state machine (event, accept, dismiss, appinstalled, standalone, iOS, iPadOS desktop UA, unsupported) and the update deferral during a mock campaign.
- Manual on a `vite preview` HTTPS build or Vercel preview: DevTools Manifest shows no installability errors; Cache Storage holds only build assets; an airplane-mode run; the update flow with two deploys.

**Completion criteria**: AC-20 and AC-23 pass. The offline shell works, and no cross-origin entries exist in Cache Storage.

---

### Phase 5: Google OAuth authentication 🟡 Code done (Nov 5, 2026), real sign-in pending a Client ID

**Result**: `services/tokenStore.js` (memory-only token), `services/http.js` (single fetch wrapper: `cache: 'no-store'`, `credentials: 'omit'`, error matrix, GET-only backoff 2/4/8 s, 401 hook), `services/googleAuth.js` (GIS loaded on demand, token client, userinfo, scope check, revoke), `context/authModel.js` and `AuthContext.jsx` (status only, expiring at T-5 min, expired at T or on any 401, `login_hint` reconnect, Disconnect and "Disconnect and forget"). Wired into the shell status, a session banner (Reconnect, Grant permissions, expiry countdown), the profile menu, the palette, Settings → Google account, onboarding step 1, and the Dashboard checklist. 198 tests pass, including the no-store test and AC-1, AC-2, and AC-15 against a fake GIS. Initial JS 176.0 of 180 KB after a chunking pass (`codeSplitting` groups for React and the shell).

**Deviations**:
- Files live in `features/settings/sections.jsx` and `features/welcome/WelcomePage.jsx` rather than the planned `GoogleAccountSection.jsx` and `onboarding/steps/ConnectGoogle.jsx`, matching the Phase 3 layout.
- The Google service code is a lazy chunk. Connect surfaces (Settings, onboarding, the profile menu, the palette, and returning users) preload it and the GIS script, so the popup still opens inside the click.
- Mock mode never contacts Google, even when a Client ID is set.
- The avatar uses initials only; no Google image request is made.

**Open**: the installed-app matrix (AC-22: Windows Chrome, Android Chrome, iOS home-screen). The iOS install-guidance decision is recorded after that test. Real sign-in in the browser works with the project's Client ID. The user chose to start Phase 6 before the installed-app tests; they run once there is an HTTPS deploy.

**Tasks**: as in v0.1 (GIS token client, `http.js` with `cache: 'no-store'` on every request, AuthContext, expiry timer, reconnect with `login_hint`, revoke). This phase also includes:
- Wiring the real state into `ConnectionStatus`, the profile menu, and onboarding step 1.
- Testing sign-in **inside the installed PWA** (Windows Chrome, Android Chrome, and iOS home-screen app), per PWA_STRATEGY §8.

**Files**: `src/services/googleAuth.js`, `src/services/http.js`, `src/context/AuthContext.jsx`, `src/features/onboarding/steps/ConnectGoogle.jsx`, `src/features/settings/sections/GoogleAccountSection.jsx`.

**Dependencies**: Phase 2; the Google Cloud project and Client ID (API_INTEGRATION §1).

**Testing**: as in v0.1, plus a test that every request uses `no-store`, and the installed-mode sign-in matrix.

**Completion criteria**: AC-1, AC-2, AC-15, and AC-22 pass. The decision on iOS install guidance is recorded.

---

### Phase 6: Google Sheets integration 🟡 Code done (Nov 4, 2026), pending a run against a real sheet

**Result**: `lib/dedupe.js` (schema §3.1 key), `lib/sheetRows.js` (row parsing, validation per §7, duplicate IDs, ID assignment, Email_Log parsing, A1 helpers), `services/sheetsService.js` (spreadsheet metadata, `values:batchGet`, RAW `values:batchUpdate`, `batchUpdate` for widening a tab), `context/sheetSync.js` (inspect a link, add tracking headers, Sync, write fields by Application ID), and `context/useSheetSource.js` (config, snapshot and log snapshot behind the toggle, pending write-backs). The setup flow reads the real tabs and header rows, adds missing tracking columns after confirmation, and runs the first sync. Wired into Sync now, the sync indicator (synced, syncing, failed, offline with "Offline · last synced …", not synced yet), the Sheets page (real link, offline-copy label, unsaved changes with Retry and Discard), the inline status editor, Do Not Email, the Dashboard checklist and "Needs attention", and the Back online toast. 220 tests pass, including AC-3, AC-4, AC-5, and AC-18. Initial JS 178.2 of 180 KB; the Sheets code is a 3.5 KB lazy chunk.

**Deviations**:
- The real source lives in `context/useSheetSource.js`, used by `WorkspaceProvider`, rather than a separate `SheetContext`, so every page keeps reading `useWorkspace()`.
- Sync reads the tab and Email_Log in one `values:batchGet` call, after the metadata call that confirms the tab still exists (found by sheet ID, so a renamed tab keeps working).
- Notes are read-only in real mode: the schema says the app never writes the Notes column. The snapshot leaves notes out.
- A failed write keeps the change on screen and in `jaas.pendingWritebacks`. It is written again only when the user presses Retry on the Google Sheets page. Edits are disabled offline or without a Google session, never queued silently.
- Starting a campaign is blocked in real mode ("Sending is not available in this build yet") until Phase 8, so the mock runner can never run on real rows.
- Templates in real mode start empty until Phase 7 adds local templates.

**Open**: a sync of the user's real sheet. The Dashboard "Install JobApply" checklist row is still not done.

**Plan (v0.2)**:

**Tasks**: as in v0.1 (parser, validation, dedupe, sheets service, setup flow, sync, ID assignment). This phase also includes:
- Connecting the real data to the Phase 3 UI.
- The snapshot and log-snapshot writes, behind the Settings toggle.
- Pending write-backs feeding the reconnect toast and "Needs attention".
- The sync status indicator with real states.

**Files**: `src/lib/sheetParser.js`, `validation.js`, `dedupe.js`, `src/services/sheetsService.js`, `src/context/SheetContext.jsx`, `src/features/sheets/*`, `src/features/applications/*`.

**Dependencies**: Phase 5.

**Testing**: as in v0.1, plus: offline after sync shows the snapshot; toggling the snapshot off clears it; reconnect shows pending work and runs nothing until Retry.

**Completion criteria**: AC-3 to AC-5 and AC-18 pass.

---

### Phase 7: Email template logic 🟢 Code done (Nov 5, 2026)

**Result**: Templates load from `jaas.templates`. Defaults are written only when none are saved (AC-6). Create, edit, duplicate, delete, import, and export use that store in real mode. Profile fields already feed `my_*` placeholders. A missing placeholder still blocks that recipient (AC-7, existing template engine tests).

### Phase 8: Gmail sending 🟢 Code done (Nov 5, 2026), pending a real send

**Result**: `lib/mime.js`, `lib/fileStore.js` (one resume in IndexedDB), `services/gmailService.js`, and `features/campaigns/sendOne.js`. A campaign starts only from the confirm dialog. The queue is saved in `jaas.campaignQueue`. Reload and a dropped connection pause it; already-sent rows are not sent again; an in-flight send becomes Unknown and is not retried. Resume asks for confirmation again. Going online sends nothing. Each accept from Gmail writes Email Status, Sent Date, Gmail Message ID, and Thread ID, and appends Email_Log (created on first use). A failed sheet write is queued for Retry. The test email goes to you with a `[TEST]` subject and does not change application rows. Screen Wake Lock and the beforeunload warning run while a real campaign is sending. Reload stays disabled while a campaign is running (existing update prompt).

### Phase 9: Reply tracking 🟢 Code done (Nov 5, 2026), pending a real thread

**Result**: `lib/replyClassifier.js` and History → Check replies. The first check asks for `gmail.metadata` and then reads headers only. Replied, Auto-Reply, and Bounced match the rules in API_INTEGRATION §6.2, and a later human reply upgrades an auto-reply. History links a real thread to Gmail. Reports already had chart summaries, View as table, and CSV; the CSV download now adds a UTF-8 BOM (AC-14). Reply updates raise an in-app notification.

### Phase 10: Quality and deployment 🟡 Docs and checks done, production deploy not run

**Result**: README (setup, install, limits, the "not an APK" note, iPhone guidance). THIRD_PARTY_NOTICES.md. CSV BOM. The iOS home-screen sign-in result is documented as unverified: use Safari if the installed icon cannot sign in (AC-22). Cache policy is unchanged: empty `runtimeCaching`, `cache: 'no-store'` on every Google request, token only in memory.

**Not done from this environment**: a Vercel deploy, adding the production origin, Lighthouse on production, real install screenshots, and sign-in on a Windows or Android installed app. Those need the owner's Google account and hosting login.

## 5. Risk and limitation analysis

| # | Risk / limitation | Impact | Mitigation (no backend) |
|---|---|---|---|
| R1 | **Gmail sending limits** (about 500/day consumer, about 2,000/day Workspace; undisclosed throttling for new accounts) | Account sending suspended for up to 24 h | Default 50/day cap, 20 s delay, one-to-one sends, stop on the limit error, daily usage shown in the confirm dialog |
| R2 | **Spam / reputation** | Emails land in spam | Personalization required, plain text, a small attachment, a recency gate, no tracking pixels |
| R3 | **Recipient consent and email rules** (CAN-SPAM, GDPR, India DPDP Act, etc.) | Legal or reputational | `Do Not Email` honored everywhere, a polite opt-out line in default templates, one-to-one framing, user responsibility stated in the README |
| R4 | **OAuth configuration** (unverified app warning, Testing mode, origin mismatch) | Can't sign in | README checklist, plus an error UI that maps origin errors to "Add this origin in Google Cloud" |
| R5 | **Restricted scope (`gmail.metadata`)** | Verification needed for public use | Personal use in Testing mode, opt-in incremental consent |
| R6 | **No refresh token, 1 h sessions** | Campaign interruptions | Pre-flight check, pause on 401, one-click reconnect, persisted queue |
| R7 | **XSS = token theft** | Mail sent as the user | Memory-only token, strict CSP, text-only rendering, minimal dependencies |
| R8 | **Token storage risk** | Readable by scripts | Never persisted |
| R9 | **Browser storage limits** (about 5 MB LocalStorage, eviction) | Lost settings or snapshot | Sheet is the source of truth, template export, a size-capped snapshot, quota toasts |
| R10 | **Resume persistence** | Re-selecting the file | IndexedDB with an in-memory fallback |
| R11 | **Reply tracking accuracy** | Missed or uncertain replies | Thread-based only, an explicit Uncertain state, Gmail links |
| R12 | **Sheet sync conflicts** | Wrong row or double send | ID-based writes, system columns only, a fresh status re-read, a Queued marker |
| R13 | **Tab or app window closed mid-campaign** | Partial campaign | Persisted queue, resume prompt, Unknown state for in-flight items, `beforeunload` warning |
| R14 | **Background throttling** | Slower sends | Acceptable (safer). Screen Wake Lock while sending. |
| R15 | **API quotas** | 429 errors | Batching, backoff, throttled reply checks |
| R16 | **Duplicate sends** | Embarrassment | Six-layer guard (DATABASE_SCHEMA §3.2) |
| R17 | **Scope creep** | Delays | No backend, state, form, or animation libraries; future features parked |
| R18 | **Service worker serving stale code** | Bugs persist after a fix | `registerType: 'prompt'`, `no-cache` headers on the SW, hourly update checks, a visible "Update ready" state |
| R19 | **Service worker caching private data by mistake** | Data exposure on shared devices | Empty `runtimeCaching`, `no-store` fetches, a Cache Storage audit in tests and in Phase 10 |
| R20 | **Google sign-in inside an installed iOS app** | Can't connect in standalone | Tested in Phase 5. Fallback: recommend Safari on iPhone and hide iOS install guidance. |
| R21 | **Install API differences across browsers** | Confusing or absent install option | A state machine with per-platform guidance. Never promise a prompt on iOS. Hide where unsupported. |
| R22 | **Offline snapshot holds personal data** (recruiter names and emails) | Privacy on a shared device | User toggle, clear on disconnect, clear-data control, never in Cache Storage |
| R23 | **`portrait` orientation locks installed tablets** | Worse tablet use | Decision D4; `any` recommended |
| R24 | **Design drift back to template look** | Generic UI | Token-only styling, the shape and color locks, the pre-delivery checklist per page, `lint:copy` |

## 6. Decisions

### Confirmed (v0.1)
1. Sheet access: the `spreadsheets` scope.
2. Resume: IndexedDB (`lib/fileStore.js`).
3. Reply tracking in MVP, thread-based, with `gmail.metadata`.
4. Email format: plain text.
5. Hosting: Vercel.
6. Sending defaults: 50/day, 20 s delay.

### Confirmed (v0.2, Nov 4, 2026)
- **D1** Typeface: Geist and Geist Mono.
- **D2** Accent: cobalt.
- **D3** Mobile navigation: bottom tabs plus a drawer.
- **D4** Manifest orientation: `any`.
- **D5** Offline snapshot: on by default, with a toggle.
- **D6** UI UX Pro Max CLI: not installed.

Plan v0.2 approved. Phase 2 started.
