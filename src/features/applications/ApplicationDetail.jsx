import { useId, useMemo, useState } from 'react'
import { CircleAlertIcon, ExternalLinkIcon, MailIcon, SearchXIcon } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { WithReason } from '@/components/common/WithReason'
import { SubHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useWorkspace } from '@/context/app-contexts'
import { EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'
import { getEligibility } from '@/lib/eligibility'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { ApplicationStatusSelect } from './ApplicationStatusSelect'
import { useApplicationActions } from './useApplicationActions'

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function useTimeline(application) {
  const { emailLog } = useWorkspace()
  return useMemo(() => {
    if (!application) return []
    const events = emailLog
      .filter((row) => row.applicationId === application.id)
      .map((row) => ({
        id: row.logId,
        at: row.timestamp,
        tone: row.result === 'Failed' ? 'destructive' : 'brand',
        text: row.result === 'Failed' ? `Failed (${row.templateName})` : `Sent (${row.templateName})`,
        detail: row.error || row.subject,
      }))
    if (application.replyDate) {
      const labels = {
        [REPLY_STATUS.replied]: ['Reply detected', 'success'],
        [REPLY_STATUS.autoReply]: ['Automatic reply detected', 'warning'],
        [REPLY_STATUS.bounced]: ['Bounce detected', 'destructive'],
      }
      const [text, tone] = labels[application.replyStatus] ?? ['Reply status updated', 'neutral']
      events.push({ id: 'reply', at: application.replyDate, tone, text })
    }
    return events.sort((a, b) => (a.at > b.at ? 1 : -1))
  }, [application, emailLog])
}

const DOT = {
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  neutral: 'bg-muted-foreground',
}

function NotesField({ application }) {
  const { updateApplications, isMock, online } = useWorkspace()

  if (!isMock) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Notes</span>
        <p className="text-sm whitespace-pre-wrap">
          {application.notes || <span className="text-muted-foreground">No notes.</span>}
        </p>
        <p className="text-xs text-muted-foreground">Notes are yours: edit them in the Notes column of your sheet.</p>
      </div>
    )
  }
  return <MockNotesField application={application} updateApplications={updateApplications} online={online} />
}

function MockNotesField({ application, updateApplications, online }) {
  const id = useId()
  const isMock = true
  const [value, setValue] = useState(application.notes ?? '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (value === (application.notes ?? '')) return
    updateApplications([application.id], { notes: value })
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>Notes</Label>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {saved ? (isMock ? 'Saved to mock data' : 'Saved') : ''}
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        disabled={!online}
        onChange={(event) => {
          setValue(event.target.value)
          setSaved(false)
        }}
        onBlur={save}
        rows={3}
        placeholder="Add a note. It's saved to the Notes column."
      />
    </div>
  )
}

function DetailContent({ application, headingLevel: Heading }) {
  const { isMock, emailLog } = useWorkspace()
  const { emailApplications } = useApplicationActions()
  const timeline = useTimeline(application)
  const eligibility = getEligibility(application, { lastSentByEmail: new Map() })
  const mockReason = isMock ? 'Mock data has no real sheet or Gmail thread' : null
  const gmailReason = mockReason ?? (application.threadId ? null : 'Not sent yet')
  const hasLog = emailLog.some((row) => row.applicationId === application.id)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Heading className="pr-10 text-lg font-semibold md:pr-8">{application.companyName}</Heading>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{application.jobTitle}</span>
          <ApplicationStatusSelect application={application} className="-ml-1 w-auto" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <WithReason reason={eligibility.eligible ? null : eligibility.reason} label="Email recruiter">
            <Button size="sm" onClick={() => emailApplications([application.id])} disabled={!eligibility.eligible}>
              <MailIcon aria-hidden="true" />
              Email recruiter
            </Button>
          </WithReason>
          {application.jobLink && (
            <Button asChild variant="outline" size="sm">
              <a href={application.jobLink} target="_blank" rel="noreferrer noopener">
                Job posting
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <dl className="divide-y border-y">
        <Field label="Recruiter">{application.recruiterName || <span className="text-muted-foreground">No name</span>}</Field>
        <Field label="Email">
          <span className="font-mono text-xs">{application.recruiterEmail}</span>
        </Field>
        <Field label="Template">{application.templateName || <span className="text-muted-foreground">None</span>}</Field>
        <Field label="Email status">
          <StatusBadge status={application.emailStatus || EMAIL_STATUS.notSent} />
        </Field>
        <Field label="Reply">
          {application.replyStatus ? <StatusBadge status={application.replyStatus} /> : <span className="text-muted-foreground">-</span>}
        </Field>
        <Field label="Last sent">{application.sentDate ? formatDateTime(application.sentDate) : '-'}</Field>
        {application.lastError && (
          <Field label="Last error">
            <span className="flex items-start gap-1.5 text-destructive">
              <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {application.lastError}
            </span>
          </Field>
        )}
      </dl>

      <NotesField key={application.id} application={application} />

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Timeline</h3>
        {timeline.length ? (
          <ol className="flex flex-col gap-3 border-l pl-4">
            {timeline.map((event) => (
              <li key={event.id} className="relative text-sm">
                <span aria-hidden="true" className={cn('absolute top-1.5 -left-[21px] size-2 rounded-full ring-4 ring-background', DOT[event.tone])} />
                <p className="font-medium">{event.text}</p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                  {event.detail && <> · {event.detail}</>}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            {hasLog ? 'No events yet.' : 'Nothing sent yet. Sends and replies will appear here.'}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <WithReason reason={mockReason} label="Open in Sheets">
          <Button variant="outline" size="sm" disabled={Boolean(mockReason)}>
            Open in Sheets
            <ExternalLinkIcon aria-hidden="true" />
          </Button>
        </WithReason>
        <WithReason reason={gmailReason} label="Open thread in Gmail">
          <Button variant="outline" size="sm" disabled={Boolean(gmailReason)}>
            Open thread in Gmail
            <ExternalLinkIcon aria-hidden="true" />
          </Button>
        </WithReason>
      </div>
    </div>
  )
}

function Missing({ headingLevel }) {
  return (
    <EmptyState
      icon={SearchXIcon}
      title="Application not found"
      description="It may have been removed from your sheet, or the link is from a different sheet."
      className={headingLevel === 'h1' ? undefined : 'py-10'}
    />
  )
}

export function ApplicationDetail({ application, open, missing, variant, onClose }) {
  const { status } = useWorkspace()

  if (variant === 'screen') {
    return (
      <>
        <SubHeader backTo="/applications" backLabel="Back to Applications" title={application?.companyName ?? 'Application'} />
        <div className="px-4 py-4">
          {application ? (
            <DetailContent application={application} headingLevel="h1" />
          ) : status === 'ready' ? (
            <>
              <h1 className="sr-only">Application not found</h1>
              <Missing headingLevel="h1" />
            </>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-[min(92vw,480px)] gap-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{application?.companyName ?? 'Application'}</SheetTitle>
          <SheetDescription>Application details, notes, and email timeline.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
          {application ? <DetailContent application={application} headingLevel="p" /> : missing ? <Missing /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
