# JobApply

A browser app for tracking job applications in your own Google Sheet and emailing recruiters from your Gmail, one at a time, after you confirm.

There is no server. The sheet stays in your Drive. Sign-in lasts until you close the tab.

## Scripts

```bash
npm install
npm run dev          # real Google APIs, needs .env.local
npm run dev:mock     # sample data, never contacts Google
npm test
npm run build
```

Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID`. The client secret is not used and must not be added: anything in a `VITE_` variable is public.

Google Cloud steps, the OAuth consent screen, and the origin list are in [docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md).

## What you do in the app

1. Connect Google (Sheets and Gmail send).
2. Paste a Google Sheets link, pick the tab, and confirm the columns. Sync reads rows and writes an Application ID where one is missing. Sync does not send email.
3. Edit templates. They are saved in this browser. Profile fields in Settings fill `{{my_name}}` and the other `my_` placeholders.
4. Save a PDF resume in Settings. It is stored in this browser's IndexedDB, not in LocalStorage.
5. Start a campaign only from the confirmation dialog. Emails go out one at a time with the delay and daily cap from Settings.
6. Check replies from Email History. The first time, Google asks for permission to read headers of threads this app started. Message bodies are not requested.

## Install

JobApply is a website that Chrome and Edge can install. It is not an APK and it is not in an app store.

- Desktop: use the install entry in the menu when the browser offers it.
- Android: the same, from Chrome.
- iPhone: Add to Home Screen from Safari. Sign-in inside that home-screen icon is not verified. Use Safari if Google sign-in does not complete there.

## Limits

- Sending defaults are 50 emails a day and 20 seconds between emails. Gmail's own limit is lower than the API quota and can pause an account for up to a day.
- A closed tab pauses a campaign. Reopening asks before it continues, and a recipient already marked sent is not sent again.
- Coming back online never sends or writes by itself. Resume a campaign from its page (that asks you to confirm again) or press Retry on the Google Sheets page for a change that did not save.
- Reply status is based only on the Gmail thread. A reply that starts a new thread is not detected.
- The access token is kept in memory only. Reloading signs you out. The last email address is remembered so reconnect is one click.

## Production

`vercel.json` is the hosting config: SPA fallback, no-cache for the service worker, and the content security policy. After deploy, add the production origin to the OAuth client. This repository does not deploy itself.
