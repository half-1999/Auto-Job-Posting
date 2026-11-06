import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusinessIcon,
  FilePlusIcon,
  FileTextIcon,
  KeyboardIcon,
  LogInIcon,
  MonitorDownIcon,
  MonitorIcon,
  MoonIcon,
  RefreshCwIcon,
  SendIcon,
  SunIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useAuth, useWorkspace } from '@/context/app-contexts'
import { matchesSearch } from '@/features/applications/views'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'

const MAX_RESULTS = 6

/**
 * Pages and actions. Application and template results are added in Phase 3 and are searched
 * in memory only; the palette never makes a network request.
 */
export function CommandPalette({ status }) {
  const { paletteOpen, setPaletteOpen, setShortcutsOpen, setInstallOpen } = useShell()
  const { canOffer: canInstall } = useInstallPrompt()
  const auth = useAuth()
  const { live: authLive, prepare: prepareAuth } = auth
  useEffect(() => {
    if (paletteOpen && !authLive) prepareAuth()
  }, [paletteOpen, authLive, prepareAuth])
  const { setTheme } = useTheme()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(MEDIA.md)
  const { applications, templates, connected, createTemplate } = useWorkspace()
  const [query, setQuery] = useState('')
  const sheetReady =
    (status.sheet.status === 'connected' || status.sheet.status === 'mock') && status.online
  const searching = query.trim().length >= 2
  const appResults = useMemo(
    () =>
      searching
        ? applications.filter((app) => matchesSearch(app, query.trim())).slice(0, MAX_RESULTS)
        : [],
    [applications, query, searching],
  )
  const templateResults = searching
    ? templates
        .filter((template) => template.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, MAX_RESULTS)
    : []

  const run = (fn) => () => {
    setPaletteOpen(false)
    setQuery('')
    fn()
  }

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(open) => {
        setPaletteOpen(open)
        if (!open) setQuery('')
      }}
      className="max-md:inset-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:rounded-none max-md:border-0 max-md:pt-[env(safe-area-inset-top)]"
      commandProps={{ loop: true }}
    >
      <CommandInput
        placeholder="Search pages, applications, templates"
        value={query}
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList className="max-md:max-h-none max-md:flex-1">
        <CommandEmpty>No matches. Try a page name such as Templates.</CommandEmpty>
        {appResults.length > 0 && (
          <CommandGroup heading="Applications">
            {appResults.map((app) => (
              <CommandItem
                key={app.id}
                value={`application ${app.id} ${app.companyName} ${app.recruiterName} ${app.recruiterEmail} ${app.jobTitle}`}
                keywords={[query]}
                onSelect={run(() => navigate(`/applications/${app.id}`))}
              >
                <BriefcaseBusinessIcon aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  {app.companyName}
                  <span className="text-muted-foreground"> · {app.jobTitle}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {templateResults.length > 0 && (
          <CommandGroup heading="Templates">
            {templateResults.map((template) => (
              <CommandItem
                key={template.id}
                value={`template ${template.id} ${template.name}`}
                keywords={[query]}
                onSelect={run(() => navigate(`/templates/${template.id}`))}
              >
                <FileTextIcon aria-hidden="true" />
                {template.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={`go ${item.label}`}
              onSelect={run(() => navigate(item.path))}
            >
              <item.icon aria-hidden="true" />
              {item.label}
              {isDesktop && <CommandShortcut>G {item.shortcut.toUpperCase()}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="new campaign"
            disabled={!connected}
            onSelect={run(() => navigate('/campaigns/new'))}
          >
            <SendIcon aria-hidden="true" />
            New campaign
            {!connected && (
              <span className="ml-auto text-xs text-muted-foreground">Connect a sheet first</span>
            )}
          </CommandItem>
          <CommandItem
            value="new template"
            disabled={!connected}
            onSelect={run(() => {
              const created = createTemplate({ name: 'Untitled template', subject: '', body: '' })
              navigate(`/templates/${created.id}`)
            })}
          >
            <FilePlusIcon aria-hidden="true" />
            New template
            {!connected && (
              <span className="ml-auto text-xs text-muted-foreground">Connect a sheet first</span>
            )}
          </CommandItem>
          <CommandItem
            value="sync now"
            disabled={!sheetReady}
            onSelect={run(() => navigate('/sheets'))}
          >
            <RefreshCwIcon aria-hidden="true" />
            Sync now
            {!sheetReady && (
              <span className="ml-auto text-xs text-muted-foreground">
                {status.online ? 'Connect a sheet first' : 'Needs a connection'}
              </span>
            )}
          </CommandItem>
          <CommandItem value="theme light" onSelect={run(() => setTheme('light'))}>
            <SunIcon aria-hidden="true" />
            Switch to light theme
          </CommandItem>
          <CommandItem value="theme dark" onSelect={run(() => setTheme('dark'))}>
            <MoonIcon aria-hidden="true" />
            Switch to dark theme
          </CommandItem>
          <CommandItem value="theme system" onSelect={run(() => setTheme('system'))}>
            <MonitorIcon aria-hidden="true" />
            Use system theme
          </CommandItem>
          {!auth.live && (
            <CommandItem
              value="connect google reconnect"
              disabled={Boolean(auth.disabledReason) || auth.status === 'requesting'}
              onSelect={run(() => auth.connect())}
            >
              <LogInIcon aria-hidden="true" />
              {auth.hint ? 'Reconnect Google' : 'Connect Google'}
              {auth.disabledReason && (
                <span className="ml-auto text-xs text-muted-foreground">{auth.disabledReason}</span>
              )}
            </CommandItem>
          )}
          {canInstall && (
            <CommandItem value="install app" onSelect={run(() => setInstallOpen(true))}>
              <MonitorDownIcon aria-hidden="true" />
              Install app
            </CommandItem>
          )}
          {isDesktop && (
            <CommandItem value="keyboard shortcuts" onSelect={run(() => setShortcutsOpen(true))}>
              <KeyboardIcon aria-hidden="true" />
              Keyboard shortcuts
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
