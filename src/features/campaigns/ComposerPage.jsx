import { useMemo, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileUpIcon,
  FlaskConicalIcon,
  PaperclipIcon,
  SearchIcon,
  SendIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionBar, ActionBarSpacer } from '@/components/common/ActionBar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { InlineAlert } from '@/components/common/InlineAlert'
import { ResponsiveList } from '@/components/common/ResponsiveList'
import { StepProgress, StepRail } from '@/components/common/Stepper'
import { WithReason } from '@/components/common/WithReason'
import { PageHeader, SubHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth, useProfile, useSettings, useWorkspace } from '@/context/app-contexts'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { indexLastSent, partitionRecipients } from '@/lib/eligibility'
import { buildTemplateValues, describeIssue } from '@/lib/templateEngine'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/validation'
import { ResumePreview } from '@/components/common/ResumePreview'
import { EmailCard } from '@/features/templates/TemplatePreview'
import { TemplateFields } from '@/features/templates/TemplateFields'
import { renderEmail } from '@/lib/templateEngine'
import { buildPlan, COMPOSER_STEPS, estimateDuration, getReachableSteps, getStepGuard, PREVIEW_CASES, previewApplication, validateResume } from './composerModel'
import { createRun } from './mockRun'
import { createRealRun, holdAttachment } from './realRun'

function RecipientRow({ application, warning }) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{application.recruiterName || application.recruiterEmail}</span>
        {warning && <span className="shrink-0 text-xs text-warning">{warning}</span>}
      </span>
      <span className="block truncate text-sm text-muted-foreground">
        {application.companyName} · {application.jobTitle}
      </span>
    </>
  )
}

