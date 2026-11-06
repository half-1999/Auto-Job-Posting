import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CircleCheckIcon, DownloadIcon, FileUpIcon, PaperclipIcon } from 'lucide-react'
import { toast } from 'sonner'
import { NAV_ITEMS } from '@/app/navigation'
import { GLOBAL_SHORTCUTS } from '@/app/shortcuts'
import { useUiPrefs } from '@/app/useUiPrefs'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ResumePreview } from '@/components/common/ResumePreview'
import { InlineAlert } from '@/components/common/InlineAlert'
import { ThemeSegmented } from '@/components/common/ThemeSwitcher'
import { WithReason } from '@/components/common/WithReason'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ConnectionStatus } from '@/components/global/ConnectionStatus'
import { useAuth, useSettings, useWorkspace } from '@/context/app-contexts'
import { validateResume } from '@/features/campaigns/composerModel'
import { downloadBell, playBell } from '@/lib/browserNotice'
import { GOOGLE_SCOPES, SENDING_DEFAULTS } from '@/lib/constants'
import { downloadFile } from '@/lib/csv'
import { modKeyLabel } from '@/lib/platform'
import { clearAppStorage } from '@/lib/storage'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { formatBytes, isValidUrl } from '@/lib/validation'
import {
  INSTALL_BENEFITS,
  IOS_STEPS,
  manualSteps,
  PWA_NOTE,
  UNSUPPORTED_MESSAGE,
} from '@/pwa/installCopy'
import { Steps } from '@/pwa/InstallDialog'
import { getUpdateAction, getUpdateState, isSending, subscribeUpdate } from '@/pwa/updateStore'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'

