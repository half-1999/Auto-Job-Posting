# Google Setup: Connect Google Sign-in

This guide gets "Connect Google" working in JobApply. It takes about 10 minutes and is done once, in your own Google Cloud project. JobApply has no server, so no client secret is used anywhere.

Your current values:

| Item | Value |
|---|---|
| Google account that signs in | `theestackguy@gmail.com` |
| Client ID (already in `.env.local`) | `625491114220-aq0od5ltd74khdgdhpajr8lj8ajckc3d.apps.googleusercontent.com` |
| Local app address | `http://localhost:5173` |

---

## Step 1. Open the right project

The most common cause of "Access blocked" is editing a different project from the one that owns the Client ID.

1. Go to https://console.cloud.google.com and sign in with the account that created the Client ID.
2. Click the **project picker** at the top left (next to "Google Cloud").
3. Select the project, for example `job-apply-automation`.
4. Confirm it's the right one: open **Google Auth Platform → Clients** (or **APIs & Services → Credentials**). The list must contain a client whose ID starts with `625491114220-aq0od5`. If it doesn't, switch projects until it does. Every step below happens in that project.

## Step 2. Enable the APIs

1. Open **APIs & Services → Library**.
2. Search **Google Sheets API**, open it, click **Enable**.
3. Search **Gmail API**, open it, click **Enable**.

## Step 3. Branding (consent screen basics)

1. Open **Google Auth Platform → Branding**. If you see **Get started**, click it.
2. **App name**: `JobApply` (any name works).
3. **User support email**: your email.
4. **Developer contact email**: your email.
5. Leave the logo and links empty. Click **Save**.

## Step 4. Audience: test user (fixes "Access blocked")

1. Open **Google Auth Platform → Audience**.
2. **User type** must be **External**. (Internal only exists for Google Workspace organizations, not @gmail.com.)
3. **Publishing status** should be **Testing**.
4. Under **Test users**, click **+ Add users**.
5. Type `theestackguy@gmail.com` exactly, with no spaces. Click **Save**.
6. Check the list now shows `theestackguy@gmail.com`. If it doesn't appear, the save didn't happen.

Changes can take a few minutes to apply.

## Step 5. Data Access: scopes

1. Open **Google Auth Platform → Data Access**.
2. Click **Add or remove scopes**.
3. Select these (use the filter box):
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/gmail.send`
4. Click **Update**, then **Save**.

Can't find a scope in the list? The Sheets and Gmail scopes only appear after those APIs are enabled in this project (Step 2). Or paste them into the **Manually add scopes** box at the bottom of the panel, one per line, then **Add to table**, **Update**, **Save**:

```
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/gmail.send
```

In Testing mode this list does not cause "Access blocked"; JobApply requests these scopes itself at sign-in. Only the Test users list (Step 4) controls who gets in.

Do not add `gmail.metadata` yet. Reply tracking asks for it later, separately.

## Step 6. Client: allowed origins

1. Open **Google Auth Platform → Clients** and click the client starting `625491114220-`.
2. **Application type** must be **Web application**. If it's anything else (Desktop, Android), create a new **Web application** client and send the new Client ID.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost:4173` (for testing the installed app with `npm run preview`)
4. Leave **Authorized redirect URIs** empty.
5. Click **Save**.

### Remove the client secret

The secret was shared in chat, and JobApply never uses it. In the same client page, delete it (or click **Reset secret**). The Client ID keeps working.

## Step 7. Sign in

1. Restart the dev server if `.env.local` changed: stop `npm run dev` with Ctrl+C, then run `npm run dev` again.
2. Open **http://localhost:5173/settings/google** in Chrome or Edge.
3. Click **Connect Google**.
4. In the popup, choose **theestackguy@gmail.com**. If another account is selected automatically, click **Use another account**.
5. "Google hasn't verified this app": click **Continue**.
6. Tick **both** permission boxes (Google Sheets, and send email), then **Continue**.
7. JobApply shows **Connected** with your email.

---

## Still "Access blocked: has not completed the Google verification process"?

This exact message means: the app is in **Testing** and the account in the popup is **not on the test user list of this Client ID's project**. Check in this order:

| Check | How |
|---|---|
| Right project | Step 1, item 4. The Clients list in the project you edited must show `625491114220-aq0od5…`. |
| Right account in the popup | The popup error shows the email at the top. It must be `theestackguy@gmail.com`. With several Google accounts signed in, Chrome may pick another one. Try an Incognito window and sign in with only this account. |
| Test user saved | Audience page lists `theestackguy@gmail.com` under Test users. |
| Wait | Allow 5 minutes after saving, then try again in a new Incognito window. |
| Status | Audience → Publishing status is **Testing**, not "In production" with pending verification. |

### Fallback: publish the app (personal use is fine)

If the test user list still doesn't take effect, you can skip it:

1. **Google Auth Platform → Audience → Publish app**, then **Confirm**.
2. Status becomes **In production** (not verified). Don't submit for verification.
3. Sign in again. Google shows **"Google hasn't verified this app"**. Click **Advanced**, then **Go to JobApply (unsafe)**, then tick both permissions.

This works because the permissions JobApply asks for at connect time (Sheets and Gmail send) are "sensitive", not "restricted". Unverified apps with sensitive scopes are allowed, with that warning screen, for up to 100 users. Later, turning on reply tracking asks for `gmail.metadata`, which is restricted; switch back to **Testing** (Audience → **Back to testing**) with yourself as a test user before using that feature.

---

## Other errors

| Message | Cause | Fix |
|---|---|---|
| `Error 400: redirect_uri_mismatch` or "origin not allowed" / `idpiframe_initialization_failed` | `http://localhost:5173` not in Authorized JavaScript origins | Step 6, then wait 5 minutes |
| `Error 401: invalid_client` | Client ID typo, deleted client, or wrong project | Copy the ID again from Clients into `.env.local`, restart `npm run dev` |
| `Error 400: invalid_request` mentioning client type | Client is not a Web application | Create a Web application client (Step 6.2) |
| JobApply says "Permissions missing" | A permission box was left unticked | Click **Grant permissions** in the banner and tick both |
| JobApply says "Your browser blocked the Google popup" | Popup blocker | Allow popups for `localhost:5173` |
| JobApply says "Google sign-in is not configured for this build" | `.env.local` missing the ID, or the server wasn't restarted | Check `.env.local`, restart `npm run dev` |
| "This app is blocked" | The Google account (often a work or school account) disallows third-party apps | Use a personal @gmail.com account |

## Production (later)

When the app is deployed (for example `https://jobapply.vercel.app`), add that address to **Authorized JavaScript origins** and set `VITE_GOOGLE_CLIENT_ID` in the host's environment variables. No other change is needed.
