import { lazy, useMemo, useState } from 'react'
import { ChartColumnIcon, DownloadIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChartFrame } from '@/components/common/ChartFrame'
import { EmptyState } from '@/components/common/EmptyState'
import { InlineAlert } from '@/components/common/InlineAlert'
import { KpiStrip } from '@/components/common/KpiStrip'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useWorkspace } from '@/context/app-contexts'
import { downloadFile, toCsv } from '@/lib/csv'
import {
  activitySeries,
  computeKpis,
  describeTrend,
  formatPercent,
  monthlyBuckets,
  rangeBuckets,
  replyRateByTemplate,
  statusBreakdown,
  weeklyBuckets,
} from '@/lib/reportMetrics'
import { STATUS_FILLS } from '@/lib/statusTones'
import { cn } from '@/lib/utils'

const ActivityChart = lazy(() => import('./charts/ActivityChart'))

const DAY_MS = 86_400_000
const toInputDate = (time) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromInputDate = (value) => {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

function deltaOf(value, label, { percent = false } = {}) {
  if (value == null) return null
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const amount = percent ? `${(Math.abs(value) * 100).toFixed(1)} pts` : Math.abs(value)
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return { direction, text: `${sign}${amount} vs ${label}` }
}

function useRange(range, custom) {
  return useMemo(() => {
    const now = Date.now()
    if (range === '12m') {
      const buckets = monthlyBuckets(now, 12)
      return { buckets, from: buckets[0].start, to: now, unit: 'months', window: 3, prior: 'prior 12 months', variant: 'line' }
    }
    if (range === 'custom') {
      const from = fromInputDate(custom.from)
      const to = fromInputDate(custom.to) + DAY_MS
      return { buckets: rangeBuckets(from, to), from, to, unit: 'periods', window: 0, prior: 'prior period', variant: 'bar' }
    }
    const buckets = weeklyBuckets(now, 12)
    return { buckets, from: buckets[0].start, to: now, unit: 'weeks', window: 4, prior: 'prior 12 weeks', variant: 'bar' }
  }, [range, custom])
}

function Section({ title, children, className }) {
  return (
    <section aria-label={title} className={cn('flex flex-col gap-3 rounded-lg border bg-background p-4', className)}>
      {children}
    </section>
  )
}

function StatusBars({ items }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.status} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
          <span className="truncate">{item.status}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className={cn('block h-full rounded-full', STATUS_FILLS[item.status])} style={{ width: `${Math.max(item.share * 100, 2)}%` }} />
          </span>
          <span className="text-right text-muted-foreground tabular-nums">
            {item.count} <span className="sr-only">({formatPercent(item.share, 0)})</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function ReportsPage() {
  const { applications, emailLog, status, connected, error, reload } = useWorkspace()
  const [range, setRange] = useState('12w')
  const [today] = useState(() => toInputDate(Date.now()))
  const [custom, setCustom] = useState(() => ({ from: toInputDate(Date.now() - 29 * DAY_MS), to: today }))
  const [variant, setVariant] = useState(null)
  const config = useRange(range, custom)
  const chartVariant = variant ?? config.variant
  const customInvalid = range === 'custom' && (!custom.from || !custom.to || fromInputDate(custom.from) > fromInputDate(custom.to))

  const data = useMemo(() => {
    if (customInvalid) return null
    const inRange = (value) => {
      const t = value ? new Date(value).getTime() : NaN
      return t >= config.from && t < config.to
    }
    const rangedApps = applications.filter((app) => inRange(app.sentDate))
    return {
      kpis: computeKpis(applications, emailLog, { from: config.from, to: config.to }),
      series: activitySeries(emailLog, applications, config.buckets),
      breakdown: statusBreakdown(applications),
      templates: replyRateByTemplate(rangedApps),
    }
  }, [applications, emailLog, config, customInvalid])

  const exportCsv = () => {
    const csv = toCsv(data.series, [
      { key: 'fullLabel', label: 'Period' },
      { key: 'sent', label: 'Sent' },
      { key: 'failed', label: 'Failed' },
      { key: 'replies', label: 'Replies' },
    ])
    downloadFile(`jobapply-activity-${toInputDate(Date.now())}.csv`, csv, 'text/csv;charset=utf-8')
  }

  const ready = status === 'ready' && connected
  const hasActivity = ready && emailLog.some((row) => row.result === 'Sent' || row.result === 'Failed')

  return (
    <>
      <PageHeader
        title="Reports"
        actions={
          hasActivity && data ? (
            <Button variant="outline" onClick={exportCsv}>
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </Button>
          ) : null
        }
      />
      <PageBody>
        {status === 'loading' && (
          <div className="flex flex-col gap-4" aria-hidden="true">
            <Skeleton className="h-9 w-72" />
            <KpiStrip loading items={['Sent', 'Failed', 'Replies', 'Reply rate'].map((label) => ({ label }))} />
            <Skeleton className="h-72" />
          </div>
        )}
        {status === 'error' && (
          <InlineAlert tone="destructive" title="Couldn't load reports" action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>}>
            {error}
          </InlineAlert>
        )}
        {status === 'ready' && !hasActivity && (
          <EmptyState
            icon={ChartColumnIcon}
            title="Nothing to report yet"
            description="Reports are built from your synced applications and the email log. Send a campaign to see weekly and monthly activity."
            action={
              <Button asChild variant="outline">
                <Link to={connected ? '/campaigns/new' : '/sheets'}>{connected ? 'New campaign' : 'Connect a sheet'}</Link>
              </Button>
            }
          />
        )}

        {hasActivity && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <ToggleGroup
                type="single"
                value={range}
                onValueChange={(value) => {
                  if (!value) return
                  setRange(value)
                  setVariant(null)
                }}
                aria-label="Date range"
                className="max-sm:w-full"
              >
                <ToggleGroupItem value="12w">12 weeks</ToggleGroupItem>
                <ToggleGroupItem value="12m">12 months</ToggleGroupItem>
                <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
              </ToggleGroup>
              {range === 'custom' && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="report-from" className="text-xs text-muted-foreground">
                      From
                    </Label>
                    <Input
                      id="report-from"
                      type="date"
                      value={custom.from}
                      max={custom.to}
                      onChange={(event) => setCustom((c) => ({ ...c, from: event.target.value }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="report-to" className="text-xs text-muted-foreground">
                      To
                    </Label>
                    <Input
                      id="report-to"
                      type="date"
                      value={custom.to}
                      min={custom.from}
                      max={today}
                      onChange={(event) => setCustom((c) => ({ ...c, to: event.target.value }))}
                      className="w-40"
                    />
                  </div>
                </div>
              )}
            </div>

            {customInvalid ? (
              <InlineAlert tone="warning">Choose a start date on or before the end date.</InlineAlert>
            ) : (
              <>
                <KpiStrip
                  items={[
                    { label: 'Emails sent', value: data.kpis.sent, delta: deltaOf(data.kpis.delta.sent, config.prior) },
                    { label: 'Failed', value: data.kpis.failed, delta: deltaOf(data.kpis.delta.failed, config.prior) },
                    { label: 'Replies', value: data.kpis.replies, delta: deltaOf(data.kpis.delta.replies, config.prior) },
                    {
                      label: 'Reply rate',
                      value: formatPercent(data.kpis.replyRate),
                      hint: 'Replied, of emails sent in range',
                      delta: deltaOf(data.kpis.delta.replyRate, config.prior, { percent: true }),
                    },
                  ]}
                />

                <div className="rounded-lg border bg-background p-4">
                  <ChartFrame
                    title="Activity"
                    summary={
                      config.window
                        ? `${describeTrend(data.series, 'sent', { noun: 'emails sent', window: config.window, unit: config.unit })} ${describeTrend(data.series, 'replies', { noun: 'replies', window: config.window, unit: config.unit })}`
                        : `${describeTrend(data.series, 'sent', { noun: 'emails sent', window: data.series.length })} ${describeTrend(data.series, 'replies', { noun: 'replies', window: data.series.length })}`
                    }
                    actions={
                      <ToggleGroup
                        type="single"
                        value={chartVariant}
                        onValueChange={(value) => value && setVariant(value)}
                        aria-label="Chart type"
                      >
                        <ToggleGroupItem value="bar">Bars</ToggleGroupItem>
                        <ToggleGroupItem value="line">Lines</ToggleGroupItem>
                      </ToggleGroup>
                    }
                    columns={[
                      { key: 'period', label: 'Period' },
                      { key: 'sent', label: 'Sent', numeric: true },
                      { key: 'failed', label: 'Failed', numeric: true },
                      { key: 'replies', label: 'Replies', numeric: true },
                    ]}
                    rows={data.series.map((row) => ({ key: row.fullLabel, period: row.fullLabel, sent: row.sent, failed: row.failed, replies: row.replies }))}
                    chartClassName="h-72"
                  >
                    <ActivityChart data={data.series} series={['sent', 'replies', 'failed']} variant={chartVariant} />
                  </ChartFrame>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Section title="Application status">
                    <h2 className="text-sm font-semibold">Application status</h2>
                    <p className="text-sm text-muted-foreground">
                      All {applications.length} applications, as of the last sync.
                    </p>
                    <StatusBars items={data.breakdown} />
                  </Section>
                  <Section title="Reply rate by template">
                    <h2 className="text-sm font-semibold">Reply rate by template</h2>
                    <p className="text-sm text-muted-foreground">Emails sent in this range, grouped by the template used.</p>
                    {data.templates.length ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground">
                            <th scope="col" className="pb-2 font-medium">Template</th>
                            <th scope="col" className="pb-2 text-right font-medium">Sent</th>
                            <th scope="col" className="pb-2 text-right font-medium">Replied</th>
                            <th scope="col" className="pb-2 text-right font-medium">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.templates.map((row) => (
                            <tr key={row.template}>
                              <th scope="row" className="py-2 text-left font-normal">{row.template}</th>
                              <td className="py-2 text-right tabular-nums">{row.sent}</td>
                              <td className="py-2 text-right tabular-nums">{row.replied}</td>
                              <td className="py-2 text-right font-medium tabular-nums">{formatPercent(row.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="py-4 text-sm text-muted-foreground">No emails sent in this range.</p>
                    )}
                    {data.templates.some((row) => row.sent < 10) && (
                      <p className="text-xs text-muted-foreground">Rates from fewer than 10 emails swing a lot. Compare with care.</p>
                    )}
                  </Section>
                </div>
              </>
            )}
          </>
        )}
      </PageBody>
    </>
  )
}