export function Field({ id, label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {(error || hint) && (
        <p
          id={`${id}-hint`}
          className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

function Row({ title, description, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-4 first:pt-0 last:border-0">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SwitchRow({ id, title, description, checked, onCheckedChange, disabledReason }) {
  const control = (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={Boolean(disabledReason)}
      aria-label={title}
    />
  )
  return (
    <Row title={title} description={description}>
      <WithReason reason={disabledReason} label={title}>
        {control}
      </WithReason>
    </Row>
  )
}

const validateProfile = (values) => {
  const errors = {}
  if (values.linkedin && !isValidUrl(values.linkedin))
    errors.linkedin = 'Use a full link starting with https://'
  if (values.portfolio && !isValidUrl(values.portfolio))
    errors.portfolio = 'Use a full link starting with https://'
  return errors
}

export function ProfileSection({ form }) {
  const { profile } = useWorkspace()
  const { values, errors, set } = form
  const input = (key, label, props = {}) => (
    <Field id={`profile-${key}`} label={label} error={errors[key]} hint={props.hint}>
      <Input
        id={`profile-${key}`}
        value={values[key]}
        onChange={(event) => set({ [key]: event.target.value })}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] || props.hint ? `profile-${key}-hint` : undefined}
        placeholder={profile?.[key] || props.placeholder}
        {...props.input}
      />
    </Field>
  )
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Used for the my_ placeholders in your templates. Empty fields render as missing.
      </p>
      {input('name', 'Your name', { input: { autoComplete: 'name' } })}
      <Field
        id="profile-email"
        label="Email"
        hint="Emails are sent from the Google account you connect."
      >
        <Input
          id="profile-email"
          value={profile?.email ?? 'Not connected'}
          readOnly
          aria-describedby="profile-email-hint"
          className="bg-muted/60"
        />
      </Field>
      {input('phone', 'Phone', { input: { type: 'tel', autoComplete: 'tel', inputMode: 'tel' } })}
      {input('linkedin', 'LinkedIn', {
        placeholder: 'https://linkedin.com/in/you',
        input: { type: 'url', inputMode: 'url' },
      })}
      {input('portfolio', 'Portfolio', {
        placeholder: 'https://you.dev',
        input: { type: 'url', inputMode: 'url' },
      })}
    </div>
  )
}
ProfileSection.validate = validateProfile

const validateSending = (values) => {
  const errors = {}
  if (!(values.delaySeconds >= 10 && values.delaySeconds <= 300))
    errors.delaySeconds = 'Use 10 to 300 seconds'
  if (!(values.dailyCap >= 1 && values.dailyCap <= SENDING_DEFAULTS.maxDailyCap))
    errors.dailyCap = `Use 1 to ${SENDING_DEFAULTS.maxDailyCap}`
  if (!(values.recencyDays >= 0 && values.recencyDays <= 365))
    errors.recencyDays = 'Use 0 to 365 days'
  return errors
}

export function SendingSection({ form }) {
  const { values, errors, set } = form
  const number = (key, label, hint, props) => (
    <Field id={`sending-${key}`} label={label} hint={hint} error={errors[key]}>
      <Input
        id={`sending-${key}`}
        type="number"
        inputMode="numeric"
        value={Number.isNaN(values[key]) ? '' : values[key]}
        onChange={(event) => set({ [key]: event.target.valueAsNumber })}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={`sending-${key}-hint`}
        className="w-32"
        {...props}
      />
    </Field>
  )
  return (
    <div className="flex max-w-lg flex-col gap-5">
      {number(
        'delaySeconds',
        'Delay between emails (seconds)',
        'Spacing sends out looks more natural and stays within Gmail limits.',
        { min: 10, max: 300 },
      )}
      {number(
        'dailyCap',
        'Daily limit',
        `Gmail limits how many emails an account can send per day. Keep this well under it. Upper bound here is ${SENDING_DEFAULTS.maxDailyCap}.`,
        {
          min: 1,
          max: SENDING_DEFAULTS.maxDailyCap,
        },
      )}
      {number(
        'recencyDays',
        'Warn if emailed within (days)',
        'Recipients emailed this recently are flagged in a new campaign.',
        { min: 0, max: 365 },
      )}
      <SwitchRow
        id="sending-resend"
        title="Allow sending again to already-emailed rows"
        description="Off by default. When on, rows marked Sent can be picked in a new campaign."
        checked={values.allowResend}
        onCheckedChange={(allowResend) => set({ allowResend })}
      />
    </div>
  )
}
SendingSection.validate = validateSending

export function ResumeSection() {
  const { resume, setResume, isMock } = useWorkspace()
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const reason = null

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        One PDF, up to 5 MB. Stored in this browser only and attached when you choose it in a
        campaign.
      </p>
      {resume ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
            <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{resume.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(resume.size)} · saved {formatDateTime(resume.savedAt)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setResume(null)}>
              Remove
            </Button>
          </div>
          <ResumePreview file={resume.file} name={resume.name} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No resume saved.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          const problem = validateResume(file)
          setError(problem)
          if (!problem) {
            const saved = { name: file.name, size: file.size, savedAt: new Date().toISOString(), file }
            Promise.resolve(setResume(saved))
              .then(() =>
                toast.success('Resume saved', {
                  description: isMock ? 'Mock data only. Kept for this session.' : 'Saved in this browser.',
                }),
              )
              .catch((failure) => setError(failure.message ?? "Couldn't save the resume."))
          }
        }}
      />
      <WithReason reason={reason} label="Upload PDF">
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={Boolean(reason)}
          className="self-start"
        >
          <FileUpIcon aria-hidden="true" />
          {resume ? 'Replace PDF' : 'Upload PDF'}
        </Button>
      </WithReason>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

const SCOPE_LABELS = {
  [GOOGLE_SCOPES.sheets]: 'See and edit your Google Sheets',
  [GOOGLE_SCOPES.gmailSend]: 'Send email as you',
}

export function GoogleSection() {
  const auth = useAuth()
  const { online } = useWorkspace()
  const [forgetOpen, setForgetOpen] = useState(false)
  const { prepare, live } = auth
  const busy = auth.status === 'requesting'

  useEffect(() => {
    if (!live) prepare()
  }, [live, prepare])

  const description = live
    ? `${auth.user?.email}. Session ends at ${new Date(auth.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
    : auth.hint
      ? `Last connected as ${auth.hint}. This tab has no active Google session.`
      : 'Not connected.'

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Row title="Google account" description={description}>
        <div className="flex items-center gap-3">
          <ConnectionStatus status={auth.status} online={online} className="max-sm:hidden" />
          {live ? (
            <Button variant="outline" onClick={() => auth.disconnect()}>
              Disconnect
            </Button>
          ) : (
            <WithReason
              reason={auth.disabledReason}
              label={auth.hint ? 'Reconnect' : 'Connect Google'}
            >
              <Button
                onClick={() => auth.connect()}
                disabled={Boolean(auth.disabledReason) || busy}
              >
                {busy ? 'Connecting' : auth.hint ? 'Reconnect' : 'Connect Google'}
              </Button>
            </WithReason>
          )}
        </div>
      </Row>
      {auth.status === 'partial' && (
        <InlineAlert
          tone="warning"
          title="Some permissions were not granted"
          action={
            <Button size="sm" onClick={auth.grantMissing} disabled={Boolean(auth.disabledReason)}>
              Grant permissions
            </Button>
          }
        >
          Missing: {auth.missing.map((scope) => SCOPE_LABELS[scope] ?? scope).join(', ')}.
        </InlineAlert>
      )}
      {auth.error && !live && <p className="text-sm text-destructive">{auth.error}</p>}
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">What the app asks for</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>Read and update the one sheet you choose, to sync rows and write back status.</li>
          <li>Send email as you, only after you confirm a campaign.</li>
          <li>Optional: read the threads it started, only if you turn on reply checking.</li>
        </ul>
        <p className="text-muted-foreground">
          A refresh keeps you signed in until the Google session expires, about an hour. Closing
          the tab ends it.
        </p>
      </div>
      {(live || auth.hint) && (
        <div className="flex flex-col items-start gap-2 border-t pt-4">
          <Button variant="ghost" className="text-destructive" onClick={() => setForgetOpen(true)}>
            Disconnect and forget
          </Button>
          <p className="text-xs text-muted-foreground">
            Revokes access at Google and removes the remembered email from this browser.
          </p>
        </div>
      )}
      <ConfirmDialog
        open={forgetOpen}
        onOpenChange={setForgetOpen}
        title="Disconnect and forget this account?"
        description="JobApply loses access to your sheet and Gmail until you connect again. Your sheet, templates, and settings are not changed."
        confirmLabel="Disconnect and forget"
        destructive
        onConfirm={() => auth.disconnect({ forget: true })}
      />
    </div>
  )
}

export function NotificationsSection() {
  const { settings, saveSection } = useSettings()
  const supported = typeof Notification !== 'undefined'
  const save = (section, values) => {
    try {
      saveSection(section, values)
    } catch (error) {
      toast.error("Couldn't save settings", { description: error.message })
    }
  }

  const setBrowserNotifications = async (enabled) => {
    if (!enabled) {
      save('browserNotifications', { enabled: false })
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('Notifications are blocked', {
        description: 'Allow notifications for this site in the browser, then turn this on again.',
      })
      return
    }
    save('browserNotifications', { enabled: true })
    playBell()
  }

  return (
    <div className="flex max-w-xl flex-col">
      <SwitchRow
        id="reply-tracking"
        title="Reply checking"
        description="Checks only the threads this app started, when you press Check replies in History."
        checked={settings.replyTracking.enabled}
        onCheckedChange={(enabled) => save('replyTracking', { enabled })}
      />
      <SwitchRow
        id="browser-notifications"
        title="Browser notifications"
        description="Plays a bell and shows a notification when a campaign finishes or pauses while this tab is in the background."
        checked={Boolean(settings.browserNotifications?.enabled)}
        onCheckedChange={setBrowserNotifications}
        disabledReason={supported ? null : 'This browser does not support notifications'}
      />
      <div className="flex flex-col items-start gap-2 border-b py-3">
        <Button type="button" variant="outline" size="sm" onClick={downloadBell}>
          <DownloadIcon aria-hidden="true" />
          Download bell sound
        </Button>
        <p className="text-sm text-muted-foreground">
          The same bell plays with a background notification. In-app notices still appear in the bell menu.
        </p>
      </div>
    </div>
  )
}

export function AppearanceSection() {
  const [prefs, updatePrefs] = useUiPrefs()
  return (
    <div className="flex max-w-xl flex-col">
      <Row title="Theme" description="System follows your device setting.">
        <ThemeSegmented className="w-full max-w-xs" />
      </Row>
      <Row title="Table density" description="Row height in desktop tables.">
        <ToggleGroup
          type="single"
          value={prefs.density}
          onValueChange={(density) => density && updatePrefs({ density })}
          aria-label="Table density"
          className="w-full max-w-xs"
        >
          <ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
          <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
        </ToggleGroup>
      </Row>
    </div>
  )
}

export function InstallSection() {
  const { status, platform, promptInstall } = useInstallPrompt()

  let content
  if (status === 'available') {
    content = (
      <Row title="Install JobApply" description={INSTALL_BENEFITS}>
        <Button onClick={promptInstall}>Install app</Button>
      </Row>
    )
  } else if (status === 'ios-instructions') {
    content = (
      <div className="flex flex-col gap-3 py-3">
        <p className="text-sm font-medium">Add JobApply to your Home Screen</p>
        <Steps steps={IOS_STEPS} shareIcon />
        <p className="text-sm text-muted-foreground">
          iPhone and iPad do not show an install prompt for web apps. These steps are the only way
          to install.
        </p>
      </div>
    )
  } else if (status === 'manual') {
    content = (
      <div className="flex flex-col gap-3 py-3">
        <p className="text-sm text-pretty">{INSTALL_BENEFITS}</p>
        <Steps steps={manualSteps(platform)} />
      </div>
    )
  } else if (status === 'pending' || status === 'installed') {
    content = (
      <p className="flex items-center gap-2 py-3 text-sm">
        <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />
        {status === 'pending'
          ? 'Installing. Your browser finishes this in a moment.'
          : 'Installed on this device. Open the app from your home screen or dock.'}
      </p>
    )
  } else {
    content = <p className="py-3 text-sm text-pretty">{UNSUPPORTED_MESSAGE}</p>
  }

  return (
    <div className="flex max-w-xl flex-col">
      {content}
      <p className="pt-2 text-sm text-muted-foreground">
        {PWA_NOTE} It updates automatically. Installed or not, sending always needs a connection and
        your confirmation.
      </p>
    </div>
  )
}

export function DataSection() {
  const { settings, saveSection } = useSettings()
  const { templates, clearSnapshot, saveSnapshot, isMock, importTemplates } = useWorkspace()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const importRef = useRef(null)

  return (
    <div className="flex max-w-xl flex-col">
      <SwitchRow
        id="keep-snapshot"
        title="Keep an offline copy"
        description="Saves your last synced applications in this browser so you can browse them offline. No sign-in data is saved. Turning this off deletes the copy."
        checked={settings.offline.keepSnapshot}
        onCheckedChange={(keepSnapshot) => {
          try {
            saveSection('offline', { keepSnapshot })
            if (isMock) return
            if (keepSnapshot) saveSnapshot()
            else clearSnapshot()
          } catch (error) {
            toast.error("Couldn't save settings", { description: error.message })
          }
        }}
      />
      <Row title="Import templates" description="Adds templates from a JSON file exported by this app.">
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            try {
              const parsed = JSON.parse(await file.text())
              const list = Array.isArray(parsed) ? parsed : parsed?.items
              const items = (list ?? [])
                .filter((item) => item && typeof item.name === 'string' && typeof item.subject === 'string' && typeof item.body === 'string')
                .map(({ name, subject, body }) => ({ name, subject, body }))
              if (!items.length) throw new Error('No templates found in that file.')
              toast.success(`Imported ${importTemplates(items)}`)
            } catch (error) {
              toast.error("Couldn't import templates", { description: error.message })
            }
          }}
        />
        <Button variant="outline" onClick={() => importRef.current?.click()}>
          <FileUpIcon aria-hidden="true" />
          Import
        </Button>
      </Row>
      <Row title="Export templates" description="Downloads your templates as a JSON file.">
        <Button
          variant="outline"
          disabled={!templates.length}
          onClick={() =>
            downloadFile(
              'jobapply-templates.json',
              JSON.stringify(
                templates.map(({ name, subject, body }) => ({ name, subject, body })),
                null,
                2,
              ),
              'application/json',
            )
          }
        >
          <DownloadIcon aria-hidden="true" />
          Export
        </Button>
      </Row>
      <Row
        title="Clear local data"
        description="Removes settings, the offline copy, and saved preferences from this browser. Your Google Sheet is not touched."
      >
        <Button variant="outline" className="text-destructive" onClick={() => setConfirmOpen(true)}>
          Clear local data
        </Button>
      </Row>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Clear local data?"
        description="Settings, preferences, and the offline copy are removed from this browser. The page reloads afterwards."
        confirmLabel="Clear local data"
        destructive
        onConfirm={() => {
          clearAppStorage()
          window.location.reload()
        }}
      />
    </div>
  )
}

function Keys({ keys }) {
  return (
    <KbdGroup>
      {keys.map((key, index) => (
        <Kbd key={index}>{key === 'mod' ? modKeyLabel() : key}</Kbd>
      ))}
    </KbdGroup>
  )
}

export function ShortcutsSection() {
  const rows = [
    ...GLOBAL_SHORTCUTS,
    ...NAV_ITEMS.map((item) => ({
      label: `Go to ${item.label}`,
      keys: ['G', item.shortcut.toUpperCase()],
    })),
    { label: 'Move between table rows', keys: ['↑', '↓'] },
    { label: 'Open the focused row', keys: ['Enter'] },
    { label: 'Select the focused row', keys: ['Space'] },
    { label: 'Email the selected rows', keys: ['E'] },
  ]
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Shortcuts pause while you type in a field. Press ? anywhere to see them.
      </p>
      <dl className="flex flex-col divide-y rounded-lg border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-h-10 items-center justify-between gap-4 px-4 py-1.5 text-sm"
          >
            <dt>{row.label}</dt>
            <dd>
              <Keys keys={row.keys} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function MoreSection() {
  return (
    <div className="flex max-w-xl flex-col gap-4 text-sm">
      <p>
        JobApply is made by <span className="font-medium">The Stack Guy</span>.
      </p>
      <p className="text-pretty text-muted-foreground">
        Use it when your applications already live in a spreadsheet and you want each recruiter email to leave from your own Gmail, after you have read it.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
        <li>Connect the Google Sheet you already keep.</li>
        <li>Preview one template against different recipients before anyone is emailed.</li>
        <li>Attach one resume PDF. It stays in this browser.</li>
        <li>Send only after you confirm the campaign.</li>
      </ul>
      <a
        href="https://thestackguy.in"
        target="_blank"
        rel="noreferrer noopener"
        className="w-fit font-medium underline underline-offset-4"
      >
        thestackguy.in
      </a>
    </div>
  )
}

export function AboutSection() {
  const { isMock, runs } = useWorkspace()
  const update = useSyncExternalStore(subscribeUpdate, getUpdateState)
  const action = getUpdateAction({ needRefresh: update.needRefresh, sending: isSending(runs) })
  return (
    <div className="flex max-w-xl flex-col gap-4 text-sm">
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2">
        <dt className="text-muted-foreground">Version</dt>
        <dd className="tabular-nums">{__APP_VERSION__}</dd>
        <dt className="text-muted-foreground">Data source</dt>
        <dd>{isMock ? 'Mock data (development only)' : 'Your Google Sheet'}</dd>
      </dl>
      {action && (
        <InlineAlert
          tone="info"
          title="Update ready"
          action={
            <WithReason
              reason={action.canReload ? null : 'Wait until sending finishes'}
              label="Reload"
            >
              <Button size="sm" onClick={() => update.apply?.()} disabled={!action.canReload}>
                Reload
              </Button>
            </WithReason>
          }
        >
          {action.message}
        </InlineAlert>
      )}
      <InlineAlert tone="info" title="No server">
        JobApply runs entirely in your browser. Your applications live in your Google Sheet and
        emails go out from your Gmail. Nothing is stored on a JobApply server.
      </InlineAlert>
    </div>
  )
}
