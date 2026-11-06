import { useState } from 'react'
import { BellPlusIcon, InboxIcon, PlusIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { KpiStrip } from '@/components/common/KpiStrip'
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ThemeSegmented } from '@/components/common/ThemeSwitcher'
import { ConnectionStatus } from '@/components/global/ConnectionStatus'
import { AppMark } from '@/components/layout/AppMark'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNotifications } from '@/context/NotificationContext'
import { APPLICATION_STATUS, EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'

const NEUTRAL_TOKENS = [
  'canvas',
  'background',
  'muted',
  'accent',
  'border',
  'border-strong',
  'subtle-foreground',
  'muted-foreground',
  'foreground',
  'primary',
]
const SEMANTIC_TOKENS = ['brand', 'success', 'warning', 'destructive']

const SAMPLE_ROWS = [
  { company: 'Kestrel Analytics', title: 'Frontend Engineer', email: 'Sent', reply: 'Replied' },
  { company: 'Lumen Health', title: 'Data Analyst', email: 'Failed', reply: 'Not Checked' },
  { company: 'Brightpath Logistics', title: 'Product Designer', email: 'Sending', reply: 'Not Checked' },
  { company: 'Northfield Bank', title: 'QA Engineer', email: 'Queued', reply: 'Not Checked' },
]

function Section({ title, description, children }) {
  return (
    <section className="flex flex-col gap-4 border-b pb-10 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Swatch({ token }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="h-10 rounded-md border" style={{ background: `var(--${token})` }} />
      <span className="truncate font-mono text-xs text-muted-foreground">--{token}</span>
    </div>
  )
}

export default function DesignSystemPage() {
  const { notify } = useNotifications()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 flex h-13 items-center gap-3 border-b bg-background px-4 md:px-8">
        <AppMark />
        <h1 className="text-sm font-semibold">Design system</h1>
        <span className="text-sm text-muted-foreground max-sm:hidden">v2 tokens and components</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSegmented className="w-auto max-sm:hidden" />
          <Button asChild variant="outline" size="sm">
            <Link to="/">Open app</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-8 md:px-8">
        <Section
          title="Color"
          description="Neutral chrome on a cool zinc ramp. Cobalt is the only accent; green, amber, and red mean real state."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {NEUTRAL_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SEMANTIC_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Section>

        <Section title="Type" description="Geist for UI, Geist Mono for IDs, placeholders, and timestamps.">
          <div className="flex flex-col gap-3">
            <span className="text-2xl font-semibold tabular-nums">1,284 · KPI 24</span>
            <span className="text-xl font-semibold">Page title · 20</span>
            <span className="text-lg font-semibold">Section title · 18</span>
            <span className="text-md">Mobile body and touch inputs · 16</span>
            <span className="text-base">Default UI text · 14</span>
            <span className="text-sm">Table cells and secondary UI · 13</span>
            <span className="text-xs text-muted-foreground">Meta and timestamps · 12</span>
            <span className="font-mono text-sm">{'{{recruiter_first_name|there}}'} · 18c2f4a9b1e0d7aa</span>
          </div>
        </Section>

        <Section title="Shape and elevation" description="6 px controls, 8 px panels, 12 px overlays. Panels use a border, never a shadow.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex h-20 items-center justify-center rounded-md border text-sm">Control · 6</div>
            <div className="flex h-20 items-center justify-center rounded-lg border text-sm">Panel · 8</div>
            <div className="flex h-20 items-center justify-center rounded-xl border bg-popover text-sm shadow-modal">
              Overlay · 12
            </div>
          </div>
        </Section>

        <Section title="Buttons" description="32 px by default and 44 px on touch screens. One primary action per view.">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Send 12 emails</Button>
            <Button variant="brand">Connect Google</Button>
            <Button variant="outline">
              <RefreshCwIcon aria-hidden="true" />
              Sync now
            </Button>
            <Button variant="secondary">Preview</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive">Delete template</Button>
            <Button variant="link">Open in Gmail</Button>
            <Button disabled>Disabled</Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="New template">
                  <PlusIcon aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                New template <Kbd>N</Kbd>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" variant="outline">Extra small</Button>
            <Button size="sm" variant="outline">Small</Button>
            <Button variant="outline">Default</Button>
            <Button size="lg" variant="outline">Large</Button>
          </div>
        </Section>

        <Section title="Form controls">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-url">Spreadsheet link</Label>
              <Input id="ds-url" placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Worksheet</Label>
              <Select defaultValue="applications">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applications">Applications</SelectItem>
                  <SelectItem value="log">Email_Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="ds-body">Template body</Label>
              <Textarea
                id="ds-body"
                className="font-mono"
                rows={4}
                defaultValue={
                  'Hi {{recruiter_first_name|there}},\n\nI came across the {{job_title}} role at {{company_name}}.'
                }
              />
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox id="ds-confirm" />
              <Label htmlFor="ds-confirm" className="font-normal">I reviewed every preview</Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Switch id="ds-reply" />
              <Label htmlFor="ds-reply" className="font-normal">Track replies</Label>
            </div>
            <ToggleGroup type="single" defaultValue="edit" aria-label="Editor mode" className="w-full max-w-xs">
              <ToggleGroupItem value="edit">Edit</ToggleGroupItem>
              <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </Section>

        <Section title="Status" description="Text is always present; color is never the only signal.">
          <div className="flex flex-col gap-3">
            {[
              ['Application', APPLICATION_STATUS],
              ['Email', { ...EMAIL_STATUS, sending: 'Sending' }],
              ['Reply', REPLY_STATUS],
            ].map(([group, statuses]) => (
              <div key={group} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-xs text-muted-foreground">{group}</span>
                {Object.values(statuses).map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['connected', 'expiring', 'expired', 'disconnected'].map((state) => (
              <ConnectionStatus key={state} status={state} />
            ))}
            <ConnectionStatus kind="sheet" status="no-access" />
            <ConnectionStatus status="connected" online={false} />
          </div>
        </Section>

        <Section title="KPI strip" description="One bordered strip with hairline dividers instead of a row of cards.">
          <KpiStrip
            items={[
              { label: 'Applications', value: 128 },
              { label: 'Emails sent', value: 64, hint: 'this month' },
              { label: 'Replies', value: 11, hint: '17%' },
              { label: 'Failed', value: 2 },
              { label: 'Waiting', value: 41 },
            ]}
          />
          <KpiStrip loading items={[{ label: 'Applications' }, { label: 'Emails sent' }, { label: 'Replies' }]} className="lg:grid-cols-3" />
        </Section>

        <Section title="Table">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_ROWS.map((row) => (
                  <TableRow key={row.company}>
                    <TableCell>
                      <div className="font-medium">{row.company}</div>
                      <div className="text-xs text-muted-foreground">{row.title}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.email} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.reply} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Feedback" description="Every button below runs locally. Nothing is sent from this page.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Alert>
              <TriangleAlertIcon className="text-warning" />
              <AlertTitle>Session expiring</AlertTitle>
              <AlertDescription>Your Google session ends in 4 minutes. Reconnect to keep sending.</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Sending 4 of 12</span>
                <span className="text-xs text-muted-foreground">Next email in 18 s</span>
              </div>
              <Progress value={33} aria-label="Campaign progress" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.success('Saved template')}>Success toast</Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.error('Gmail rejected the address', {
                    description: 'Check the recruiter email in your sheet, then retry.',
                  })
                }
              >
                Error toast
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  notify({ type: 'sync', title: 'Design review sample', body: 'Local notification from /_design.' })
                }
              >
                <BellPlusIcon aria-hidden="true" />
                Add notification
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(true)}>Responsive dialog</Button>
              <Button onClick={() => setConfirmOpen(true)}>Confirm dialog</Button>
            </div>
          </div>
          <ResponsiveDialog
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Filter applications"
            description="Dialog on desktop, bottom sheet on phones."
            footer={<Button onClick={() => setSheetOpen(false)}>Show 24 results</Button>}
          >
            <p className="text-sm text-muted-foreground">Filter controls go here in Phase 3.</p>
          </ResponsiveDialog>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Send 12 emails?"
            description="Sample only. This dialog closes without sending anything."
            confirmLabel="Send 12 emails"
            acknowledgement="I reviewed the previews and want to send these emails."
            onConfirm={() => setConfirmOpen(false)}
          />
        </Section>

        <Section title="Empty state">
          <div className="rounded-lg border">
            <EmptyState
              icon={InboxIcon}
              title="No applications yet"
              description="Connect a Google Sheet and run Sync now to import your applications."
              action={<Button variant="outline">Connect a sheet</Button>}
            />
          </div>
        </Section>
      </main>
    </div>
  )
}
