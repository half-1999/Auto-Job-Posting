# Wireframes (desktop and mobile)

Status: Draft for review · Version 0.2
Low-fidelity layout and hierarchy references. Spacing, color, and type follow the token system in UI_UX_PLAN.md §2. The names and numbers shown are illustrative mock data.

Legend: `[Button]` primary action, `(Button)` secondary action, `[ ]` checkbox, `▾` select or menu, `⌕` search, `≡` menu, `⋯` overflow, `◷` time, `●` real state glyph (always paired with text), `◔` notification bell, `⎘` attachment.

---

## 1. App shell

### 1.1 Desktop ≥ 1280 (sidebar expanded, content panel inset)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ canvas                                                                               │
│ ┌──────────────────┐ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ◆ JobApply       │ │ Applications 128                (Sync now) [Email selected] ◔│ │
│ │ ┌──────────────┐ │ ├─────────────────────────────────────────────────────────────┤ │
│ │ │⌕ Search  ⌃K │ │ │                                                             │ │
│ │ └──────────────┘ │ │                     page content                           │ │
│ │ Workspace        │ │                     (scrolls independently)                 │ │
│ │ ▣ Dashboard      │ │                                                             │ │
│ │ ☰ Applications ◀ │ │                                                             │ │
│ │ ✉ Campaigns      │ │                                                             │ │
│ │ ▤ Templates      │ │                                                             │ │
│ │ Data             │ │                                                             │ │
│ │ ◷ Email History  │ │                                                             │ │
│ │ ▥ Reports        │ │                                                             │ │
│ │ ⇄ Google Sheets  │ │                                                             │ │
│ │                  │ │                                                             │ │
│ │ ⚙ Settings       │ │                                                             │ │
│ │ ↻ Synced 4m ago  │ │                                                             │ │
│ │ (AR) Ananya R. ✓ │ │                                                             │ │
│ └──────────────────┘ └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
  232 px (52 px icon rail with [ )     inset panel: 8 px margin, 8 px radius, 1 px border
```

### 1.2 Tablet 768–1023 (icon rail)

```
┌────┬─────────────────────────────────────────────┐
│ ◆  │ Applications 128        (Sync) [Email] ◔    │
│ ⌕  ├─────────────────────────────────────────────┤
│ ▣  │                                             │
│ ☰◀ │  content                                    │
│ ✉  │  detail panels open as a right sheet 420 px │
│ ▤  │                                             │
│ ◷  │                                             │
│ ▥  │                                             │
│ ⇄  │                                             │
│ ⚙  │                                             │
│(AR)│                                             │
└────┴─────────────────────────────────────────────┘
```

### 1.3 Mobile 320–430 (compact header, bottom tabs, drawer)

```
┌──────────────────────────────┐      ┌──────────────────────┬───────┐
│ ≡   Applications      ⌕  ↻   │ 48   │ (AR) Ananya Rao      │ scrim │
├──────────────────────────────┤      │ ananya.rao@gmail.com │       │
│                              │      │ ● Connected          │       │
│                              │      ├──────────────────────┤       │
│          content             │      │ ▣ Dashboard          │       │
│                              │      │ ☰ Applications       │       │
│                              │      │ ✉ Campaigns          │       │
│                              │      │ ▤ Templates          │       │
│                              │      │ ◷ Email History      │       │
├──────────────────────────────┤      │ ▥ Reports            │       │
│ [ Review 5 recipients      ] │ 56   │ ⇄ Google Sheets      │       │
├──────────────────────────────┤      ├──────────────────────┤       │
│  ▣     ☰     ✉     ◷     ≡   │ 56   │ ⤓ Install app        │       │
│ Home  Apps  Camp. Hist. Menu │ +safe│ Theme (Light|Dark|Sys)│      │
└──────────────────────────────┘      │ ⚙ Settings           │       │
  sticky action bar only in commit     └──────────────────────┴───────┘
  flows; hidden while keyboard open      drawer: 85vw, max 320 px
```

## 2. Dashboard

### 2.1 Desktop

```
Dashboard                                                     (Sync now) [New campaign]
┌───────────────┬───────────────┬───────────────┬───────────────┬────────────────────┐
│ 128           │ 64            │ 2             │ 11            │ 17.2%              │
│ Applications  │ Emails sent   │ Failed        │ Replies       │ Reply rate         │
│ ↑ 14 vs prev  │ ↑ 9           │ ↓ 1           │ ↑ 3           │ ↑ 2.1 pts          │
└───────────────┴───────────────┴───────────────┴───────────────┴────────────────────┘

Needs attention  3                              Pipeline
 ⚠ 2 emails failed: Zeta Finance, Plum      (Retry)   ██████████▒▒▒▒▒▒░░░░▓▓
 ? 1 possible reply from no-reply@lever.co (Verify)  Applied 61  Not applied 43
 ↻ 4 sheet updates pending                 (Retry)   Interviewing 9  Offer 1 ...

Weekly activity                    12 weeks ▾       Recent activity
 ▁▂▃▅▃▆▇▅▆▄▇█   ── Sent  - - Replies             10:42  Sent to Meera Iyer · Razorpay
 Aug 10 ...............Nov 2   (View as table)    09:15  Reply from Karan S. · Swiggy
                                                    Yesterday  Sync: 128 rows
```

### 2.2 Mobile

```
┌──────────────────────────────┐
│ ≡   Dashboard         ⌕  ↻   │
├──────────────────────────────┤
│ Needs attention 3            │
│ ⚠ 2 emails failed     Retry ›│
│ ? 1 possible reply   Verify ›│
│ ↻ 4 updates pending   Retry ›│
│ ┌─────────────┬────────────┐ │
│ │ 128         │ 64         │ │
│ │ Applications│ Emails sent│ │
│ ├─────────────┼────────────┤ │
│ │ 2  Failed   │ 11 Replies │ │
│ ├─────────────┴────────────┤ │
│ │ 17.2% Reply rate ↑2.1pts │ │
│ └──────────────────────────┘ │
│ Weekly activity              │
│ ▁▂▃▅▃▆▇▅▆▄▇█  (180 px)       │
│ Pipeline                     │
│ ██████████▒▒▒▒░░░▓           │
│ Recent activity              │
│ 10:42 Sent · Meera Iyer      │
├──────────────────────────────┤
│  ▣     ☰     ✉     ◷     ≡   │
└──────────────────────────────┘
```

## 3. Applications

### 3.1 Desktop (table, bulk bar, detail sheet)

```
Applications 128                                       ↻ Synced 4m ago  [Email selected]
 All 128 │ Not contacted 43 │ Awaiting reply 52 │ Replied 11 │ Needs attention 3
 ⌕ Search company, recruiter, role…   (Status ▾) (Email ▾) (Reply ▾) (Template ▾)  ⚙ Columns
┌──┬───────────────────────────┬──────────────────────────┬────────────┬─────────┬─────────┬──────────┬─┐
│[ ]│ Company / Role            │ Recruiter                │ Status     │ Email   │ Reply   │ Last sent│⋯│
├──┼───────────────────────────┼──────────────────────────┼────────────┼─────────┼─────────┼──────────┼─┤
│[x]│ Razorpay                  │ Meera Iyer               │ Applied ▾  │ Sent    │ Replied │ 2d ago   │⋯│
│   │ Frontend Engineer II      │ meera.iyer@razorpay.com  │            │         │         │          │ │
│[x]│ Zeta Finance              │ Arjun Mehta              │ Not appl ▾ │ Failed ⚠│ -       │ -        │⋯│
│   │ React Developer           │ arjun@zeta.tech          │            │         │         │          │ │
│[ ]│ Postman                   │ Ishita Bose              │ Interview ▾│ Sent    │ No reply│ 9d ago   │⋯│
└──┴───────────────────────────┴──────────────────────────┴────────────┴─────────┴─────────┴──────────┴─┘
 1–50 of 128                                                                    ‹  1  2  3  ›
                 ┌──────────────────────────────────────────────────────┐
                 │ 2 selected   [Email 2]  (Mark Do Not Email)  (Clear)  │   bulk bar
                 └──────────────────────────────────────────────────────┘

Detail sheet (right, 480 px):
┌───────────────────────────────────────┐
│ Razorpay                            ✕ │
│ Frontend Engineer II · Applied ▾      │
├───────────────────────────────────────┤
│ Recruiter   Meera Iyer                │
│ Email       meera.iyer@razorpay.com   │
│ Job link    razorpay.com/jobs/4821  ↗ │
│ Notes       [ editable textarea     ] │
├───────────────────────────────────────┤
│ Timeline                              │
│ ● Nov 2 10:42  Sent (Cold Outreach)   │
│ ● Nov 3 09:15  Reply detected         │
├───────────────────────────────────────┤
│ (Open in Sheets ↗) (Open in Gmail ↗)  │
└───────────────────────────────────────┘
```

### 3.2 Mobile (list, filter sheet, selection mode)

```
 Browse                             Selection mode                  Filter sheet
┌──────────────────────────┐      ┌──────────────────────────┐    ┌──────────────────────────┐
│ ≡  Applications  Select ⌕│      │ ✕  2 selected   All      │    │                          │
├──────────────────────────┤      ├──────────────────────────┤    │ ──── (handle)            │
│ ⌕ Search…      (Filter 2)│      │ ⌕ Search…                │    │ Filters            Reset │
│ (All 128)(Not contacted) │      │[x] Razorpay        2d ago│    │ Application status       │
├──────────────────────────┤      │    Frontend Engineer II  │    │ (Applied)(Interviewing)  │
│ Razorpay          2d ago │      │[x] Zeta Finance          │    │ (Offer)(Rejected) ...    │
│ Frontend Engineer II     │      │    React Developer       │    │ Email status             │
│ (Sent) (Replied)         │      │[ ] Postman         9d ago│    │ (Not sent)(Sent)(Failed) │
├──────────────────────────┤      │    SDE II, Platform      │    │ Reply status             │
│ Zeta Finance          -  │      │                          │    │ (Replied)(No reply)(?)   │
│ React Developer          │      ├──────────────────────────┤    │                          │
│ (Failed ⚠)               │      │[Email 2] (Do Not Email)  │    │ [   Show 37 results    ] │
├──────────────────────────┤      ├──────────────────────────┤    └──────────────────────────┘
│ (Show 50 more)           │      │ ▣    ☰    ✉    ◷    ≡    │      44 px chips, bottom sheet
├──────────────────────────┤      └──────────────────────────┘
│ ▣    ☰    ✉    ◷    ≡    │       checkbox target 44 × 44,
└──────────────────────────┘       whole row toggles
```

## 4. Campaign composer

### 4.1 Desktop: Review step

```
New campaign                                                              (Save draft) (Cancel)
┌──────────────────┬──────────────────────────────────────────────┬──────────────────────────┐
│ ✓ Recipients  12 │ Preview  3 of 12            ‹ Prev   Next ›  │ Summary                  │
│ ✓ Message        │ ┌──────────────────────────────────────────┐ │ Recipients   12          │
│ ✓ Attachment     │ │ From  Ananya Rao <ananya.rao@gmail.com>  │ │ Excluded     8  (view)   │
│ ● Review         │ │ To    meera.iyer@razorpay.com            │ │ Template     Cold Outreach│
│                  │ │ Subj  Frontend Engineer II at Razorpay   │ │ Attachment   Resume.pdf  │
│ Recipients       │ ├──────────────────────────────────────────┤ │              412 KB      │
│ • Meera Iyer     │ │ Hi Meera,                                │ │ Pace         1 per 20 s  │
│ • Arjun Mehta  ⚠ │ │                                          │ │ Duration     about 4 min │
│ • Ishita Bose    │ │ I came across the Frontend Engineer II   │ │ Today        8 of 50     │
│ …                │ │ role at Razorpay and ...                 │ │                          │
│                  │ │                                          │ │ ⚠ 1 recipient blocked:    │
│                  │ │ ⎘ Resume_Ananya_Rao.pdf                  │ │ missing recruiter name   │
│                  │ └──────────────────────────────────────────┘ │ (Fix in template)        │
│                  │                (Send test to me) [Send 11 emails]                       │
└──────────────────┴──────────────────────────────────────────────┴──────────────────────────┘
```

Wireframe glyphs stand in for Lucide icons (`⎘` is `Paperclip`, `◔` is `Bell`). The UI never uses emoji.

### 4.2 Mobile: steps, review, confirm sheet

```
 Recipients step                  Review step                     Confirm (bottom sheet)
┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│ ‹  New campaign          │    │ ‹  New campaign          │    │░░░░░░░░ scrim ░░░░░░░░░░░│
│ Recipients · 1 of 4      │    │ Review · 4 of 4          │    ├──────────────────────────┤
│ ▰▱▱▱                     │    │ ▰▰▰▰                     │    │ Send 11 emails?          │
├──────────────────────────┤    ├──────────────────────────┤    │ Template  Cold Outreach  │
│ ⌕ Search…                │    │ 3 of 12      ‹  ›        │    │ Attach.   Resume.pdf     │
│ (Select all eligible 12) │    │ To  meera.iyer@razorpa…  │    │ From      ananya.rao@…   │
│[x] Meera Iyer            │    │ Subj Frontend Engineer…  │    │ Pace      1 per 20 s     │
│    Razorpay              │    │ ──────────────────────── │    │ Time      about 4 min    │
│[x] Arjun Mehta           │    │ Hi Meera,                │    │ Today     8 of 50 used   │
│    Zeta Finance          │    │ I came across the        │    │ ⚠ 1 blocked, 8 excluded   │
│ ▸ 8 excluded             │    │ Frontend Engineer II …   │    │ [x] I reviewed the       │
│                          │    │ ⎘ Resume_Ananya_Rao.pdf  │    │     previews             │
│ ▸ Summary                │    │ (Send test to me)        │    │ [   Send 11 emails     ] │
├──────────────────────────┤    ├──────────────────────────┤    │ (       Cancel         ) │
│ (Back)       [Continue]  │    │ (Back)   [Review & send] │    └──────────────────────────┘
└──────────────────────────┘    └──────────────────────────┘     primary at thumb reach
```

### 4.3 Sending view (desktop and mobile share the structure)

```
Sending · Cold Outreach                                   (Pause) (Cancel)
▓▓▓▓▓▓▓▓░░░░░░░░░░░░  4 of 11 sent · next in 14 s
Keep this tab open while sending. Sending pauses if you go offline.
✓ Meera Iyer · Razorpay            10:42:03
✓ Ishita Bose · Postman            10:42:24
✕ Arjun Mehta · Zeta     Rejected by Gmail: invalid address   (Retry)
◌ Kabir Shah · CRED                sending…
○ Neha Kulkarni · Groww            queued
```

## 5. Templates

### 5.1 Desktop ≥ 1280 (three panes)

```
Templates                                                                     [New template]
┌──────────────────────┬────────────────────────────────────────────┬─────────────────────────┐
│ Cold Outreach Default│ Name     [Cold Outreach                  ] │ Preview as  Meera Iyer ▾│
│ Subject: {{job_ti…   │ Subject  [{{job_title}} at {{company_name}}]│ ─────────────────────── │
│──────────────────────│ ┌ (Insert variable ▾) (Mono) ───────────┐  │ Frontend Engineer II at │
│ Follow-up            │ │ Hi {{recruiter_first_name|there}},     │  │ Razorpay                │
│ Referral request     │ │                                        │  │                         │
│                      │ │ I came across the {{job_title}} role   │  │ Hi Meera,               │
│                      │ │ at {{company_name}} and …              │  │ I came across the …     │
│                      │ └────────────────────────────────────────┘  │                         │
│                      │ Saved · 2 warnings: {{my_portfolio}} empty  │ ⚠ my_portfolio is empty │
└──────────────────────┴────────────────────────────────────────────┴─────────────────────────┘
 Typing {{ opens:  ┌ Variables ───────────────────────┐
                   │ recruiter_first_name  Meera       │
                   │ company_name          Razorpay    │
                   │ job_title             Frontend…   │
                   └───────────────────────────────────┘
```

### 5.2 Mobile (editor with Edit/Preview, variable sheet)

```
┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│ ‹  Cold Outreach      ⋯  │    │ ‹  Cold Outreach      ⋯  │    │ Insert variable       ✕  │
│ ( Edit │ Preview )       │    │ ( Edit │ Preview )       │    ├──────────────────────────┤
├──────────────────────────┤    ├──────────────────────────┤    │ Recruiter first name     │
│ (Insert variable)(Mono)→ │    │ Preview as Meera Iyer ▾  │    │ {{recruiter_first_name}} │
│ Subject                  │    │ Frontend Engineer II at  │    │ Company name             │
│ [{{job_title}} at …    ] │    │ Razorpay                 │    │ {{company_name}}         │
│ Body                     │    │ ──────────────────────── │    │ Job title                │
│ ┌──────────────────────┐ │    │ Hi Meera,                │    │ {{job_title}}            │
│ │Hi {{recruiter_first_ │ │    │ I came across the        │    │ Job link                 │
│ │name|there}},         │ │    │ Frontend Engineer II …   │    │ {{job_link}}             │
│ │…                     │ │    │ (16 px, 68ch max)        │    │ …                        │
│ └──────────────────────┘ │    │                          │    │ 48 px rows               │
│ Saved                    │    │ ⚠ my_portfolio is empty   │    │                          │
└──────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘
```

## 6. Google Sheets

### 6.1 Desktop (connected)

```
Google Sheets                                       (Edit mapping) (Change sheet) [Sync now]
 Spreadsheet   Job Hunt 2026 ↗          Worksheet   Applications
 Last sync     Today 10:40              Result      128 imported · 3 skipped · 2 invalid

 Column mapping
 ┌────────────────────┬─────────────────────────┬──────────────────────────────────────┐
 │ Sheet header       │ Maps to                 │ Sample values                        │
 ├────────────────────┼─────────────────────────┼──────────────────────────────────────┤
 │ Company            │ Company name (Required)▾│ Razorpay · Zeta Finance · Postman    │
 │ HR Email           │ Recruiter email (Req.) ▾│ meera.iyer@razorpay.com · …          │
 │ Role               │ Job title (Required)   ▾│ Frontend Engineer II · …             │
 └────────────────────┴─────────────────────────┴──────────────────────────────────────┘
 Invalid rows
  Row 14  hr@globex       Email has no domain            (Open row ↗)
  Row 37  (empty)         Recruiter email missing        (Open row ↗)
```

### 6.2 Mobile (mapping as stacked fields)

```
┌──────────────────────────┐
│ ‹  Column mapping        │
├──────────────────────────┤
│ Company name   Required  │
│ [ Company            ▾ ] │
│ Razorpay, Zeta Finance   │
│ Recruiter email Required │
│ [ HR Email           ▾ ] │
│ meera.iyer@razorpay.com  │
│ Job title      Required  │
│ [ Role               ▾ ] │
│ …                        │
├──────────────────────────┤
│ [   Save and sync      ] │
└──────────────────────────┘
```

## 7. Email History (mobile)

```
┌──────────────────────────┐
│ ≡  Email History  ⌕  ⋯   │   ⋯ → Check replies
├──────────────────────────┤
│ (Filter) (All results ▾) │
│ Today                    │
│ Meera Iyer · Razorpay    │
│ Sent 10:42    (Replied)  │
│ Arjun Mehta · Zeta       │
│ Failed 10:43  invalid…   │
│ Yesterday                │
│ Ishita Bose · Postman    │
│ Sent 16:05    (No reply) │
├──────────────────────────┤
│ ▣    ☰    ✉    ◷    ≡    │
└──────────────────────────┘
```

## 8. Reports (desktop)

```
Reports                                         ( 12 weeks │ 12 months │ Custom )  (Export ▾)
┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ 128 Apps   │ 64 Sent    │ 2 Failed   │ 11 Replies │ 17.2% Rate │
└────────────┴────────────┴────────────┴────────────┴────────────┘
Activity                                                         (View as table)
 ▁▂▃▅▃▆▇▅▆▄▇█  ── Sent  - - Replies  ·· Failed
 "Replies rose from 3 to 7 over the last 4 weeks."

Status breakdown                        Reply rate by template
 Applied       ███████████████ 61  48%   Cold Outreach    ██████  18.4%  (49 sent)
 Not applied   ██████████ 43       34%   Follow-up        ███     11.1%  (9 sent)
 Interviewing  ██ 9                 7%   Referral         ██████  16.7%  (6 sent)
```

## 9. Settings (mobile list, then section)

```
┌──────────────────────────┐    ┌──────────────────────────┐
│ ≡  Settings              │    │ ‹  Install app           │
├──────────────────────────┤    ├──────────────────────────┤
│ Profile                › │    │ Install JobApply on this │
│ Resume                 › │    │ device for a full-screen │
│ Sending                › │    │ window and a home screen │
│ Google account         › │    │ icon.                    │
│ Notifications          › │    │                          │
│ Appearance             › │    │ [     Install app      ] │
│ Install app            › │    │                          │
│ Data & storage         › │    │ This is a web app, not   │
│ About                  › │    │ an APK. It updates       │
├──────────────────────────┤    │ automatically.           │
│ ▣    ☰    ✉    ◷    ≡    │    └──────────────────────────┘
└──────────────────────────┘
```

## 10. Overlays

### 10.1 Command palette (desktop; full screen on mobile)

```
┌──────────────────────────────────────────────────────────┐
│ ⌕  razor                                                 │
├──────────────────────────────────────────────────────────┤
│ Applications                                             │
│  ▸ Razorpay · Frontend Engineer II · Meera Iyer        ↵ │
│ Actions                                                  │
│    Email Razorpay recruiter                              │
│ Go to                                                    │
│    Applications                                    G A   │
├──────────────────────────────────────────────────────────┤
│ ↑↓ navigate   ↵ open   esc close                         │
└──────────────────────────────────────────────────────────┘
```

### 10.2 Notification center (popover)

```
┌──────────────────────────────────────────┐
│ Notifications            (Mark all read) │
├──────────────────────────────────────────┤
│ ● Campaign finished: 11 sent, 1 failed   │
│   10:46 · View results                   │
│ ● 1 reply found (Razorpay)               │
│   09:15 · Open in History                │
│   Sync finished: 128 rows                │
│   Yesterday                              │
└──────────────────────────────────────────┘
 ● = unread (paired with bold text, not color alone)
```

### 10.3 Install modal: Chromium (beforeinstallprompt available)

```
┌───────────────────────────────────────────────┐
│ Install JobApply                            ✕ │
│                                               │
│ Opens in its own window, works offline for    │
│ browsing your synced data, and adds an icon   │
│ to your home screen or dock.                  │
│                                               │
│ This installs a web app from this site. It is │
│ not an APK or app store download.             │
│                                               │
│                     (Not now)  [Install app]  │
└───────────────────────────────────────────────┘
```

### 10.4 Install modal: iOS and iPadOS Safari (no prompt API)

```
┌──────────────────────────────┐
│ Add to Home Screen         ✕ │
│                              │
│ 1. Tap the Share button  ⎋   │
│    in Safari's toolbar.      │
│ 2. Scroll and tap            │
│    "Add to Home Screen".     │
│ 3. Tap "Add".                │
│                              │
│ iPhone and iPad do not show  │
│ an install prompt for web    │
│ apps. These steps are the    │
│ only way to install.         │
│                              │
│ [          Got it          ] │
└──────────────────────────────┘
```

### 10.5 Offline and update states

```
Offline banner (top of content):
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠ You're offline. Showing data from 10:42. Sending and syncing are paused.│
└─────────────────────────────────────────────────────────────────────────┘

Reconnected (toast, persistent until acted on if work is pending):
┌───────────────────────────────────────────────┐
│ ✓ Back online                                 │
│ 4 sheet updates are waiting.  (Later) [Retry] │
└───────────────────────────────────────────────┘

Update available (toast, persistent):
┌───────────────────────────────────────────────┐
│ A new version is available.  (Later) [Reload] │
└───────────────────────────────────────────────┘
```

## 11. Onboarding `/welcome`

```
Desktop                                                   Mobile
┌──────────────────┬─────────────────────────────────┐   ┌──────────────────────────┐
│ ◆ JobApply       │ Connect your Google account     │   │ Step 1 of 4              │
│                  │                                 │   │ Connect your Google      │
│ ● Connect Google │ JobApply reads your job sheet   │   │ account                  │
│ ○ Choose sheet   │ and sends email from your Gmail.│   │                          │
│ ○ Map columns    │ It can't read your inbox unless │   │ JobApply reads your job  │
│ ○ First sync     │ you turn on reply tracking.     │   │ sheet and sends email    │
│                  │                                 │   │ from your Gmail.         │
│                  │ Permissions requested           │   │                          │
│                  │  · See and edit your sheets     │   │ Permissions requested    │
│                  │  · Send email as you            │   │ · See and edit sheets    │
│                  │                                 │   │ · Send email as you      │
│                  │ [Connect Google]                │   ├──────────────────────────┤
│                  │                                 │   │ [   Connect Google     ] │
└──────────────────┴─────────────────────────────────┘   └──────────────────────────┘
```
