import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, CircleAlertIcon, CircleDashedIcon, FlaskConicalIcon, Loader2Icon, MinusIcon, WifiOffIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { InlineAlert } from '@/components/common/InlineAlert'
import { KpiStrip } from '@/components/common/KpiStrip'
import { StatusBadge } from '@/components/common/StatusBadge'
import { WithReason } from '@/components/common/WithReason'
import { PageBody, PageHeader, SubHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/context/app-contexts'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { formatDateTime, formatTime } from '@/lib/time'
import { formatDuration, groupCampaigns } from './campaignsModel'
import { cancelRun, MOCK_PACE_MS, pauseRun, resumeRun, retryFailed, runCounts } from './mockRun'

const ITEM_ICON = {
  pending: { icon: CircleDashedIcon, className: 'text-muted-foreground', label: 'Waiting' },
  unknown: { icon: CircleAlertIcon, className: 'text-warning', label: 'Unknown' },
  sending: { icon: Loader2Icon, className: 'animate-spin text-brand', label: 'Sending' },
  sent: { icon: CheckIcon, className: 'text-success', label: 'Sent' },
  failed: { icon: CircleAlertIcon, className: 'text-destructive', label: 'Failed' },
  skipped: { icon: MinusIcon, className: 'text-muted-foreground', label: 'Skipped' },
}

function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [active])
  return now
}

function Header({ title, actions }) {
  const isDesktop = useMediaQuery(MEDIA.md)
  if (isDesktop) return <PageHeader title={title} actions={actions} />
  return (
    <>
      <SubHeader backTo="/campaigns" backLabel="Back to Campaigns" title={title} />
      <h1 className="sr-only">{title}</h1>
    </>
  )
}

const PAUSE_COPY = {
  offline: 'Paused because you went offline. Resume when you are ready. Nothing restarts on its own.',
  session: 'Paused because Google needs you to reconnect. Resume after that. Nothing sends until you confirm.',
  cap: "Paused because today's sending limit is reached.",
  attachment: 'Paused because the resume file is not on this device. Add it in Settings, then resume.',
  write: 'Paused because the sheet could not be updated, so the email was not sent.',
  reload: 'This campaign was still going when the page closed. Already-sent recipients are not sent again.',
  user: 'Paused. Nothing will send until you resume.',
}