function RecipientsStep({ eligible, excluded, selectedIds, setSelectedIds, excludedOpen, setExcludedOpen }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const visible = q
    ? eligible.filter(({ application: app }) =>
        [app.companyName, app.recruiterName, app.recruiterEmail, app.jobTitle].some((v) => v?.toLowerCase().includes(q)),
      )
    : eligible
  const toggle = (id) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allSelected = eligible.length > 0 && eligible.every(({ application }) => selectedIds.has(application.id))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipients"
            aria-label="Search recipients"
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSelectedIds(allSelected ? new Set() : new Set(eligible.map(({ application }) => application.id)))}
        >
          {allSelected ? 'Clear selection' : `Select all eligible (${eligible.length})`}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {selectedIds.size} selected of {eligible.length} eligible. Recently emailed recipients are flagged.
      </p>
      {visible.length ? (
        <ResponsiveList
          key={q}
          items={visible}
          getKey={({ application }) => application.id}
          label="Eligible recipients"
          selectionMode
          isSelected={({ application }) => selectedIds.has(application.id)}
          onToggle={({ application }) => toggle(application.id)}
          renderRow={(item) => <RecipientRow {...item} />}
          className="-mx-4 md:mx-0 md:overflow-hidden md:rounded-lg md:border md:[&>ul]:border-0"
        />
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">No eligible recipients match.</p>
      )}
      {excluded.length > 0 && (
        <Collapsible open={excludedOpen} onOpenChange={setExcludedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="-ml-2 self-start" aria-label={`${excluded.length} excluded recipients`}>
              <ChevronRightIcon className={cn('transition-transform', excludedOpen && 'rotate-90')} aria-hidden="true" />
              {excluded.length} excluded
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 divide-y rounded-lg border text-sm">
              {excluded.map(({ application, reason }) => (
                <li key={application.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate">
                    {application.recruiterName || application.recruiterEmail}
                    <span className="text-muted-foreground"> · {application.companyName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{reason}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

function PreviewCases({ caseId, onChange }) {
  return (
    <div role="radiogroup" aria-label="Preview case" className="flex flex-wrap gap-1.5">
      {PREVIEW_CASES.map((item) => {
        const checked = item.id === caseId
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring',
              checked ? 'border-brand bg-brand/5 font-medium' : 'text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function MessageStep({ templates, templateId, onTemplateChange, effective, overrides, setOverrides, sampleValues, from, previewEmail, previewTo, previewCase, setPreviewCase }) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Template</legend>
        <div role="radiogroup" aria-label="Template" className="grid gap-2 sm:grid-cols-2">
          {templates.map((template) => {
            const checked = template.id === templateId
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onTemplateChange(template.id)}
                className={cn(
                  'flex min-h-14 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring',
                  checked ? 'border-brand bg-brand/5' : 'hover:border-border-strong',
                )}
              >
                <span className="text-sm font-medium">{template.name}</span>
                <span className="w-full truncate text-xs text-muted-foreground">{template.subject}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Changes apply to this campaign only.</p>
          {(overrides.subject != null || overrides.body != null) && (
            <Button variant="ghost" size="sm" onClick={() => setOverrides({})}>
              Reset to template
            </Button>
          )}
        </div>
        <TemplateFields
          subject={effective.subject}
          body={effective.body}
          onChange={(patch) => setOverrides((current) => ({ ...current, ...patch }))}
          sampleValues={sampleValues}
        />
      </div>
      {previewEmail && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Email preview</p>
          <PreviewCases caseId={previewCase} onChange={setPreviewCase} />
          <EmailCard from={from} to={previewTo} email={previewEmail} />
        </div>
      )}
    </div>
  )
}

function AttachmentStep({ attachment, setAttachment, error, setError, from, previewEmail, previewTo, previewCase, setPreviewCase }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const isDesktop = useMediaQuery(MEDIA.md)

  const accept = (file) => {
    const problem = validateResume(file)
    setError(problem)
    if (!problem) setAttachment({ name: file.name, size: file.size, savedAt: new Date().toISOString(), file })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pretty text-muted-foreground">
        One PDF, up to 5 MB. It's attached to every email in this campaign. You can also send without an attachment.
      </p>
      {attachment && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
          <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(attachment.size)} · saved {formatDateTime(attachment.savedAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAttachment(null)}>
              Remove
            </Button>
          </div>
        </div>
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
          if (file) accept(file)
          event.target.value = ''
        }}
      />
      {!attachment &&
        (isDesktop ? (
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files?.[0]
              if (file) accept(file)
            }}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-(--dur-fast)',
              dragging && 'border-brand bg-brand/5',
            )}
          >
            <FileUpIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm">Drop your resume here, or</p>
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              Choose PDF
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => inputRef.current?.click()} className="self-start">
            <FileUpIcon aria-hidden="true" />
            Choose PDF
          </Button>
        ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {previewEmail && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Email preview</p>
            <PreviewCases caseId={previewCase} onChange={setPreviewCase} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <EmailCard from={from} to={previewTo} email={previewEmail} attachmentName={attachment?.name} />
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">Resume preview</p>
              {attachment?.file ? (
                <ResumePreview file={attachment.file} name={attachment.name} />
              ) : (
                <p className="rounded-md border border-dashed px-4 py-8 text-sm text-muted-foreground">
                  {attachment
                    ? `${attachment.name} is listed, but this session has no PDF bytes to preview.`
                    : 'No resume attached. This email sends without a file.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewStep({ plan, index, setIndex, from, attachment, templateId }) {
  const isLarge = useMediaQuery(MEDIA.lg)
  const recipients = plan.recipients
  const current = recipients[Math.min(index, recipients.length - 1)]
  if (!current) return null

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-5">
      {isLarge && (
        <nav aria-label="Recipients to preview" className="max-h-[32rem] overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {recipients.map((recipient, i) => (
              <li key={recipient.application.id}>
                <button
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    i === index ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{recipient.application.recruiterName || recipient.application.recruiterEmail}</span>
                  {recipient.blocked && <TriangleAlertIcon className="size-3.5 shrink-0 text-warning" aria-label="Blocked" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            Preview {index + 1} of {recipients.length}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous recipient" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next recipient"
              disabled={index >= recipients.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        {current.blocked && (
          <InlineAlert
            tone="warning"
            title="This recipient is blocked"
            action={
              <Button asChild variant="outline" size="sm">
                <Link to={`/templates/${templateId}`}>Fix in template</Link>
              </Button>
            }
          >
            {current.issues.map(describeIssue).join('. ')}. They won't be emailed until this is fixed.
          </InlineAlert>
        )}
        {current.warning && !current.blocked && <InlineAlert tone="warning">{current.warning}. Make sure a second email is welcome.</InlineAlert>}
        <EmailCard from={from} to={current.application.recruiterEmail} email={current.email} attachmentName={attachment?.name} />
        {attachment?.file && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Resume preview</p>
            <ResumePreview file={attachment.file} name={attachment.name} />
          </div>
        )}
      </div>
    </div>
  )
}

function Summary({ plan, excludedCount, onViewExcluded, template, attachment, settings, usage }) {
  const remaining = Math.max(0, settings.dailyCap - usage.sentToday)
  const rows = [
    ['Recipients', plan.sendable.length],
    ['Blocked', plan.blocked.length || null],
    ['Excluded', excludedCount],
    ['Template', template?.name ?? '-'],
    ['Attachment', attachment ? `${attachment.name} (${formatBytes(attachment.size)})` : 'None'],
    ['Pace', `1 per ${settings.delaySeconds} s`],
    ['Duration', plan.sendable.length ? `about ${estimateDuration(plan.sendable.length, settings.delaySeconds)}` : '-'],
    ['Today', `${usage.sentToday} of ${settings.dailyCap} used, ${remaining} left`],
  ].filter(([, value]) => value != null)

  return (
    <dl className="flex flex-col divide-y text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 truncate text-right font-medium tabular-nums">
            {label === 'Excluded' && excludedCount > 0 ? (
              <button type="button" className="underline-offset-4 hover:underline" onClick={onViewExcluded}>
                {value} (view)
              </button>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function ComposerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(MEDIA.md)
  const isWide = useMediaQuery('(min-width: 1280px)')
  const profile = useProfile()
  const { settings } = useSettings()
  const auth = useAuth()
  const { applications, emailLog, templates, resume, usage, status, connected, isMock, saveRun, addEmailLog, sheetConfig } = useWorkspace()

  const { eligible, excluded } = useMemo(
    () => partitionRecipients(applications, { lastSentByEmail: indexLastSent(emailLog), settings: settings.sending }),
    [applications, emailLog, settings.sending],
  )

  const [initialized, setInitialized] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [step, setStep] = useState('recipients')
  const [templateId, setTemplateId] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [attachment, setAttachment] = useState(null)
  const [attachmentError, setAttachmentError] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewCase, setPreviewCase] = useState('selected')
  const [excludedOpen, setExcludedOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!initialized && status === 'ready' && connected) {
    setInitialized(true)
    const preselected = new Set(location.state?.ids ?? [])
    setSelectedIds(new Set(eligible.filter(({ application }) => preselected.has(application.id)).map(({ application }) => application.id)))
    setTemplateId(templates[0]?.id ?? null)
    setAttachment(resume)
  }

  const baseTemplate = templates.find((template) => template.id === templateId) ?? null
  const effective = useMemo(() => (baseTemplate ? { ...baseTemplate, ...overrides } : null), [baseTemplate, overrides])
  const plan = useMemo(
    () => (effective ? buildPlan({ eligible, selectedIds, template: effective, profile }) : { recipients: [], sendable: [], blocked: [] }),
    [eligible, selectedIds, effective, profile],
  )
  const remainingToday = Math.max(0, settings.sending.dailyCap - usage.sentToday)
  const guardContext = { selectedCount: selectedIds.size, template: effective, attachmentError, plan, remainingToday }
  const reachable = getReachableSteps(guardContext)
  const stepIndex = COMPOSER_STEPS.findIndex((item) => item.id === step)
  const guard =
    getStepGuard(step, guardContext) ?? (step === 'review' && !isMock && !auth.live ? 'Connect Google first' : null)
  const previewBase = plan.recipients[0]?.application ?? eligible[0]?.application
  const previewApp = previewApplication(previewBase, previewCase)
  const previewEmail = effective ? renderEmail(effective, previewApp, profile) : null
  const sampleValues = buildTemplateValues(previewBase, profile)
  const fromEmail = auth.user?.email ?? ''
  const from = fromEmail ? `${profile.name || 'You'} <${fromEmail}>` : 'Your Gmail (not connected)'

  const steps = COMPOSER_STEPS.map((item, index) => ({
    ...item,
    reachable: reachable.has(item.id),
    complete: index < stepIndex,
    meta: item.id === 'recipients' && selectedIds.size ? selectedIds.size : null,
  }))

  const goTo = (id) => {
    if (reachable.has(id)) setStep(id)
  }
  const next = () => {
    if (guard) return
    if (step === 'review') setConfirmOpen(true)
    else setStep(COMPOSER_STEPS[stepIndex + 1].id)
  }
  const back = () => (stepIndex === 0 ? navigate('/campaigns') : setStep(COMPOSER_STEPS[stepIndex - 1].id))

  const start = () => {
    if (!isMock) {
      if (!fromEmail) return
      const id = crypto.randomUUID()
      if (attachment?.file) holdAttachment(id, attachment.file)
      const recipients = plan.sendable.map((recipient) => ({ application: recipient.application, subject: recipient.subject }))
      saveRun(
        createRealRun({
          id,
          recipients,
          template: effective,
          attachmentName: attachment?.name ?? null,
          fromName: profile.name,
          fromEmail,
          delayMs: settings.sending.delaySeconds * 1000,
        }),
      )
      setConfirmOpen(false)
      navigate(`/campaigns/${id}`, { replace: true })
      return
    }
    const id = `mock-${Date.now().toString(36)}`
    const recipients = plan.sendable.map((recipient) => ({ application: recipient.application, subject: recipient.subject }))
    saveRun(createRun({ id, recipients, template: effective, attachmentName: attachment?.name, from }))
    setConfirmOpen(false)
    navigate(`/campaigns/${id}`, { replace: true })
  }

  const sendTest = async () => {
    const application = plan.sendable[0]?.application ?? eligible[0]?.application
    if (!application || !effective) {
      toast.error('Choose a template and a recipient first')
      return
    }
    try {
      const mod = await import('./sendOne.js')
      const fileBytes = attachment?.file ? new Uint8Array(await attachment.file.arrayBuffer()) : null
      await mod.sendTestEmail({
        fromName: profile.name,
        fromEmail,
        template: effective,
        application,
        profile,
        attachment: fileBytes ? { filename: attachment.name, bytes: fileBytes } : null,
        addLog: addEmailLog,
        appendLog: sheetConfig
          ? async (row) => {
              const sheets = await import('@/context/sheetSync')
              await sheets.appendEmailLog(sheetConfig.spreadsheetId, row)
            }
          : null,
      })
      toast.success('Test email sent', { description: 'It went to your inbox. No application row was changed.' })
    } catch (error) {
      toast.error("Couldn't send the test", { description: error?.userMessage ?? 'Something went wrong.' })
    }
  }

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="New campaign" />
        <div className="flex flex-col gap-3 p-4 md:p-6" aria-hidden="true">
          <Skeleton className="h-10" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }

  if (!connected) {
    return (
      <>
        <PageHeader title="New campaign" />
        <EmptyState
          icon={SendIcon}
          title="Connect a sheet to start a campaign"
          description="Recipients come from your Google Sheet. Nothing is sent until you preview and confirm."
          action={
            <Button asChild variant="outline">
              <Link to="/sheets">Connect a sheet</Link>
            </Button>
          }
        />
      </>
    )
  }

  const sendLabel = `Review and send ${plan.sendable.length}`
  const primaryLabel = step === 'review' ? sendLabel : 'Continue'
  const summary = (
    <Summary
      plan={plan}
      excludedCount={excluded.length}
      onViewExcluded={() => {
        setStep('recipients')
        setExcludedOpen(true)
      }}
      template={effective}
      attachment={attachment}
      settings={settings.sending}
      usage={usage}
    />
  )

  const content = (
    <>
      {step === 'recipients' && (
        <RecipientsStep
          eligible={eligible}
          excluded={excluded}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          excludedOpen={excludedOpen}
          setExcludedOpen={setExcludedOpen}
        />
      )}
      {step === 'message' && (
        <MessageStep
          templates={templates}
          templateId={templateId}
          onTemplateChange={(id) => {
            setTemplateId(id)
            setOverrides({})
          }}
          effective={effective}
          overrides={overrides}
          setOverrides={setOverrides}
          sampleValues={sampleValues}
          from={from}
          previewEmail={previewEmail}
          previewTo={previewApp.recruiterEmail}
          previewCase={previewCase}
          setPreviewCase={setPreviewCase}
        />
      )}
      {step === 'attachment' && (
        <AttachmentStep
          attachment={attachment}
          setAttachment={setAttachment}
          error={attachmentError}
          setError={setAttachmentError}
          from={from}
          previewEmail={previewEmail}
          previewTo={previewApp.recruiterEmail}
          previewCase={previewCase}
          setPreviewCase={setPreviewCase}
        />
      )}
      {step === 'review' && (
        <ReviewStep plan={plan} index={previewIndex} setIndex={setPreviewIndex} from={from} attachment={attachment} templateId={templateId} />
      )}
    </>
  )

  const footerButtons = (
    <>
      <Button variant="outline" onClick={back} className="max-md:flex-1">
        Back
      </Button>
      {step === 'review' && (
        <WithReason
          reason={isMock ? 'Mock mode never sends email' : !auth.live ? 'Connect Google first' : null}
          label="Send test to me"
        >
          <Button variant="ghost" disabled={isMock || !auth.live} className="max-md:hidden" onClick={sendTest}>
            Send test to me
          </Button>
        </WithReason>
      )}
      <div className="flex-1 max-md:hidden" />
      {guard && <p className="order-first basis-full text-right text-sm text-muted-foreground max-md:hidden">{guard}</p>}
      <WithReason reason={guard} label={primaryLabel} className="max-md:flex-1">
        <Button onClick={next} disabled={Boolean(guard)} className="max-md:w-full max-md:flex-1">
          {primaryLabel}
        </Button>
      </WithReason>
    </>
  )

  const confirm = (
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={`Send ${plan.sendable.length} ${plan.sendable.length === 1 ? 'email' : 'emails'}?`}
      description={
        isMock
          ? 'Mock run: nothing is sent and Google is not contacted. It moves faster than the real pace below.'
          : `Emails go out one at a time from your Gmail, ${settings.sending.delaySeconds} seconds apart. The first send adds an Email_Log tab.${
              plan.sendable.some((item) => item.application.emailStatus === 'Sent')
                ? ' This includes people you already emailed.'
                : ''
            }`
      }
      confirmLabel={isMock ? 'Start mock run' : `Send ${plan.sendable.length} emails`}
      onConfirm={start}
      acknowledgement="I reviewed the previews"
    >
      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Template</dt>
        <dd className="truncate">{effective?.name}</dd>
        <dt className="text-muted-foreground">Attachment</dt>
        <dd className="truncate">{attachment?.name ?? 'None'}</dd>
        <dt className="text-muted-foreground">From</dt>
        <dd className="truncate">{from}</dd>
        <dt className="text-muted-foreground">Pace</dt>
        <dd>1 per {settings.sending.delaySeconds} s</dd>
        <dt className="text-muted-foreground">Time</dt>
        <dd>about {estimateDuration(plan.sendable.length, settings.sending.delaySeconds)}</dd>
        <dt className="text-muted-foreground">Today</dt>
        <dd>
          {usage.sentToday} of {settings.sending.dailyCap} used
        </dd>
      </dl>
      {(plan.blocked.length > 0 || excluded.length > 0) && (
        <p className="flex items-start gap-2 pt-2 text-sm text-muted-foreground">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {plan.blocked.length} blocked, {excluded.length} excluded. They won't be emailed.
        </p>
      )}
    </ConfirmDialog>
  )

  if (!isDesktop) {
    return (
      <>
        <SubHeader backTo="/campaigns" backLabel="Cancel and go to Campaigns" title="New campaign" />
        <h1 className="sr-only">New campaign</h1>
        {isMock && (
          <p className="flex items-center gap-2 border-b bg-warning/10 px-4 py-2 text-xs">
            <FlaskConicalIcon className="size-3.5 text-warning" aria-hidden="true" />
            Mock data. Nothing will be sent.
          </p>
        )}
        <div className="flex flex-col gap-4 px-4 py-4">
          <StepProgress steps={steps} currentId={step} />
          <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="-ml-2">
                <ChevronDownIcon className={cn('transition-transform', !summaryOpen && '-rotate-90')} aria-hidden="true" />
                Summary
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>{summary}</CollapsibleContent>
          </Collapsible>
          {content}
          {guard && <p className="text-sm text-muted-foreground">{guard}</p>}
        </div>
        <ActionBarSpacer />
        <ActionBar label="Campaign steps">{footerButtons}</ActionBar>
        {confirm}
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="New campaign"
        actions={
          <Button asChild variant="ghost">
            <Link to="/campaigns">Cancel</Link>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 overflow-y-auto border-r p-3">
          <StepRail steps={steps} currentId={step} onSelect={goTo} label="Campaign steps" />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <section aria-label={COMPOSER_STEPS[stepIndex].label} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <h2 className="text-base font-semibold">{COMPOSER_STEPS[stepIndex].label}</h2>
              {!isWide && (
                <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen} className="rounded-lg border px-4">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex h-10 w-full items-center gap-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ChevronDownIcon className={cn('size-4 transition-transform', !summaryOpen && '-rotate-90')} aria-hidden="true" />
                      Summary
                      <span className="ml-auto font-normal text-muted-foreground tabular-nums">{plan.sendable.length} recipients</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pb-2">{summary}</CollapsibleContent>
                </Collapsible>
              )}
              {content}
            </div>
          </section>
          <ActionBar variant="footer" label="Campaign steps" className="flex-wrap">
            {footerButtons}
          </ActionBar>
        </div>
        {isWide && (
          <aside aria-label="Summary" className="w-72 shrink-0 overflow-y-auto border-l px-5 py-5">
            <h2 className="mb-2 text-sm font-semibold">Summary</h2>
            {summary}
            {isMock && (
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                Mock data. Starting runs a local simulation; nothing is sent.
              </p>
            )}
          </aside>
        )}
      </div>
      {confirm}
    </div>
  )
}
