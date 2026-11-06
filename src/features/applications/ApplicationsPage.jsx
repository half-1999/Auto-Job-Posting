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
import { BriefcaseBusinessIcon, ListFilterIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useUiPrefs } from '@/app/useUiPrefs'
import { ActionBar, ActionBarSpacer } from '@/components/common/ActionBar'
import { DataTable, DataTablePagination, FacetFilter, TableViewMenu } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { countActiveFilters, FilterSheet } from '@/components/common/FilterSheet'
import { InlineAlert } from '@/components/common/InlineAlert'
import { ResponsiveList } from '@/components/common/ResponsiveList'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TimeAgo } from '@/components/common/TimeAgo'
import { ViewTabs } from '@/components/common/ViewTabs'
import { WithReason } from '@/components/common/WithReason'
import { SyncNowButton } from '@/components/global/SyncNowButton'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/context/app-contexts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { APPLICATION_STATUS, EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'
import { ApplicationDetail } from './ApplicationDetail'
import { createColumns } from './columns'
import { useApplicationActions } from './useApplicationActions'
import { APPLICATION_VIEWS, countViews, getView, matchesSearch } from './views'

const FILTER_GROUPS = [
  { id: 'applicationStatus', label: 'Application status', options: Object.values(APPLICATION_STATUS) },
  { id: 'emailStatus', label: 'Email status', options: Object.values(EMAIL_STATUS) },
  { id: 'replyStatus', label: 'Reply status', options: [...Object.values(REPLY_STATUS), '-'] },
]

const PAGE_SIZE = 50

function filtersToObject(columnFilters) {
  return Object.fromEntries(columnFilters.map((filter) => [filter.id, filter.value]))
}

function objectToFilters(value) {
  return Object.entries(value)
    .filter(([, list]) => list?.length)
    .map(([id, list]) => ({ id, value: list }))
}

function ListRow({ app }) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="truncate font-semibold">{app.companyName}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {app.sentDate ? <TimeAgo value={app.sentDate} /> : '-'}
        </span>
      </span>
      <span className="block truncate text-sm text-muted-foreground">{app.jobTitle}</span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        <StatusBadge status={app.emailStatus || EMAIL_STATUS.notSent} />
        {app.replyStatus && app.emailStatus !== EMAIL_STATUS.notSent && <StatusBadge status={app.replyStatus} />}
      </span>
    </>
  )
}

