import { useMemo } from 'react'
import { ChevronRightIcon, FlaskConicalIcon, SendIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { InlineAlert } from '@/components/common/InlineAlert'
import { WithReason } from '@/components/common/WithReason'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/context/app-contexts'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { formatDateTime, formatShortStamp } from '@/lib/time'
import { formatDuration, groupCampaigns } from './campaignsModel'
import { runCounts } from './mockRun'

const RUN_LABEL = { running: 'Running', paused: 'Paused', done: 'Finished', cancelled: 'Cancelled' }

function Counts({ sent, failed, replied }) {
  return (
    <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground tabular-nums">
      <span>
        <span className="font-medium text-foreground">{sent}</span> sent
      </span>
      {failed > 0 && (
        <span className="text-destructive">
          <span className="font-medium">{failed}</span> failed
        </span>
      )}
      {replied != null && (
        <span>
          <span className="font-medium text-foreground">{replied}</span> replied
        </span>
      )}
    </span>
  )
}

export default function CampaignsPage() {
  const { emailLog, applications, status, connected, runs, error, reload } = useWorkspace()
  const isDesktop = useMediaQuery(MEDIA.md)
  const campaigns = useMemo(() => groupCampaigns(emailLog, applications), [emailLog, applications])
  const sessionRuns = Object.values(runs).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const newCampaign = (
    <WithReason reason={connected ? null : 'Connect a sheet first'} label="New campaign">
      <Button asChild={connected} disabled={!connected}>
        {connected ? <Link to="/campaigns/new">New campaign</Link> : <span>New campaign</span>}
      </Button>
    </WithReason>
  )

  return (
    <>
      <PageHeader title="Campaigns" count={connected ? campaigns.length : null} actions={newCampaign} />
      <PageBody>
        {status === 'loading' && (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        )}
        {status === 'error' && (
          <InlineAlert tone="destructive" title="Couldn't load campaigns" action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>}>
            {error}
          </InlineAlert>
        )}
        {status === 'ready' && !connected && (
          <EmptyState
            icon={SendIcon}
            title="Send your first campaign"
            description="Pick recipients from your sheet, choose a template, attach your resume, and preview every email. Nothing is sent until you confirm."
            action={
              <Button asChild variant="outline">
                <Link to="/sheets">Connect a sheet</Link>
              </Button>
            }
          />
        )}

        {status === 'ready' && connected && (
          <>
            {sessionRuns.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FlaskConicalIcon className="size-4 text-warning" aria-hidden="true" />
                  Mock runs this session
                </h2>
                <ul className="divide-y rounded-lg border">
                  {sessionRuns.map((run) => {
                    const counts = runCounts(run)
                    return (
                      <li key={run.id}>
                        <Link to={`/campaigns/${run.id}`} className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/60 focus-visible:bg-muted">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {run.templateName} · {RUN_LABEL[run.status]}
                            </p>
                            <Counts sent={counts.sent} failed={counts.failed} />
                          </div>
                          <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {campaigns.length === 0 ? (
              <EmptyState
                icon={SendIcon}
                title="Send your first campaign"
                description="Pick recipients, choose a template, attach your resume, and preview every email. Nothing is sent until you confirm."
                action={
                  <Button asChild>
                    <Link to="/campaigns/new">New campaign</Link>
                  </Button>
                }
              />
            ) : isDesktop ? (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <caption className="sr-only">Past campaigns</caption>
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      {['Date', 'Template', 'Recipients', 'Sent', 'Failed', 'Replied', 'Duration'].map((label, index) => (
                        <th key={label} scope="col" className={`h-9 border-b px-4 font-medium ${index >= 2 ? 'text-right' : ''}`}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="relative hover:bg-muted/60 has-[a:focus-visible]:bg-muted">
                        <td className="border-b px-4 py-2.5">
                          <Link to={`/campaigns/${campaign.id}`} className="font-medium outline-none after:absolute after:inset-0">
                            <time dateTime={campaign.startedAt} title={formatDateTime(campaign.startedAt)}>
                              {formatDateTime(campaign.startedAt)}
                            </time>
                          </Link>
                        </td>
                        <td className="border-b px-4 py-2.5 text-muted-foreground">{campaign.templateName}</td>
                        <td className="border-b px-4 py-2.5 text-right tabular-nums">{campaign.total}</td>
                        <td className="border-b px-4 py-2.5 text-right tabular-nums">{campaign.sent}</td>
                        <td className={`border-b px-4 py-2.5 text-right tabular-nums ${campaign.failed ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {campaign.failed}
                        </td>
                        <td className="border-b px-4 py-2.5 text-right tabular-nums">{campaign.replied}</td>
                        <td className="border-b px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {formatDuration(new Date(campaign.endedAt) - new Date(campaign.startedAt))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="-mx-4 divide-y border-y">
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <Link to={`/campaigns/${campaign.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-muted">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">{campaign.templateName}</span>
                          <time dateTime={campaign.startedAt} className="shrink-0 text-xs text-muted-foreground">
                            {formatShortStamp(campaign.startedAt)}
                          </time>
                        </p>
                        <Counts sent={campaign.sent} failed={campaign.failed} replied={campaign.replied} />
                      </div>
                      <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </PageBody>
    </>
  )
}
