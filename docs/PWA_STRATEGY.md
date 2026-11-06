# PWA Strategy: Install, Offline, Update

Status: Draft for review · Version 0.2
Sources: vite-plugin-pwa docs (`frameworks/react.md`, `guide/pwa-minimal-requirements.md`, `guide/prompt-for-update.md`, read Nov 4, 2026) and the MDN Web App Manifest reference. Browser support statements must be re-verified at build time (Phase 4), because they change between releases.

---

## 1. What "installing" means here

JobApply is installed as a **Progressive Web App**: the browser adds an icon to the home screen, Start menu, or dock and opens the app in its own window. It's the same website, served from the same origin, and it updates automatically.

It is **not** an APK, an app-store package, or a native application. The UI never says "Download". The button label is **Install app**, and the install modal and Settings explain the difference in one sentence.

Native distribution (an Android APK or Play Store listing via a Trusted Web Activity built with Bubblewrap or PWABuilder, or an iOS App Store wrapper) is a **separate future feature** (PRD §4.2). It would require signing keys, store accounts, Digital Asset Links, and store review.

## 2. Tooling

| Package | Version (npm, Nov 2026) | License | Role |
|---|---|---|---|
| `vite-plugin-pwa` | 2.0.0 | MIT | Manifest generation, Workbox `generateSW`, the `virtual:pwa-register/react` hook |
| `workbox-window` | 7.4.1 | MIT | Required dev dependency for the React register hook |
| `@vite-pwa/assets-generator` | 2.0.0 | MIT | Generates all icons from one source SVG |

## 3. Web App Manifest

```js
// vite.config.js → VitePWA({ ... })
registerType: 'prompt',            // never auto-reload; the user chooses when to update
injectRegister: false,             // we register via useRegisterSW in React
includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
manifest: {
  id: '/',
  name: 'JobApply Automation',
  short_name: 'JobApply',
  description: 'Personal job application tracker and recruiter outreach from your own Google Sheet and Gmail.',
  start_url: '/?source=pwa',
  scope: '/',
  display: 'standalone',
  orientation: 'any',              // decision D4: portrait on phones by habit, landscape allowed on tablets
  theme_color: '#f6f6f8',          // must match <meta name="theme-color"> (light)
  background_color: '#f6f6f8',
  categories: ['productivity', 'business'],
  icons: [
    { src: 'pwa-64x64.png',   sizes: '64x64',   type: 'image/png' },
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Applications', url: '/applications', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
    { name: 'New campaign', url: '/campaigns/new', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
  ],
  // screenshots (wide + narrow) are added in Phase 10 from real UI captures,
  // enabling Chrome's richer install dialog.
},
```

`index.html` head (per the vite-plugin-pwa minimal requirements):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="description" content="Personal job application tracker and recruiter outreach." />
<meta name="theme-color" content="#f6f6f8" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#08080a" media="(prefers-color-scheme: dark)" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

The theme-color meta is also updated at runtime when the user picks a theme that differs from the system setting.

**Icons**: one original SVG mark (a simple geometric monogram, drawn in Phase 4) goes through `pwa-assets-generator --preset minimal-2023 public/logo.svg`. That produces favicon.ico, pwa-64/192/512, a maskable 512 with a safe-zone background, and apple-touch-icon 180.

## 4. Install experience

### 4.1 `useInstallPrompt()` hook (`src/pwa/useInstallPrompt.js`)

| Input | How it's handled |
|---|---|
| `beforeinstallprompt` | `event.preventDefault()`, store the event, state becomes `available`. The listener is attached in `main.jsx` **before** React renders, so an early event isn't missed. |
| `appinstalled` | Clear the stored event, state becomes `installed`, show a toast "JobApply is installed". |
| Already running installed | `matchMedia('(display-mode: standalone)').matches` or `navigator.standalone === true` (iOS) means state `installed`, and install UI is hidden. |
| iOS or iPadOS | UA check plus the iPadOS desktop-UA case (`Macintosh` with `navigator.maxTouchPoints > 1`). State `ios-instructions`. |
| macOS Safari (no prompt API) | State `manual`, with guidance: File menu, then **Add to Dock**. |
| Other browsers without the event | State `manual` if the browser has a menu install option (Firefox Android, for example: menu, then Install or Add to Home screen). Otherwise `unsupported`. |
| `prompt()` result | `accepted` shows a pending state until `appinstalled`. `dismissed` is remembered and the state falls back to `manual` (browser-menu steps), because an event can be prompted only once; a new `beforeinstallprompt` makes it `available` again. The app doesn't nag on its own. |

Chromium may not fire `beforeinstallprompt` again soon after a dismissal, and never fires it when the app is already installed. The UI treats "no event" as "manual or unsupported", never as an error.

### 4.2 Platform matrix (verify in Phase 4)

