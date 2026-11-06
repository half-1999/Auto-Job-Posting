import { NAV_ITEMS } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import { GLOBAL_SHORTCUTS } from '@/app/shortcuts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { modKeyLabel } from '@/lib/platform'

function Keys({ keys }) {
  return (
    <KbdGroup>
      {keys.map((key, index) => (
        <Kbd key={index}>{key === 'mod' ? modKeyLabel() : key}</Kbd>
      ))}
    </KbdGroup>
  )
}

function Section({ title, rows }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div key={row.label} className="flex h-8 items-center justify-between gap-4 text-sm">
            <dt>{row.label}</dt>
            <dd>
              <Keys keys={row.keys} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useShell()
  const navRows = NAV_ITEMS.map((item) => ({
    label: `Go to ${item.label}`,
    keys: ['G', item.shortcut.toUpperCase()],
  }))

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are paused while you type in a field.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <Section title="General" rows={GLOBAL_SHORTCUTS} />
          <Section title="Navigation" rows={navRows} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
