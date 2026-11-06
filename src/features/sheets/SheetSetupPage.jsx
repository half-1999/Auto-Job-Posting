import { useState } from 'react'
import { FlaskConicalIcon, Loader2Icon, SheetIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionBar, ActionBarSpacer } from '@/components/common/ActionBar'
import { InlineAlert } from '@/components/common/InlineAlert'
import { StepProgress } from '@/components/common/Stepper'
import { WithReason } from '@/components/common/WithReason'
import { syncSummary } from '@/components/global/syncSummary'
import { PageHeader, SubHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, useWorkspace } from '@/context/app-contexts'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { SHEET_COLUMNS, SYSTEM_FIELDS } from '@/lib/constants'
import {
  autoMapColumns,
  getMissingRequired,
  getMissingSystemColumns,
  parseSpreadsheetInput,
} from '@/lib/sheetParser'
import { cn } from '@/lib/utils'
import { ColumnMapping } from './ColumnMapping'
import { SampleSheet } from './SampleSheet'

const STEPS = [
  { id: 'link', label: 'Sheet link' },
  { id: 'tab', label: 'Tab' },
  { id: 'map', label: 'Columns' },
  { id: 'confirm', label: 'Confirm' },
]

const SAMPLE_WORKSHEETS = [
  {
    title: 'Applications',
    rows: 133,
    headers: ['Company', 'Recruiter', 'HR Email', 'Role', 'Job Link', 'Status', 'Notes'],
  },
  {
    title: 'Archive 2025',
    rows: 41,
    headers: ['Company', 'Contact', 'Email', 'Position', 'Applied On'],
  },
]

const loadSync = () => import('@/context/sheetSync')

function describeTab(item, isMock) {
  if (!item.headers.length) return 'No header row. Put column names in row 1 to use this tab.'
  const columns = item.headers.join(', ')
  return isMock ? `${item.rows} rows · ${columns}` : `${item.headers.length} columns · ${columns}`
}

