import { lazy, useMemo } from 'react'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleIcon,
  MailIcon,
  MessageSquareReplyIcon,
  RefreshCwIcon,
  SendIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChartFrame } from '@/components/common/ChartFrame'
import { InlineAlert } from '@/components/common/InlineAlert'
import { KpiStrip } from '@/components/common/KpiStrip'
import { WithReason } from '@/components/common/WithReason'
import { SyncNowButton } from '@/components/global/SyncNowButton'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth, useWorkspace } from '@/context/app-contexts'
import {
  activitySeries,
  computeKpis,
  describeTrend,
  formatPercent,
  statusBreakdown,
  weeklyBuckets,
} from '@/lib/reportMetrics'
import { STATUS_FILLS } from '@/lib/statusTones'
import { formatDateTime, formatShortStamp } from '@/lib/time'
import { cn } from '@/lib/utils'
import { getAttentionItems, getRecentActivity } from './dashboardModel'

const ActivityChart = lazy(() => import('@/features/reports/charts/ActivityChart'))

const DAY_MS = 86_400_000

function Panel({ title, count, children, className }) {
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-4', className)}
    >
      <h2 className="flex items-baseline gap-2 text-sm font-semibold">
        {title}
        {count != null && (
          <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
        )}
      </h2>
      {children}
    </section>
  )
}

function deltaOf(value, { percent = false } = {}) {
  if (value == null) return null
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const amount = percent ? `${(Math.abs(value) * 100).toFixed(1)} pts` : Math.abs(value)
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return { direction, text: `${sign}${amount} vs prior 30 days` }
}

function useDashboardData() {
  const { applications, emailLog, sheet, pendingWritebacks } = useWorkspace()
  return useMemo(() => {
    const now = Date.now()
    const kpis = computeKpis(applications, emailLog, { from: now - 30 * DAY_MS, to: now })
    const weekly = activitySeries(emailLog, applications, weeklyBuckets(now, 12))
    return {
      kpis,
      weekly,
      pipeline: statusBreakdown(applications),
      attention: getAttentionItems({ applications, sheet, pendingWritebacks }),
      recent: getRecentActivity({ emailLog, applications, sheet }),
    }
  }, [applications, emailLog, sheet, pendingWritebacks])
}

const ATTENTION_ICONS = { destructive: CircleAlertIcon, warning: TriangleAlertIcon }