function LoadingRows() {
  return (
    <div className="flex flex-col divide-y border-y md:mx-6 md:rounded-lg md:border xl:mx-8" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function ApplicationsPage() {
  const { id: openId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isDesktop = useMediaQuery(MEDIA.md)
  const workspace = useWorkspace()
  const { applications, status, connected, error, reload, online } = workspace
  const { emailApplications, setDoNotEmail } = useApplicationActions()
  const [prefs, updatePrefs] = useUiPrefs()

  const viewId = getView(params.get('view')).id
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search, 150)
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const columnVisibility = prefs.columnVisibility?.applications ?? { templateName: false }

  const counts = useMemo(() => countViews(applications), [applications])
  const data = useMemo(() => applications.filter(getView(viewId).test), [applications, viewId])

  const searchString = params.toString()
  const columns = useMemo(
    () =>
      createColumns({
        onOpen: (app) => navigate({ pathname: `/applications/${app.id}`, search: searchString }),
        onEmail: emailApplications,
        onToggleDoNotEmail: setDoNotEmail,
      }),
    [navigate, searchString, emailApplications, setDoNotEmail],
  )
  const openApp = (app) => navigate({ pathname: `/applications/${app.id}`, search: searchString })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: query, rowSelection, pagination, columnVisibility },
    getRowId: (app) => app.id,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater
      updatePrefs({ columnVisibility: { ...prefs.columnVisibility, applications: next } })
    },
    globalFilterFn: (row, _columnId, value) => matchesSearch(row.original, value),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  })

  const selectedIds = Object.keys(rowSelection)
  const filteredRows = table.getPrePaginationRowModel().rows
  const activeFilters = countActiveFilters(filtersToObject(columnFilters))
  const hasFilters = activeFilters > 0 || Boolean(query)
  const clearFilters = () => {
    setColumnFilters([])
    setSearch('')
  }
  const clearSelection = () => {
    setRowSelection({})
    setSelectionMode(false)
  }

  const countFor = (draft) => {
    const filters = objectToFilters(draft)
    return data.filter(
      (app) =>
        matchesSearch(app, query) &&
        filters.every(({ id, value }) => {
          const column = table.getColumn(id)
          return value.includes(column.accessorFn(app))
        }),
    ).length
  }

  const openApplication = openId ? applications.find((app) => app.id === openId) : null
  const closeDetail = () => navigate({ pathname: '/applications', search: params.toString() })

  if (openId && !isDesktop) {
    return <ApplicationDetail application={openApplication} variant="screen" onClose={closeDetail} />
  }

  const emailReason = !selectedIds.length ? 'Select applications first' : null
  const emailSelected = (
    <WithReason reason={emailReason} label="Email selected">
      <Button onClick={() => emailApplications(selectedIds)} disabled={Boolean(emailReason)}>
        Email selected{selectedIds.length ? ` (${selectedIds.length})` : ''}
      </Button>
    </WithReason>
  )

  const ready = status === 'ready' && connected
  const notConnected = status === 'ready' && !connected

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Applications"
        count={ready ? applications.length : null}
        actions={
          isDesktop ? (
            <>
              <SyncNowButton />
              {emailSelected}
            </>
          ) : null
        }
      />

      {status === 'loading' && (
        <div className="flex flex-col gap-4 pt-4 md:pt-6">
          <LoadingRows />
        </div>
      )}

      {status === 'error' && (
        <PageBody>
          <InlineAlert tone="destructive" title="Couldn't load applications" action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>}>
            {error}
          </InlineAlert>
        </PageBody>
      )}

      {notConnected && (
        <PageBody>
          <EmptyState
            icon={BriefcaseBusinessIcon}
            title="No applications yet"
            description="Connect a Google Sheet and run Sync now to import your applications. Syncing never sends email."
            action={
              <Button asChild variant="outline">
                <Link to="/sheets">Connect a sheet</Link>
              </Button>
            }
          />
        </PageBody>
      )}

      {ready && (
        <>
          <div className="flex flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4 xl:px-8">
            <ViewTabs
              views={APPLICATION_VIEWS}
              value={viewId}
              counts={counts}
              onChange={(id) => {
                setRowSelection({})
                setParams(id === 'all' ? {} : { view: id }, { replace: true })
              }}
            />
            <div className="flex flex-wrap items-center gap-2 max-md:sticky max-md:top-[calc(var(--header-h)+env(safe-area-inset-top))] max-md:z-10 max-md:-mx-4 max-md:border-b max-md:bg-background max-md:px-4 max-md:py-2">
              <div className="relative min-w-0 flex-1 md:max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company, recruiter, role"
                  aria-label="Search applications"
                  enterKeyHint="search"
                  className="pl-8"
                />
              </div>
              {isDesktop ? (
                <>
                  <FacetFilter column={table.getColumn('applicationStatus')} title="Status" options={FILTER_GROUPS[0].options} />
                  <FacetFilter column={table.getColumn('emailStatus')} title="Email" options={FILTER_GROUPS[1].options} />
                  <FacetFilter column={table.getColumn('replyStatus')} title="Reply" options={FILTER_GROUPS[2].options} />
                  <FacetFilter
                    column={table.getColumn('templateName')}
                    title="Template"
                    options={[...new Set(applications.map((app) => app.templateName || 'None'))]}
                  />
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <XIcon aria-hidden="true" />
                      Reset
                    </Button>
                  )}
                  <div className="ml-auto">
                    <TableViewMenu table={table} density={prefs.density} onDensityChange={(density) => updatePrefs({ density })} />
                  </div>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setFilterSheetOpen(true)} aria-label={`Filters${activeFilters ? `, ${activeFilters} active` : ''}`}>
                    <ListFilterIcon aria-hidden="true" />
                    {activeFilters ? activeFilters : 'Filter'}
                  </Button>
                  <Button variant="ghost" aria-pressed={selectionMode} onClick={() => (selectionMode ? clearSelection() : setSelectionMode(true))}>
                    {selectionMode ? 'Done' : 'Select'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title="No applications match these filters"
              description="Try a different search, or clear the filters to see every application in this view."
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : isDesktop ? (
            <>
              <DataTable
                table={table}
                label="Applications"
                selectable
                density={prefs.density}
                onRowOpen={(row) => openApp(row.original)}
                onEmail={() => selectedIds.length && emailApplications(selectedIds)}
                rowLabel={(row) => `${row.original.companyName}, ${row.original.jobTitle}`}
                className="mt-3 flex-1"
              />
              <DataTablePagination table={table} className="border-t px-6 py-2.5 xl:px-8" />
            </>
          ) : (
            <div className="pt-1 pb-4">
              <p className="px-4 pb-2 text-xs text-muted-foreground tabular-nums" aria-live="polite">
                {selectionMode
                  ? `${selectedIds.length} selected`
                  : `${filteredRows.length} ${filteredRows.length === 1 ? 'application' : 'applications'}`}
              </p>
              <ResponsiveList
                key={`${viewId}|${query}|${JSON.stringify(columnFilters)}`}
                items={filteredRows}
                getKey={(row) => row.id}
                label="Applications"
                selectionMode={selectionMode}
                isSelected={(row) => row.getIsSelected()}
                onToggle={(row) => row.toggleSelected()}
                onOpen={(row) => openApp(row.original)}
                renderRow={(row) => <ListRow app={row.original} />}
                pageSize={PAGE_SIZE}
              />
              {selectionMode && <ActionBarSpacer />}
            </div>
          )}

          {selectedIds.length > 0 && (isDesktop || selectionMode) && (
            <ActionBar label="Selection actions" className="md:bottom-14">
              <span className="text-sm font-medium tabular-nums md:px-1">{selectedIds.length} selected</span>
              <Button className="max-md:flex-1" onClick={() => emailApplications(selectedIds)}>
                Email {selectedIds.length}
              </Button>
              <Button
                variant="outline"
                className="max-md:flex-1"
                disabled={!online}
                onClick={() => {
                  setDoNotEmail(selectedIds, true)
                  clearSelection()
                }}
              >
                Do Not Email
              </Button>
              <Button variant="ghost" onClick={clearSelection}>
                {isDesktop ? 'Clear' : 'Cancel'}
              </Button>
            </ActionBar>
          )}

          {!isDesktop && (
            <FilterSheet
              open={filterSheetOpen}
              onOpenChange={setFilterSheetOpen}
              groups={FILTER_GROUPS}
              value={filtersToObject(columnFilters)}
              onApply={(value) => setColumnFilters(objectToFilters(value))}
              countResults={countFor}
            />
          )}
        </>
      )}

      {isDesktop && (
        <ApplicationDetail
          application={openApplication}
          open={Boolean(openId)}
          missing={Boolean(openId) && ready && !openApplication}
          variant="sheet"
          onClose={closeDetail}
        />
      )}
    </div>
  )
}