| Platform | Prompt API | What the user sees |
|---|---|---|
| Chrome, Edge, or Opera on Windows, macOS, Linux, or ChromeOS | `beforeinstallprompt` | **Install app** button, which opens the browser's native install dialog |
| Chrome, Edge, or Samsung Internet on Android | `beforeinstallprompt` | **Install app** button, which opens the native dialog |
| Safari on iPhone or iPad (iOS/iPadOS 16.4+), plus other iOS browsers that offer Share → Add to Home Screen | None | **Add to Home Screen** button, which opens step-by-step instructions (WIREFRAMES §10.4). It never promises a prompt. |
| Safari on macOS 17+ | None | Instructions: File, then Add to Dock |
| Firefox on Android | None | Instructions: browser menu, then Install |
| Firefox on desktop, or in-app browsers (Gmail, LinkedIn webviews) | None | Install option hidden. Settings shows "Your browser can't install web apps. Open JobApply in Chrome, Edge, or Safari." |

### 4.3 Where install appears

| Location | Behavior |
|---|---|
| **Settings → Install app** | Always present. Shows the right state: button, instructions, installed confirmation ("Installed on this device"), or unsupported guidance. |
| **Profile menu** | An "Install app" item, only when the state is `available`, `ios-instructions`, or `manual`. |
| **Mobile navigation drawer** | Same as the profile menu, placed above Theme. |
| **Command palette** | An "Install app" action under the same conditions. |
| Proactive prompt | **None automatically.** After the third session with a completed sync, the Dashboard checklist may show one dismissible "Install JobApply" row. It's dismissed permanently with one click. |

**Install modal** (WIREFRAMES §10.3): benefits in one paragraph, the PWA-versus-APK note, and Not now / Install app. The **installed state** is a check icon with "Installed on this device", and "Open the app from your home screen or dock" on non-standalone pages.

## 5. Offline strategy

### 5.1 What is cached, and where

| Data | Storage | Cached? | Notes |
|---|---|---|---|
| App shell (index.html, JS, CSS) | Cache Storage (Workbox precache) | **Yes** | Versioned per build. `cleanupOutdatedCaches: true`. |
| Fonts (Geist Latin and Latin-ext woff2), icons, manifest | Cache Storage (precache) | **Yes** | Other unicode-range subsets are excluded via `globIgnores` and load on demand only if ever needed. |
| Google Identity Services script (`accounts.google.com/gsi/client`) | None | **No** | No Workbox route, so it goes to the network. Sign-in requires a connection by design. |
| OAuth access token | JS memory only | **Never** | The service worker never sees it. It isn't in Cache Storage, LocalStorage, sessionStorage, or IndexedDB. |
| Gmail API responses (`gmail.googleapis.com`) | None | **Never** | No Workbox route. Requests also use `fetch(..., { cache: 'no-store' })` so the browser HTTP cache keeps nothing. |
| Sheets API responses (`sheets.googleapis.com`) | None in any cache | **Never** in Cache Storage or the HTTP cache | Same `no-store` rule. |
| Synced applications snapshot (parsed rows) | LocalStorage `jaas.snapshot` (origin-scoped) | **Optional**, default on (decision D5) | User data, not credentials. Clearable in Settings → Data & storage, and cleared on "Disconnect and forget". |
| Email_Log snapshot for History (subjects, recipients, statuses) | LocalStorage `jaas.logSnapshot` | Same toggle as above | Capped at the last 500 rows. |
| Templates, settings, notifications | LocalStorage | Yes | Already local by design. |
| Resume PDF | IndexedDB `jaas/files` | Yes | Already decided (PRD §9). |
| Google avatar image | None | **No** | The UI falls back to initials when offline. |

Workbox configuration (planned):

```js
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}', '**/*-latin-*.woff2', '**/*-latin-ext-*.woff2'],
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: false,
  skipWaiting: false,          // prompt flow: the new SW waits until the user clicks Reload
  runtimeCaching: [],          // intentionally empty: no cross-origin caching of any kind
},
devOptions: { enabled: false }, // the SW is tested on `vite preview` builds, not the dev server
```

### 5.2 Offline fallback page

Every navigation is answered from the precached `index.html` (`navigateFallback`), so the **app shell always loads offline** after the first visit. The "offline fallback page" is therefore an **in-app Offline screen** rendered by the shell. It's shown for pages that need data the device doesn't have (for example, Reports when no snapshot exists), with a clear message and "Try again" button.

A separate static `offline.html` would never be served with this configuration, so it isn't added.

The very first visit can't work offline, because no service worker is installed yet. That's documented as expected browser behavior.

### 5.3 Behavior per feature while offline

| Feature | Offline behavior |
|---|---|
| Navigation, templates, settings | Fully usable |
| Dashboard, Applications, History, Reports | Read-only from the snapshot, with the banner "Showing data from 10:42" |
| Sync now, Check replies, Send test, Send campaign, Connect Google | Disabled, with a tooltip or inline note "Needs a connection" |
| Inline status edit | Disabled (it would need a sheet write). It isn't queued silently. |
| Campaign in progress when the connection drops | The queue **pauses** before the next send: "Paused: offline". The in-flight request result is recorded if it returns; if not, the item becomes "Unknown, check Sent folder" (never auto-resent). |
| Draft campaign | Recipients, message, and attachment can be prepared. Sending stays disabled. |