function NeedsAttention({ items }) {
  if (!items.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />
        Nothing needs your attention.
      </p>
    )
  }
  return (
    <ul className="-mx-4 divide-y border-t">
      {items.map((item) => {
        const Icon = ATTENTION_ICONS[item.tone]
        return (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            <Icon
              className={cn(
                'size-4 shrink-0',
                item.tone === 'destructive' ? 'text-destructive' : 'text-warning',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={item.action.to} state={item.action.state}>
                {item.action.label}
              </Link>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

const SETUP_STEPS = [
  {
    id: 'google',
    label: 'Connect your Google account',
    detail: 'Lets JobApply read your sheet and send from your Gmail.',
  },
  {
    id: 'sheet',
    label: 'Choose your job sheet',
    detail: 'Paste the link to the Google Sheet you track applications in.',
  },
  {
    id: 'map',
    label: 'Map columns',
    detail: 'Match your headers to company, recruiter email, and job title.',
  },
  {
    id: 'sync',
    label: 'Run the first sync',
    detail: 'Imports your rows. Syncing never sends email.',
  },
]

function SetupChecklist() {
  const { live } = useAuth()
  const { connected, sheet } = useWorkspace()
  const done = new Set([
    ...(live ? ['google'] : []),
    ...(connected ? ['sheet', 'map'] : []),
    ...(sheet?.syncedAt ? ['sync'] : []),
  ])
  const next = SETUP_STEPS.find((step) => !done.has(step.id))
  const nextLink = (id) => (id === 'google' ? '/welcome?step=google' : id === 'sync' ? '/sheets' : '/sheets/setup')

  return (
    <Panel title="Get set up" count={`${done.size} of ${SETUP_STEPS.length}`}>
      <ol className="-mx-4 divide-y border-t">
        {SETUP_STEPS.map((step) => (
          <li key={step.id} className="flex items-start gap-3 px-4 py-2.5">
            {done.has(step.id) ? (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-label="Done" />
            ) : (
              <CircleIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-pretty text-muted-foreground">{step.detail}</p>
            </div>
            {step === next && (
              <Button asChild size="sm">
                <Link to={nextLink(step.id)}>
                  {step.id === 'google' ? 'Start' : 'Continue'}
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function PipelineBar({ items }) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  if (!total) return <p className="text-sm text-muted-foreground">No applications yet.</p>
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {items.map((item) => (
          <span
            key={item.status}
            className={STATUS_FILLS[item.status]}
            style={{ flexGrow: item.count }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.status} className="flex items-center gap-2">
            <span
              className={cn('size-2 shrink-0 rounded-full', STATUS_FILLS[item.status])}
              aria-hidden="true"
            />
            <span className="truncate text-muted-foreground">{item.status}</span>
            <span className="ml-auto font-medium tabular-nums">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ACTIVITY_ICONS = {
  sent: SendIcon,
  failed: CircleAlertIcon,
  test: MailIcon,
  reply: MessageSquareReplyIcon,
  sync: RefreshCwIcon,
}

function RecentActivity({ events }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event) => {
        const Icon = ACTIVITY_ICONS[event.kind]
        return (
          <li key={event.id} className="flex items-start gap-3 text-sm">
            <time
              dateTime={event.at}
              title={formatDateTime(event.at)}
              className="w-16 shrink-0 text-xs leading-5 text-muted-foreground tabular-nums"
            >
              {formatShortStamp(event.at)}
            </time>
            <Icon
              className={cn(
                'mt-0.5 size-3.5 shrink-0',
                event.kind === 'failed' ? 'text-destructive' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 truncate">
              {event.text}
              <span className="text-muted-foreground"> · {event.meta}</span>
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-12" aria-hidden="true">
      <KpiStrip
        loading
        className="min-[900px]:col-span-12"
        items={['Applications', 'Emails sent', 'Failed', 'Replies', 'Reply rate'].map((label) => ({
          label,
        }))}
      />
      <Skeleton className="h-44 min-[900px]:col-span-7" />
      <Skeleton className="h-44 min-[900px]:col-span-5" />
      <Skeleton className="h-72 min-[900px]:col-span-7" />
      <Skeleton className="h-72 min-[900px]:col-span-5" />
    </div>
  )
}

export default function DashboardPage() {
  const { status, connected, error, reload, sheet } = useWorkspace()
  const data = useDashboardData()
  const { kpis } = data
  const live = connected && status === 'ready' && Boolean(sheet?.syncedAt)

  const kpiItems = [
    {
      label: 'Applications',
      value: live ? kpis.applications : null,
      href: live ? '/applications' : undefined,
    },
    {
      label: 'Emails sent',
      value: live ? kpis.sent : null,
      delta: live ? deltaOf(kpis.delta.sent) : null,
      href: live ? '/history?result=Sent' : undefined,
    },
    {
      label: 'Failed',
      value: live ? kpis.failed : null,
      delta: live ? deltaOf(kpis.delta.failed) : null,
      href: live ? '/applications?view=attention' : undefined,
    },
    {
      label: 'Replies',
      value: live ? kpis.replies : null,
      delta: live ? deltaOf(kpis.delta.replies) : null,
      href: live ? '/applications?view=replied' : undefined,
    },
    {
      label: 'Reply rate',
      value: live ? formatPercent(kpis.replyRate) : null,
      delta: live ? deltaOf(kpis.delta.replyRate, { percent: true }) : null,
      href: live ? '/reports' : undefined,
    },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <SyncNowButton />
            <WithReason reason={connected ? null : 'Connect a sheet first'} label="New campaign">
              <Button asChild={connected} disabled={!connected}>
                {connected ? (
                  <Link to="/campaigns/new">New campaign</Link>
                ) : (
                  <span>New campaign</span>
                )}
              </Button>
            </WithReason>
          </>
        }
      />
      <PageBody>
        {status === 'loading' ? (
          <DashboardSkeleton />
        ) : (
          <>
            {status === 'error' && (
              <InlineAlert
                tone="destructive"
                title="Sync failed"
                action={
                  <Button variant="outline" size="sm" onClick={reload}>
                    Retry
                  </Button>
                }
              >
                {error}
              </InlineAlert>
            )}
            <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-12">
              <KpiStrip
                items={kpiItems}
                className="order-2 min-[900px]:order-none min-[900px]:col-span-12"
              />
              <div className="order-1 min-[900px]:order-none min-[900px]:col-span-7">
                {live ? (
                  <Panel title="Needs attention" count={data.attention.length || null}>
                    <NeedsAttention items={data.attention} />
                  </Panel>
                ) : (
                  <SetupChecklist />
                )}
              </div>
              <Panel
                title="Pipeline"
                className="order-4 min-[900px]:order-none min-[900px]:col-span-5"
              >
                <PipelineBar items={live ? data.pipeline : []} />
              </Panel>
              <div className="order-3 rounded-lg border bg-background p-4 min-[900px]:order-none min-[900px]:col-span-7">
                <ChartFrame
                  title="Weekly activity"
                  summary={
                    live
                      ? describeTrend(data.weekly, 'sent', { noun: 'emails sent' })
                      : 'Activity appears after your first campaign.'
                  }
                  columns={[
                    { key: 'week', label: 'Week' },
                    { key: 'sent', label: 'Sent', numeric: true },
                    { key: 'replies', label: 'Replies', numeric: true },
                  ]}
                  rows={data.weekly.map((row) => ({
                    key: row.label,
                    week: row.fullLabel,
                    sent: live ? row.sent : 0,
                    replies: live ? row.replies : 0,
                  }))}
                >
                  <ActivityChart
                    data={
                      live
                        ? data.weekly
                        : data.weekly.map((row) => ({ ...row, sent: 0, replies: 0 }))
                    }
                  />
                </ChartFrame>
              </div>
              <Panel
                title="Recent activity"
                className="order-5 min-[900px]:order-none min-[900px]:col-span-5"
              >
                <RecentActivity events={live ? data.recent : []} />
              </Panel>
            </div>
          </>
        )}
      </PageBody>
    </>
  )
}
