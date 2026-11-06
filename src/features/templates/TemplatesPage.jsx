import { useEffect, useId, useMemo, useState } from 'react'
import { CopyIcon, EllipsisIcon, FileTextIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader, SubHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useProfile, useWorkspace } from '@/context/app-contexts'
import { useMediaQuery, MEDIA } from '@/hooks/useMediaQuery'
import { buildTemplateValues, renderEmail, SAMPLE_APPLICATION } from '@/lib/templateEngine'
import { cn } from '@/lib/utils'
import { EmailCard, IssueList } from './TemplatePreview'
import { TemplateFields } from './TemplateFields'

const AUTOSAVE_MS = 800
const XL = '(min-width: 1280px)'

function TemplateList({ templates, selectedId }) {
  return (
    <nav aria-label="Templates">
      <ul className="flex flex-col max-md:divide-y max-md:border-y md:gap-0.5 md:p-2">
        {templates.map((template) => (
          <li key={template.id}>
            <NavLink
              to={`/templates/${template.id}`}
              aria-current={template.id === selectedId ? 'page' : undefined}
              className={cn(
                'flex flex-col gap-0.5 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring md:rounded-md md:px-3 md:py-2',
                template.id === selectedId ? 'md:bg-muted' : 'hover:bg-muted/60 active:bg-muted',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{template.name || 'Untitled template'}</span>
                {template.isDefault && <span className="shrink-0 text-xs text-muted-foreground">Default</span>}
              </span>
              <span className="truncate text-xs text-muted-foreground">Subject: {template.subject || 'none'}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function PreviewPane({ draft, profile, applications, previewId, onPreviewChange }) {
  const selectId = useId()
  const application = applications.find((app) => app.id === previewId) ?? SAMPLE_APPLICATION
  const email = renderEmail(draft, application, profile)
  const from = profile.name ? `${profile.name}${profile.email ? ` <${profile.email}>` : ''}` : profile.email || 'Your Gmail address'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId}>Preview as</Label>
        <Select value={previewId} onValueChange={onPreviewChange}>
          <SelectTrigger id={selectId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="sample">Sample data ({SAMPLE_APPLICATION.recruiterName})</SelectItem>
            {applications.slice(0, 30).map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.recruiterName || app.recruiterEmail} · {app.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <EmailCard from={from} to={application.recruiterEmail ?? 'priya@acme.example'} email={email} />
      {email.issues.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {email.issues.length} {email.issues.length === 1 ? 'warning' : 'warnings'}
          </p>
          <IssueList issues={email.issues} />
          <p className="text-xs text-pretty text-muted-foreground">
            Recipients with warnings are blocked from sending until the value is filled in or a fallback is added, for
            example {'{{recruiter_first_name|there}}'}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No warnings for this recipient.</p>
      )}
    </div>
  )
}

function useAutosave(draft, saved, save) {
  const dirty = Boolean(draft) && (draft.name !== saved?.name || draft.subject !== saved?.subject || draft.body !== saved?.body)
  useEffect(() => {
    if (!dirty) return undefined
    const id = setTimeout(() => save(draft), AUTOSAVE_MS)
    return () => clearTimeout(id)
  }, [dirty, draft, save])
  return dirty
}

export default function TemplatesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(MEDIA.md)
  const isWide = useMediaQuery(XL)
  const profile = useProfile()
  const { templates, applications, status, isMock, saveTemplate, createTemplate, deleteTemplate, restoreTemplate } = useWorkspace()
  const [drafts, setDrafts] = useState({})
  const [mono, setMono] = useState(false)
  const [mode, setMode] = useState('edit')
  const [previewId, setPreviewId] = useState('sample')
  const nameId = useId()

  const selected = templates.find((template) => template.id === id) ?? (isDesktop && !id ? templates[0] : null)
  const draft = selected ? (drafts[selected.id] ?? selected) : null
  const dirty = useAutosave(draft, selected, saveTemplate)
  const values = useMemo(
    () => buildTemplateValues(applications.find((app) => app.id === previewId) ?? SAMPLE_APPLICATION, profile),
    [applications, previewId, profile],
  )
  const issueCount = draft ? renderEmail(draft, applications.find((app) => app.id === previewId) ?? SAMPLE_APPLICATION, profile).issues.length : 0

  const change = (patch) => setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ...patch } }))

  const create = () => {
    const created = createTemplate({ name: 'Untitled template', subject: '', body: '' })
    navigate(`/templates/${created.id}`)
  }
  const duplicate = () => {
    const created = createTemplate({ name: `${draft.name} copy`, subject: draft.subject, body: draft.body })
    navigate(`/templates/${created.id}`)
    toast.success('Template duplicated')
  }
  const remove = () => {
    const index = templates.findIndex((template) => template.id === selected.id)
    const removed = { ...selected, ...draft }
    deleteTemplate(selected.id)
    navigate('/templates')
    toast(`Deleted ${removed.name || 'template'}`, {
      description: isMock ? 'Mock data only.' : undefined,
      action: { label: 'Undo', onClick: () => restoreTemplate(removed, index) },
    })
  }
  const deleteReason = templates.length <= 1 ? 'Keep at least one template' : null

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Templates" />
        <div className="flex flex-col gap-3 p-4 md:p-6" aria-hidden="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </>
    )
  }

  if (!templates.length) {
    return (
      <>
        <PageHeader title="Templates" />
        <EmptyState
          icon={FileTextIcon}
          title="No templates yet"
          description="Starter templates for cold outreach, application follow-ups, and referral requests will be listed here, with placeholders such as {{company_name}}."
        />
      </>
    )
  }

  const newButton = (
    <Button onClick={create}>
      <PlusIcon aria-hidden="true" />
      New template
    </Button>
  )

  if (!isDesktop && !selected) {
    return (
      <>
        <PageHeader title="Templates" count={templates.length} actions={newButton} />
        <div className="pt-4">
          <TemplateList templates={templates} selectedId={null} />
        </div>
      </>
    )
  }

  const overflow = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Template actions">
          <EllipsisIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={duplicate}>
          <CopyIcon aria-hidden="true" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={Boolean(deleteReason)} onSelect={remove}>
          <Trash2Icon aria-hidden="true" />
          {deleteReason ?? 'Delete template'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const saveState = (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      {dirty ? 'Saving' : isMock ? 'Saved to mock data' : 'Saved'}
      {issueCount > 0 && ` · ${issueCount} ${issueCount === 1 ? 'warning' : 'warnings'}`}
    </p>
  )

  const editor = selected && (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input id={nameId} value={draft.name} onChange={(event) => change({ name: event.target.value })} />
      </div>
      <TemplateFields
        subject={draft.subject}
        body={draft.body}
        onChange={change}
        sampleValues={values}
        mono={mono}
        onMonoChange={setMono}
      />
      {saveState}
    </div>
  )

  const preview = selected && (
    <PreviewPane draft={draft} profile={profile} applications={applications} previewId={previewId} onPreviewChange={setPreviewId} />
  )

  const modeToggle = (
    <ToggleGroup type="single" value={mode} onValueChange={(value) => value && setMode(value)} aria-label="Editor mode" className="w-full max-w-xs">
      <ToggleGroupItem value="edit">Edit</ToggleGroupItem>
      <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
    </ToggleGroup>
  )

  if (!isDesktop) {
    return (
      <>
        <SubHeader backTo="/templates" backLabel="Back to Templates" title={draft.name || 'Untitled template'} actions={overflow} />
        <h1 className="sr-only">{draft.name || 'Untitled template'}</h1>
        <div className="flex flex-col gap-4 px-4 py-4">
          {modeToggle}
          {mode === 'edit' ? editor : preview}
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Templates" count={templates.length} actions={newButton} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 overflow-y-auto border-r">
          <TemplateList templates={templates} selectedId={selected?.id} />
        </aside>
        <section aria-label="Editor" className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-5">
            <div className="flex items-center gap-2">
              {!isWide && modeToggle}
              <div className="ml-auto">{overflow}</div>
            </div>
            {isWide || mode === 'edit' ? editor : preview}
          </div>
        </section>
        {isWide && (
          <aside aria-label="Preview" className="w-[420px] shrink-0 overflow-y-auto border-l bg-canvas/40 px-5 py-5">
            {preview}
          </aside>
        )}
      </div>
    </div>
  )
}