### 5.4 Reconnection (always user-approved)

1. The `online` event fires, followed by a lightweight connectivity confirmation (the next real API call). The **offline banner is removed** and a "Back online" toast appears.
2. If there's pending work (sheet write-backs, a paused campaign, an interrupted reply check), the toast stays and lists it: "4 sheet updates are waiting." with **Retry** and **Later**. The Dashboard's "Needs attention" list shows the same items.
3. **Nothing runs automatically.**
   - Retry sheet updates writes only the pending status cells, after one click.
   - A paused campaign shows **Resume sending** on its page and requires the confirmation dialog again: remaining count, then the checkbox, then Send.
   - The access token may have expired while offline. If so, Reconnect is requested first.
4. Syncing (a read-only operation) is also offered, not automatic: "Sync now to refresh your data."

## 6. Update experience

- `registerType: 'prompt'` with `useRegisterSW()` from `virtual:pwa-register/react`, which returns `needRefresh`, `offlineReady`, and `updateServiceWorker`.
- **Update available**: a persistent toast "A new version is available." with **Reload** and **Later**. Reload calls `updateServiceWorker(true)`. "Later" adds an "Update ready" item to Settings → About and to the notification center.
- **During a campaign**, the toast says "Update ready. Reload after sending finishes." and Reload is disabled until the queue is idle. The app never reloads mid-send.
- **Offline ready** (first install of the service worker): a single quiet toast, "JobApply can now open offline."
- **Update checks**: on registration, on `visibilitychange` back to visible, and every 60 minutes while open (`registration.update()`, per the plugin's periodic update guide).
- `vercel.json` serves `/sw.js` and `/registerSW.js` with `Cache-Control: no-cache` so new versions are detected promptly.

## 7. Security requirements and how they're met

| Requirement | Implementation | Verification |
|---|---|---|
| Never cache Gmail OAuth tokens in the service worker | The token exists only in a module variable in page JS. There are no Workbox routes for Google origins. The service worker has no message channel that carries auth data. | After connect, sync, and send flows, DevTools → Application → Cache Storage contains only build assets. |
| Never cache private Gmail API responses | No route for `gmail.googleapis.com`. All API fetches use `cache: 'no-store'`. | A test asserts every `services/http.js` request uses `no-store`, plus a Cache Storage inspection. |
| Never cache sensitive Sheets responses in shared caches | Same. The optional snapshot holds parsed rows in origin-scoped LocalStorage, is user-clearable, and is never stored in Cache Storage. | Same inspection, and the Settings toggle off clears the snapshot. |
| Never store credentials in LocalStorage | Only config, templates, settings, snapshots, and the `login_hint` email are stored. | Acceptance criterion AC-15 (search LocalStorage for `ya29.`, the access-token prefix). |
| Do not send emails automatically after reconnection | The campaign queue resumes only from the Resume action, followed by the confirm dialog. | `useCampaign` test: an `online` event triggers no send call. |
| Require approval before resuming any pending operation | Write-backs, campaign resume, and reply checks are all gated behind explicit buttons. | Tests per operation, plus a manual airplane-mode run. |

Content-Security-Policy additions: `worker-src 'self'; manifest-src 'self'`.

## 8. Installed-mode caveats

- **Google sign-in in standalone mode**: the GIS token flow opens a popup. On Chromium desktop and Android, installed apps open the popup as a separate window, which is expected to work. On **iOS home-screen apps**, popup handling and storage are separate from Safari, so this **must be tested in Phase 5**. If GIS can't complete sign-in in iOS standalone mode, iOS install guidance is replaced with "On iPhone, use JobApply in Safari". It won't be shipped broken.
- iOS home-screen apps have **separate storage** from Safari. Templates, settings, and the resume must be set up again inside the installed app (or imported via template JSON).
- Sending requires the app window to stay open (the same rule as in a tab). A Screen Wake Lock is requested during a campaign when supported.

## 9. Testing and scores

- **Lighthouse 12+ no longer has a PWA category** (removed in 2024). Installability is verified with Chrome DevTools → Application → Manifest (installability errors), plus manual installs on Windows (Chrome and Edge), Android (Chrome), and iOS (Safari).
- Targets (Lighthouse, mobile preset, production build): **Performance ≥ 90, Accessibility 100, Best Practices 100**.
- Offline test script: install, sync, then airplane mode; reload; navigate all pages; confirm the banner and disabled actions; go back online; confirm nothing auto-runs and that Retry works.
- Update test: deploy build A, open it, deploy build B; confirm the toast; confirm Reload is disabled while a mock campaign runs; Reload swaps the version.
