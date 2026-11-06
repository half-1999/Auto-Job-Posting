import { useMemo, useState } from 'react'
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ExternalLinkIcon, HistoryIcon, ListFilterIcon, MailSearchIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DataTable, DataTablePagination, FacetFilter, inSet } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { countActiveFilters, FilterSheet } from '@/components/common/FilterSheet'
import { InlineAlert } from '@/components/common/InlineAlert'
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { WithReason } from '@/components/common/WithReason'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth, useSettings, useWorkspace } from '@/context/app-contexts'
import { useNotifications } from '@/context/NotificationContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { REPLY_STATUS } from '@/lib/constants'
import { dayKey, formatDateTime, formatDayHeading, formatTime } from '@/lib/time'

const RESULTS = ['Sent', 'Failed', 'Test']
const REPLIES = [...Object.values(REPLY_STATUS), '-']
const RANGES = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: 'all', label: 'All time' },
]
const FILTER_GROUPS = [
  { id: 'result', label: 'Result', options: RESULTS },
  { id: 'reply', label: 'Reply', options: REPLIES },
]
const PAGE_SIZE = 50

function matches(row, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return [row.recipientName, row.recipient, row.companyName, row.jobTitle, row.subject].some((v) => v?.toLowerCase().includes(q))
}

function GmailLink({ row, isMock }) {
  const href = !isMock && row.threadId ? `https://mail.google.com/mail/u/0/#all/${row.threadId}` : null
  if (href) {
    return (
      <Button asChild variant="ghost" size="icon-sm">
        <a href={href} target="_blank" rel="noreferrer" aria-label="Open in Gmail" data-row-ignore="">
          <ExternalLinkIcon aria-hidden="true" />
        </a>
      </Button>
    )
  }
  const reason = isMock ? 'Mock rows have no real Gmail thread' : 'No Gmail thread for this row'
  return (
    <WithReason reason={reason} label="Open in Gmail">
      <Button variant="ghost" size="icon-sm" disabled aria-label="Open in Gmail" data-row-ignore="">
        <ExternalLinkIcon aria-hidden="true" />
      </Button>
    </WithReason>
  )
}

function createColumns(isMock) {
  return [
    {
      id: 'timestamp',
      accessorKey: 'timestamp',
      header: 'Time',
      meta: { label: 'Time', className: 'whitespace-nowrap tabular-nums text-muted-foreground' },
      cell: ({ getValue }) => <time dateTime={getValue()}>{formatDateTime(getValue())}</time>,
    },
    {
      id: 'recipient',
      accessorFn: (row) => row.recipientName || row.recipient,
      header: 'Recipient',
      meta: { label: 'Recipient', className: 'max-w-64' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.recipientName || row.original.recipient}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.original.recipient}</p>
        </div>
      ),
    },
    {
      id: 'company',
      accessorKey: 'companyName',
      header: 'Company',
      meta: { label: 'Company', className: 'max-lg:hidden max-w-56 truncate', headerClassName: 'max-lg:hidden' },
    },
    {
      id: 'subject',
      accessorKey: 'subject',
      header: 'Subject',
      enableSorting: false,
      meta: { label: 'Subject', className: 'max-xl:hidden max-w-80 truncate text-muted-foreground', headerClassName: 'max-xl:hidden' },
    },
    {
      id: 'result',
      accessorKey: 'result',
      header: 'Result',
      filterFn: inSet,
      meta: { label: 'Result' },
      cell: ({ row }) => (
        <span title={row.original.error || undefined}>
          <StatusBadge status={row.original.result} />
        </span>
      ),
    },
    {
      id: 'reply',
      accessorFn: (row) => row.replyStatus || '-',
      header: 'Reply',
      filterFn: inSet,
      meta: { label: 'Reply' },
      cell: ({ getValue }) => (getValue() === '-' ? <span className="text-muted-foreground">-</span> : <StatusBadge status={getValue()} />),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      meta: { label: 'Actions', className: 'w-10' },
      cell: ({ row }) => <GmailLink row={row.original} isMock={isMock} />,
    },
  ]
}