function RunView({ run }) {
  const { updateRun, online } = useWorkspace()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(Boolean(run.needsConfirm))
  const counts = runCounts(run)
  const done = counts.sent + counts.failed + counts.skipped
  const running = run.status === 'running'
  const now = useNow(running)
  const secondsLeft = running && run.nextAt ? Math.max(0, Math.ceil((run.nextAt - now) / 1000)) : null
  const current = run.items.find((item) => item.status === 'sending')
  const finished = run.status === 'done' || run.status === 'cancelled'
  const remainingMs = counts.pending * (run.delayMs ?? MOCK_PACE_MS)
  const update = (fn) => updateRun(run.id, fn)

  const title = finished ? (run.status === 'done' ? 'Campaign finished' : 'Campaign cancelled') : running ? 'Sending' : 'Paused'

  return (
    <>
      <Header
        title={title}
        actions={
          <Button asChild variant="outline">
            <Link to="/campaigns">All campaigns</Link>
          </Button>
        }
      />
      <PageBody className="max-w-3xl">
        {run.mock !== false && (
          <InlineAlert tone="warning" title="Mock run">
            This is a local simulation. No emails are sent and Google is not contacted.
          </InlineAlert>
        )}

        {run.status === 'paused' && (
          <InlineAlert tone="warning" title="Paused">
            {PAUSE_COPY[run.pausedReason] ?? PAUSE_COPY.user}
            {run.pausedReason === 'offline' && !online ? ' Reconnect, then resume.' : ''}
          </InlineAlert>
        )}

        <section aria-labelledby="run-progress" className="flex flex-col gap-3 rounded-lg border p-4">
          <h2 id="run-progress" className="sr-only">
            Progress
          </h2>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xl font-semibold tabular-nums">
              {done} <span className="text-base font-normal text-muted-foreground">of {counts.total}</span>
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {[
                counts.failed > 0 && <span key="failed" className="text-destructive">{counts.failed} failed</span>,
                !finished && counts.pending > 0 && <span key="left">about {formatDuration(remainingMs)} left</span>,
              ]
                .filter(Boolean)
                .reduce((parts, part, index) => (index ? [...parts, ' · ', part] : [part]), [])}
            </p>
          </div>
          <Progress value={(done / counts.total) * 100} aria-label="Campaign progress" />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {current && running
              ? `Sending to ${current.name}${secondsLeft ? ` in ${secondsLeft} s` : ''}`
              : run.status === 'paused'
                ? 'Paused. Nothing will send until you resume.'
                : finished
                  ? `${counts.sent} sent, ${counts.failed} failed${counts.skipped ? `, ${counts.skipped} skipped` : ''}.`
                  : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {running && (
              <Button variant="outline" onClick={() => update(pauseRun)}>
                Pause
              </Button>
            )}
            {run.status === 'paused' && (
              <WithReason reason={online ? null : "You're offline"} label="Resume">
                <Button
                  onClick={() => (run.mock === false ? setResumeOpen(true) : update((r) => resumeRun(r, Date.now(), { online })))}
                  disabled={!online}
                >
                  Resume
                </Button>
              </WithReason>
            )}
            {!finished && (
              <Button variant="ghost" onClick={() => setCancelOpen(true)}>
                Cancel remaining
              </Button>
            )}
            {finished && counts.failed > 0 && (
              <WithReason reason={online ? null : "You're offline"} label={`Retry ${counts.failed} failed`}>
                <Button onClick={() => update((r) => retryFailed(r, Date.now()))} disabled={!online}>
                  Retry {counts.failed} failed
                </Button>
              </WithReason>
            )}
          </div>
        </section>

        <section aria-labelledby="run-queue" className="flex flex-col gap-2">
          <h2 id="run-queue" className="text-sm font-semibold">
            Queue
          </h2>
          <ol className="divide-y rounded-lg border">
            {run.items.map((item) => {
              const meta = ITEM_ICON[item.status]
              const Icon = meta.icon
              return (
                <li key={item.applicationId} className="flex items-start gap-3 px-4 py-2.5">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.at ? (
                          <>
                            <span className="sr-only">{meta.label} at </span>
                            {formatTime(item.at)}
                          </>
                        ) : (
                          meta.label
                        )}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.company} · {item.subject}
                    </p>
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </PageBody>
      <ConfirmDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        title="Resume campaign?"
        description="Already-sent recipients are not sent again. Nothing sends until you confirm."
        confirmLabel="Resume sending"
        onConfirm={() => {
          update((current) => ({ ...resumeRun(current, Date.now(), { online: true }), needsConfirm: false }))
          setResumeOpen(false)
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${counts.pending + counts.sending} remaining?`}
        description="Emails already sent stay sent. The rest are skipped and can be picked again in a new campaign."
        confirmLabel="Cancel remaining"
        cancelLabel="Keep going"
        destructive
        onConfirm={() => {
          update(cancelRun)
          setCancelOpen(false)
        }}
      />
    </>
  )
}

function PastView({ campaign, applications }) {
  const isDesktop = useMediaQuery(MEDIA.md)
  const replies = new Map(applications.map((app) => [app.id, app.replyStatus]))
  return (
    <>
      <Header title={`${campaign.templateName} campaign`} />
      <PageBody>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(campaign.startedAt)} · {formatDuration(new Date(campaign.endedAt) - new Date(campaign.startedAt))}
          {campaign.attachment && ` · ${campaign.attachment}`}
        </p>
        <KpiStrip
          items={[
            { label: 'Recipients', value: campaign.total },
            { label: 'Sent', value: campaign.sent },
            { label: 'Failed', value: campaign.failed },
            { label: 'Replied', value: campaign.replied },
          ]}
        />
        {campaign.failed > 0 && (
          <InlineAlert
            tone="destructive"
            title={`${campaign.failed} failed`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/campaigns/new"
                  state={{ ids: campaign.rows.filter((row) => row.result === 'Failed').map((row) => row.applicationId) }}
                >
                  Retry in new campaign
                </Link>
              </Button>
            }
          >
            Failed emails were not delivered. Retrying starts a new campaign so you can review first.
          </InlineAlert>
        )}
        <section aria-labelledby="campaign-recipients" className="flex flex-col gap-2">
          <h2 id="campaign-recipients" className="text-sm font-semibold">
            Recipients
          </h2>
          {isDesktop ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {['Recruiter', 'Company', 'Result', 'Reply', 'Time'].map((label) => (
                      <th key={label} scope="col" className="h-9 border-b px-4 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaign.rows.map((row) => (
                    <tr key={row.logId} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <Link to={`/applications/${row.applicationId}`} className="font-medium underline-offset-4 hover:underline">
                          {row.recipientName || row.recipient}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.companyName}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={row.result} />
                      </td>
                      <td className="px-4 py-2">{replies.get(row.applicationId) ? <StatusBadge status={replies.get(row.applicationId)} /> : <span className="text-muted-foreground">-</span>}</td>
                      <td className="px-4 py-2 text-muted-foreground tabular-nums">{formatTime(row.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="-mx-4 divide-y border-y">
              {campaign.rows.map((row) => (
                <li key={row.logId}>
                  <Link to={`/applications/${row.applicationId}`} className="flex min-h-14 flex-col justify-center gap-1 px-4 py-2.5 active:bg-muted">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{row.recipientName || row.recipient}</span>
                      <StatusBadge status={row.result} />
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{row.companyName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  )
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const { runs, emailLog, applications, status } = useWorkspace()
  const campaign = useMemo(() => groupCampaigns(emailLog, applications).find((item) => item.id === id), [emailLog, applications, id])
  const run = runs[id]

  if (run) return <RunView run={run} />
  if (status === 'loading') {
    return (
      <>
        <Header title="Campaign" />
        <div className="flex flex-col gap-3 p-4 md:p-6" aria-hidden="true">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }
  if (campaign) return <PastView campaign={campaign} applications={applications} />
  return (
    <>
      <Header title="Campaign not found" />
      <EmptyState
        icon={id?.startsWith('mock-') ? FlaskConicalIcon : WifiOffIcon}
        title="Campaign not found"
        description={id?.startsWith('mock-') ? 'Mock runs live only for this session. Reloading the page clears them.' : 'It may have been removed from your Email_Log sheet.'}
        action={
          <Button asChild variant="outline">
            <Link to="/campaigns">All campaigns</Link>
          </Button>
        }
      />
    </>
  )
}