export default function SheetSetupPage() {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(MEDIA.md)
  const { isMock, setScenario, online, connectSheet } = useWorkspace()
  const { live } = useAuth()
  const [step, setStep] = useState('link')
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState(null)
  const [spreadsheet, setSpreadsheet] = useState(null)
  const [tab, setTab] = useState(SAMPLE_WORKSHEETS[0].title)
  const [columnMap, setColumnMap] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const worksheets = isMock ? SAMPLE_WORKSHEETS : (spreadsheet?.tabs ?? [])
  const index = STEPS.findIndex((item) => item.id === step)
  const worksheet = worksheets.find((item) => item.title === tab) ?? worksheets[0] ?? { title: '', headers: [] }
  const map = columnMap ?? autoMapColumns(worksheet.headers)
  const missingRequired = getMissingRequired(map)
  const missingSystem = getMissingSystemColumns(map, SYSTEM_FIELDS)
  const headersToAdd = missingSystem.filter((header) => !worksheet.headers.includes(header))

  const blockReason = !online
    ? "You're offline"
    : isMock
      ? null
      : !live
        ? 'Connect Google first'
        : step === 'tab' && !worksheet.headers.length
          ? 'Choose a tab with a header row'
          : null
  const steps = STEPS.map((item, i) => ({ ...item, complete: i < index, reachable: i <= index }))

  const readSpreadsheet = async () => {
    setBusy(true)
    setError(null)
    try {
      const mod = await loadSync()
      const result = await mod.inspectSpreadsheet(link)
      setSpreadsheet(result)
      setTab(result.suggestedTab)
      setColumnMap(null)
      setStep('tab')
    } catch (failure) {
      setError(
        failure?.code === 'not_found' || failure?.code === 'forbidden'
          ? "We couldn't open that sheet. Check the link, and make sure the Google account you connected can open it."
          : (failure?.userMessage ?? 'Something went wrong reading the sheet. Try again.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    if (isMock) {
      setScenario('populated')
      toast.success('Sheet connected', { description: 'Mock data only. Nothing was read from Google.' })
      navigate('/sheets', { replace: true })
      return
    }
    const finalMap = { ...map }
    for (const field of SYSTEM_FIELDS) if (!finalMap[field]) finalMap[field] = SHEET_COLUMNS[field]

    setBusy(true)
    setError(null)
    let outcome
    try {
      outcome = await connectSheet({
        spreadsheetId: spreadsheet.spreadsheetId,
        spreadsheetTitle: spreadsheet.title,
        tab: worksheet,
        columnMap: finalMap,
        addHeaders: headersToAdd,
      })
    } catch (failure) {
      setBusy(false)
      setError(`${failure?.userMessage ?? 'Something went wrong.'} Your sheet was not changed.`)
      return
    }
    setBusy(false)
    if (outcome.ok) toast.success('Sheet connected', { description: syncSummary(outcome.result) })
    else toast.error('Sheet connected, but the first sync failed', { description: outcome.error })
    navigate('/sheets', { replace: true })
  }

  const next = () => {
    if (busy) return
    if (step === 'link') {
      if (!parseSpreadsheetInput(link)) {
        setLinkError('Paste a Google Sheets link, like https://docs.google.com/spreadsheets/d/…')
        return
      }
      setLinkError(null)
      if (isMock) setStep('tab')
      else readSpreadsheet()
    } else if (step === 'tab') {
      setStep('map')
    } else if (step === 'map') {
      if (missingRequired.length) {
        setShowErrors(true)
        return
      }
      setStep('confirm')
    } else {
      finish()
    }
  }
  const back = () => {
    setError(null)
    if (index === 0) navigate('/sheets')
    else setStep(STEPS[index - 1].id)
  }
  const primaryLabel =
    step === 'confirm'
      ? headersToAdd.length
        ? `Add ${headersToAdd.length} columns and sync`
        : 'Connect and sync'
      : 'Continue'

  const header = isDesktop ? (
    <PageHeader title="Set up a sheet" />
  ) : (
    <>
      <SubHeader
        backTo="/sheets"
        backLabel="Cancel and go to Google Sheets"
        title="Set up a sheet"
      />
      <h1 className="sr-only">Set up a sheet</h1>
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <StepProgress steps={steps} currentId={step} />
          {isMock ? (
            <InlineAlert tone="warning" title="Mock setup">
              This walks through the real steps with sample tabs and headers. Nothing is read from
              Google.
            </InlineAlert>
          ) : (
            !live && (
              <InlineAlert tone="info" title="Connect Google first">
                Connecting a sheet needs your Google account. Connect it in Settings, then come back.
              </InlineAlert>
            )
          )}

          <h2 className="text-base font-semibold">{STEPS[index].label}</h2>

          {error && (
            <InlineAlert tone="destructive" title="That didn't work">
              {error}
            </InlineAlert>
          )}

          {step === 'link' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sheet-link">Google Sheets link</Label>
              <Input
                id="sheet-link"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={linkError ? true : undefined}
                aria-describedby="sheet-link-help"
                onKeyDown={(event) => event.key === 'Enter' && !blockReason && next()}
              />
              <p
                id="sheet-link-help"
                className={cn('text-sm', linkError ? 'text-destructive' : 'text-muted-foreground')}
              >
                {linkError ??
                  'Open your sheet in Google Sheets and copy the address bar. The sheet stays in your Drive.'}
              </p>
              {!isMock && <SampleSheet onCreated={setLink} />}
            </div>
          )}

          {step === 'tab' && (
            <div role="radiogroup" aria-label="Tab" className="flex flex-col gap-2">
              {spreadsheet && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Spreadsheet</span>{' '}
                  <span className="font-medium">{spreadsheet.title}</span>
                </p>
              )}
              {worksheets.map((item) => {
                const checked = item.title === worksheet.title
                return (
                  <button
                    key={item.title}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      setTab(item.title)
                      setColumnMap(null)
                    }}
                    className={cn(
                      'flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      checked ? 'border-brand bg-brand/5' : 'hover:border-border-strong',
                    )}
                  >
                    <SheetIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {describeTab(item, isMock)}
                      </span>
                    </span>
                  </button>
                )
              })}
              <p className="text-sm text-muted-foreground">
                The Email_Log tab is created by the app and is not listed.
              </p>
            </div>
          )}

          {step === 'map' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                We matched what we could from your headers. Check each one.
              </p>
              <ColumnMapping
                headers={worksheet.headers}
                value={map}
                onChange={setColumnMap}
                showErrors={showErrors}
              />
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col gap-3 text-sm">
              <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">Sheet</dt>
                <dd className="truncate">
                  {spreadsheet?.title ?? (
                    <span className="font-mono text-xs leading-5">{parseSpreadsheetInput(link)?.id}</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Tab</dt>
                <dd>{worksheet.title}</dd>
                <dt className="text-muted-foreground">Mapped</dt>
                <dd>{Object.keys(map).length} columns</dd>
              </dl>
              {headersToAdd.length > 0 && (
                <InlineAlert
                  tone="info"
                  title={`${headersToAdd.length} tracking columns will be added`}
                >
                  {headersToAdd.join(', ')}. They go to the right of your existing columns. Your
                  data is not moved or changed.
                </InlineAlert>
              )}
              <p className="text-muted-foreground">
                Syncing reads your rows and saves an Application ID for any row that has none. It
                never sends email.
              </p>
              {isMock && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FlaskConicalIcon className="size-3.5 text-warning" aria-hidden="true" />
                  Finishing loads the mock workspace.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <ActionBarSpacer />
      <ActionBar variant={isDesktop ? 'footer' : 'floating'} label="Setup steps">
        <Button variant="outline" onClick={back} disabled={busy} className="max-md:flex-1">
          Back
        </Button>
        <div className="flex-1 max-md:hidden" />
        <WithReason reason={blockReason} label={primaryLabel} className="max-md:flex-1">
          <Button onClick={next} disabled={Boolean(blockReason) || busy} className="max-md:w-full">
            {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {primaryLabel}
          </Button>
        </WithReason>
      </ActionBar>
    </div>
  )
}