function CheckRepliesDialog({ open, onOpenChange }) {
  const { applications, isMock, online, sheetConfig, patchApplications, queueSheetWrite } = useWorkspace()
  const auth = useAuth()
  const { settings, saveSection } = useSettings()
  const { notify } = useNotifications()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const reason = !online ? "You're offline" : isMock ? 'Mock mode never contacts Google' : !auth.live ? 'Connect Google first' : !sheetConfig ? 'Connect a sheet first' : null

  const run = async () => {
    if (!settings.replyTracking.enabled) {
      try {
        saveSection('replyTracking', { enabled: true })
      } catch (failure) {
        setError(failure.message)
        return
      }
    }
    if (!auth.hasMetadata) {
      const granted = await auth.connect({ metadata: true })
      if (!granted) return
    }
    setBusy(true)
    setError(null)
    try {
      const mod = await import('./checkReplies.js')
      const found = await mod.checkReplies({ applications, sheetConfig, patchApplications, queueSheetWrite })
      if (found.length) {
        notify({
          type: 'reply',
          title: `${found.length} ${found.length === 1 ? 'reply update' : 'reply updates'}`,
          body: 'Email History shows the new statuses.',
          href: '/history',
        })
      }
      toast.success(found.length ? `Updated ${found.length} ${found.length === 1 ? 'row' : 'rows'}` : 'No new replies')
      onOpenChange(false)
    } catch (failure) {
      setError(failure?.userMessage ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Check replies"
      description="Reply tracking reads headers of threads this app started. It is off until you do this."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <WithReason reason={reason} label={auth.hasMetadata ? 'Check replies' : 'Grant read access'}>
            <Button onClick={run} disabled={Boolean(reason) || busy}>
              {auth.hasMetadata ? 'Check replies' : 'Grant read access'}
            </Button>
          </WithReason>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-pretty">
        <p>
          To check replies, the app needs permission to read the Gmail threads it started. It only looks at those threads, and only when you press
          Check replies. Nothing runs in the background.
        </p>
        <p className="text-muted-foreground">
          Results are labeled Replied, Auto-reply, Bounced, or Uncertain. Uncertain means a person should look; the app never guesses.
        </p>
        {error && <p className="text-destructive">{error}</p>}
      </div>
    </ResponsiveDialog>
  )
}

function DayGroupedList({ rows, navigate }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const visible = rows.slice(0, limit)
  const groups = []
  for (const row of visible) {
    const key = dayKey(row.original.timestamp)
    if (groups.at(-1)?.key !== key) groups.push({ key, label: formatDayHeading(row.original.timestamp), rows: [] })
    groups.at(-1).rows.push(row)
  }

  return (
    <div className="flex flex-col pb-4">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="border-y bg-muted/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {group.label}
          </h2>
          <ul className="divide-y">
            {group.rows.map(({ original: row }) => {
              const content = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{row.recipientName || row.recipient}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(row.timestamp)}</span>
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{row.companyName || row.subject}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge status={row.result} />
                    {row.replyStatus && <StatusBadge status={row.replyStatus} />}
                  </span>
                  {row.error && <span className="mt-1 block text-xs text-destructive">{row.error}</span>}
                </>
              )
              return (
                <li key={row.logId}>
                  {row.applicationId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/applications/${row.applicationId}`)}
                      className="block w-full px-4 py-3 text-left outline-none focus-visible:bg-muted active:bg-muted"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="px-4 py-3">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {rows.length > limit && (
        <Button variant="outline" className="mx-4 mt-3" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, rows.length - limit)} more
        </Button>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isDesktop = useMediaQuery(MEDIA.md)
  const { emailLog, applications, status, connected, error, reload, isMock } = useWorkspace()

  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search, 150)
  const [range, setRange] = useState('all')
  const [sorting, setSorting] = useState([{ id: 'timestamp', desc: true }])
  const [columnFilters, setColumnFilters] = useState(() =>
    [
      ['result', params.get('result')],
      ['reply', params.get('reply')],
    ]
      .filter(([, value]) => value)
      .map(([id, value]) => ({ id, value: [value] })),
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [repliesOpen, setRepliesOpen] = useState(false)

  const data = useMemo(() => {
    const replies = new Map(applications.map((app) => [app.id, app.replyStatus]))
    const since = range === 'all' ? 0 : Date.now() - Number(range) * 86_400_000
    return emailLog
      .filter((row) => new Date(row.timestamp).getTime() >= since)
      .map((row) => ({ ...row, replyStatus: row.applicationId ? replies.get(row.applicationId) || '' : '' }))
  }, [emailLog, applications, range])
  const columns = useMemo(() => createColumns(isMock), [isMock])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: query, pagination },
    getRowId: (row) => row.logId,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, value) => matches(row.original, value),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  })

  const filterValue = Object.fromEntries(columnFilters.map((filter) => [filter.id, filter.value]))
  const activeFilters = countActiveFilters(filterValue)
  const hasFilters = activeFilters > 0 || Boolean(query) || range !== 'all'
  const filteredRows = table.getPrePaginationRowModel().rows
  const clearFilters = () => {
    setColumnFilters([])
    setSearch('')
    setRange('all')
  }
  const countFor = (draft) =>
    data.filter(
      (row) =>
        matches(row, query) &&
        Object.entries(draft).every(([id, list]) => !list?.length || list.includes(id === 'reply' ? row.replyStatus || '-' : row[id])),
    ).length

  const rangeSelect = (
    <Select value={range} onValueChange={setRange}>
      <SelectTrigger className="w-36" aria-label="Date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const ready = status === 'ready' && connected

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Email History"
        count={ready ? emailLog.length : null}
        actions={
          ready && isDesktop ? (
            <Button variant="outline" onClick={() => setRepliesOpen(true)}>
              <MailSearchIcon aria-hidden="true" />
              Check replies
            </Button>
          ) : null
        }
      />

      {status === 'loading' && (
        <div className="flex flex-col gap-2 p-4 md:p-6" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      )}
      {status === 'error' && (
        <PageBody>
          <InlineAlert tone="destructive" title="Couldn't load history" action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>}>
            {error}
          </InlineAlert>
        </PageBody>
      )}
      {status === 'ready' && (!connected || emailLog.length === 0) && (
        <PageBody>
          <EmptyState
            icon={HistoryIcon}
            title="No emails sent yet"
            description="Every send attempt is written to an Email_Log tab in your sheet and listed here, including failures."
            action={
              connected ? (
                <Button asChild>
                  <Link to="/campaigns/new">New campaign</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to="/sheets">Connect a sheet</Link>
                </Button>
              )
            }
          />
        </PageBody>
      )}

      {ready && emailLog.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 max-md:sticky max-md:top-[calc(var(--header-h)+env(safe-area-inset-top))] max-md:z-10 max-md:border-b max-md:bg-background max-md:pb-2 md:px-6 md:pt-4 xl:px-8">
            <div className="relative min-w-0 flex-1 md:max-w-sm">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search recipient, company, subject"
                aria-label="Search history"
                enterKeyHint="search"
                className="pl-8"
              />
            </div>
            {isDesktop ? (
              <>
                {rangeSelect}
                <FacetFilter column={table.getColumn('result')} title="Result" options={RESULTS} />
                <FacetFilter column={table.getColumn('reply')} title="Reply" options={REPLIES} />
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <XIcon aria-hidden="true" />
                    Reset
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setFilterSheetOpen(true)} aria-label={`Filters${activeFilters ? `, ${activeFilters} active` : ''}`}>
                  <ListFilterIcon aria-hidden="true" />
                  {activeFilters ? activeFilters : 'Filter'}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Check replies" onClick={() => setRepliesOpen(true)}>
                  <MailSearchIcon aria-hidden="true" />
                </Button>
              </>
            )}
          </div>

          {!isDesktop && <div className="px-4 pt-2 pb-2">{rangeSelect}</div>}

          {filteredRows.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title="No emails match these filters"
              description="Try a wider date range or clear the filters."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : isDesktop ? (
            <>
              <DataTable
                table={table}
                label="Email history"
                onRowOpen={(row) => row.original.applicationId && navigate(`/applications/${row.original.applicationId}`)}
                rowLabel={(row) => `${row.original.result} to ${row.original.recipientName || row.original.recipient}`}
                className="mt-3 flex-1"
              />
              <DataTablePagination table={table} className="border-t px-6 py-2.5 xl:px-8" />
            </>
          ) : (
            <DayGroupedList key={`${query}|${range}|${JSON.stringify(columnFilters)}`} rows={filteredRows} navigate={navigate} />
          )}

          {!isDesktop && (
            <FilterSheet
              open={filterSheetOpen}
              onOpenChange={setFilterSheetOpen}
              groups={FILTER_GROUPS}
              value={filterValue}
              onApply={(value) =>
                setColumnFilters(
                  Object.entries(value)
                    .filter(([, list]) => list?.length)
                    .map(([id, list]) => ({ id, value: list })),
                )
              }
              countResults={countFor}
            />
          )}
        </>
      )}

      <CheckRepliesDialog open={repliesOpen} onOpenChange={setRepliesOpen} />
    </div>
  )
}
