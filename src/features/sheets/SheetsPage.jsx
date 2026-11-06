import { useState } from 'react'
import { CircleCheckIcon, ExternalLinkIcon, SheetIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { InlineAlert } from '@/components/common/InlineAlert'
import { TimeAgo } from '@/components/common/TimeAgo'
import { WithReason } from '@/components/common/WithReason'
import { SyncNowButton } from '@/components/global/SyncNowButton'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth, useWorkspace } from '@/context/app-contexts'
import { SYSTEM_FIELDS } from '@/lib/constants'
import { getMissingRequired, getMissingSystemColumns } from '@/lib/sheetParser'
import { ColumnMapping } from './ColumnMapping'
import { SampleSheet } from './SampleSheet'

function Panel({ title, description, children, actions }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function RowList({ rows, empty }) {
  if (!rows.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />
        {empty}
      </p>
    )
  }
  return (
    <ul className="-mx-4 divide-y border-t text-sm">
      {rows.map((row) => (
        <li key={row.row} className="flex items-baseline gap-3 px-4 py-2">
          <span className="w-14 shrink-0 text-muted-foreground tabular-nums">Row {row.row}</span>
          <span className="min-w-0 flex-1">
            {row.reason}
            {row.value && <span className="ml-2 font-mono text-xs text-muted-foreground">{row.value}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function PendingWritebacks() {
  const { pendingWritebacks, retryWritebacks, discardWritebacks, applications, online } = useWorkspace()
  const { live } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!pendingWritebacks.length) return null

  const names = new Map(applications.map((app) => [app.id, app.companyName]))
  const reason = !online ? "You're offline" : !live ? 'Connect Google first' : null
  const retry = async () => {
    setBusy(true)
    const outcome = await retryWritebacks()
    setBusy(false)
    if (outcome.ok) toast.success(`Saved ${outcome.count} ${outcome.count === 1 ? 'change' : 'changes'} to your sheet`)
    else toast.error('Still not saved', { description: outcome.error })
  }

  return (
    <InlineAlert
      tone="warning"
      title={`${pendingWritebacks.length} ${pendingWritebacks.length === 1 ? 'change is' : 'changes are'} not saved to your sheet`}
      action={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={discardWritebacks} disabled={busy}>
            Discard
          </Button>
          <WithReason reason={reason} label="Retry">
            <Button variant="outline" size="sm" onClick={retry} disabled={Boolean(reason) || busy}>
              Retry
            </Button>
          </WithReason>
        </div>
      }
    >
      {pendingWritebacks
        .slice(0, 3)
        .map((item) => `${names.get(item.applicationId) ?? 'A row'}: ${Object.values(item.values).join(', ')}`)
        .join('; ')}
      {pendingWritebacks.length > 3 ? ` and ${pendingWritebacks.length - 3} more` : ''}. They are kept on
      this device and written only when you press Retry.
    </InlineAlert>
  )
}

export default function SheetsPage() {
  const { sheet, status, connected, error, reload, isMock, online, saveColumnMap, fromSnapshot } = useWorkspace()
  const [draft, setDraft] = useState(null)
  const [showErrors, setShowErrors] = useState(false)

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Google Sheets" />
        <PageBody>
          <div className="flex flex-col gap-4" aria-hidden="true">
            <Skeleton className="h-32" />
            <Skeleton className="h-80" />
          </div>
        </PageBody>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Google Sheets" />
        <PageBody>
          <InlineAlert
            tone="destructive"
            title="Couldn't read your sheet"
            action={
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/sheets/setup">Change sheet</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={reload} disabled={!online}>
                  Retry
                </Button>
              </div>
            }
          >
            {error}
          </InlineAlert>
        </PageBody>
      </>
    )
  }

  if (!connected) {
    return (
      <>
        <PageHeader title="Google Sheets" />
        <PageBody>
          <EmptyState
            icon={SheetIcon}
            title="No sheet connected"
            description={
              isMock
                ? 'Walk through choosing a sheet, a tab, and column mapping. In mock mode nothing is read from Google.'
                : 'Connect Google, then paste a Google Sheets link to choose a tab and map its columns. The sheet stays in your Drive.'
            }
            action={
              <Button asChild>
                <Link to="/sheets/setup">Set up a sheet</Link>
              </Button>
            }
          />
          {!isMock && <SampleSheet />}
        </PageBody>
      </>
    )
  }

  const columnMap = draft ?? sheet.columnMap
  const dirty = draft != null
  const missingRequired = getMissingRequired(columnMap)
  const missingSystem = getMissingSystemColumns(sheet.columnMap, SYSTEM_FIELDS)
  const { summary } = sheet

  const save = () => {
    if (missingRequired.length) {
      setShowErrors(true)
      return
    }
    saveColumnMap(columnMap)
    setDraft(null)
    setShowErrors(false)
    toast.success('Column mapping saved', {
      description: isMock ? 'Mock data only. Your sheet was not changed.' : 'It takes effect on the next sync.',
    })
  }
  const sheetUrl = isMock
    ? null
    : `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheet.spreadsheetId)}/edit${sheet.sheetId == null ? '' : `#gid=${sheet.sheetId}`}`

  return (
    <>
      <PageHeader title="Google Sheets" actions={<SyncNowButton />} />
      <PageBody className="max-w-4xl">
        <PendingWritebacks />
        <Panel
          title={sheet.spreadsheetTitle}
          description={
            <>
              Tab <span className="font-medium text-foreground">{sheet.tabName}</span> ·{' '}
              {sheet.syncedAt ? (
                <>
                  {fromSnapshot ? 'offline copy from' : 'synced'} <TimeAgo value={sheet.syncedAt} />
                </>
              ) : (
                'not synced yet'
              )}
            </>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {sheetUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={sheetUrl} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon aria-hidden="true" />
                    Open in Sheets
                  </a>
                </Button>
              ) : (
                <WithReason reason="Mock sheet has no real link" label="Open in Google Sheets">
                  <Button variant="outline" size="sm" disabled>
                    <ExternalLinkIcon aria-hidden="true" />
                    Open in Sheets
                  </Button>
                </WithReason>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/sheets/setup">Change sheet</Link>
              </Button>
            </div>
          }
        >
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Rows read', summary.total],
              ['Imported', summary.imported],
              ['Skipped', summary.skipped],
              ['Invalid', summary.invalid],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-md bg-muted/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {missingSystem.length > 0 ? (
            <p className="flex items-start gap-2 text-sm">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              {missingSystem.length} tracking columns are not mapped: {missingSystem.join(', ')}. Choose Change sheet to add them.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />
              All {SYSTEM_FIELDS.length} tracking columns are present.
            </p>
          )}
        </Panel>

        <Panel
          title="Column mapping"
          description="Which of your columns holds each field. Changing this takes effect on the next sync."
          actions={
            dirty ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(null)
                    setShowErrors(false)
                  }}
                >
                  Discard
                </Button>
                <WithReason reason={online ? null : "You're offline"} label="Save mapping">
                  <Button size="sm" onClick={save} disabled={!online}>
                    Save mapping
                  </Button>
                </WithReason>
              </div>
            ) : null
          }
        >
          <ColumnMapping headers={sheet.headers} value={columnMap} onChange={setDraft} showErrors={showErrors} disabled={!online} />
        </Panel>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel title={`Invalid rows (${sheet.invalidRows.length})`} description="Fix these in your sheet, then sync. They are never emailed.">
            <RowList rows={sheet.invalidRows} empty="No invalid rows." />
          </Panel>
          <Panel title={`Skipped rows (${sheet.skippedRows.length})`} description="Rows the last sync did not import, and why.">
            <RowList rows={sheet.skippedRows} empty="No skipped rows." />
          </Panel>
        </div>
      </PageBody>
    </>
  )
}
