import {
  ChevronRightIcon,
  CircleUserIcon,
  DatabaseIcon,
  FileTextIcon,
  GlobeIcon,
  InfoIcon,
  KeyboardIcon,
  BellIcon,
  MonitorDownIcon,
  PaletteIcon,
  SendIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { Link, Navigate, NavLink, useParams } from 'react-router-dom'
import { ActionBar, ActionBarSpacer } from '@/components/common/ActionBar'
import { PageBody, PageHeader, SubHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import {
  AboutSection,
  MoreSection,
  AppearanceSection,
  DataSection,
  GoogleSection,
  InstallSection,
  NotificationsSection,
  ProfileSection,
  ResumeSection,
  SendingSection,
  ShortcutsSection,
} from './sections'
import { useSectionForm } from './useSectionForm'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: CircleUserIcon, component: ProfileSection, form: 'profile' },
  { id: 'resume', label: 'Resume', icon: FileTextIcon, component: ResumeSection },
  { id: 'sending', label: 'Sending', icon: SendIcon, component: SendingSection, form: 'sending' },
  { id: 'google', label: 'Google account', icon: ShieldCheckIcon, component: GoogleSection },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, component: NotificationsSection },
  { id: 'appearance', label: 'Appearance', icon: PaletteIcon, component: AppearanceSection },
  { id: 'install', label: 'Install app', icon: MonitorDownIcon, component: InstallSection },
  { id: 'data', label: 'Data & storage', icon: DatabaseIcon, component: DataSection },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: KeyboardIcon, component: ShortcutsSection, desktopOnly: true },
  { id: 'about', label: 'About', icon: InfoIcon, component: AboutSection },
  { id: 'more', label: 'More', icon: GlobeIcon, component: MoreSection },
]

function FormSection({ section, isDesktop }) {
  const Component = section.component
  const form = useSectionForm(section.form, Component.validate)
  return (
    <>
      <Component form={form} />
      {form.dirty && (
        <>
          <ActionBarSpacer />
          <ActionBar variant={isDesktop ? 'footer' : 'floating'} label="Unsaved changes" className="md:-mx-6 md:mt-6 xl:-mx-8">
            <span className="text-sm text-muted-foreground max-md:hidden">Unsaved changes</span>
            <div className="flex-1 max-md:hidden" />
            <Button variant="outline" onClick={form.discard} className="max-md:flex-1">
              Discard
            </Button>
            <Button onClick={form.save} className="max-md:flex-1">
              Save
            </Button>
          </ActionBar>
        </>
      )}
    </>
  )
}

function SectionContent({ section, isDesktop }) {
  if (section.form) return <FormSection key={section.id} section={section} isDesktop={isDesktop} />
  const Component = section.component
  return <Component />
}

export default function SettingsPage() {
  const { section: sectionId } = useParams()
  const isDesktop = useMediaQuery(MEDIA.md)
  const section = SECTIONS.find((item) => item.id === sectionId)

  if (sectionId && !section) return <Navigate to="/settings" replace />

  if (!isDesktop) {
    if (!section) {
      return (
        <>
          <PageHeader title="Settings" />
          <nav aria-label="Settings sections">
            <ul className="divide-y border-b">
              {SECTIONS.filter((item) => !item.desktopOnly).map((item) => (
                <li key={item.id}>
                  <Link to={`/settings/${item.id}`} className="flex min-h-12 items-center gap-3 px-4 active:bg-muted">
                    <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )
    }
    return (
      <>
        <SubHeader backTo="/settings" backLabel="Back to Settings" title={section.label} />
        <h1 className="sr-only">{section.label}</h1>
        <div className="px-4 py-4">
          <SectionContent section={section} isDesktop={false} />
        </div>
      </>
    )
  }

  const current = section ?? SECTIONS[0]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Settings" />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Settings sections" className="w-56 shrink-0 overflow-y-auto border-r p-3">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={`/settings/${item.id}`}
                  aria-current={item.id === current.id ? 'page' : undefined}
                  className={cn(
                    'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    item.id === current.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          <PageBody className="max-w-3xl flex-1">
            <h2 className="text-base font-semibold">{current.label}</h2>
            <SectionContent section={current} isDesktop />
          </PageBody>
        </div>
      </div>
    </div>
  )
}
