import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * Phone filters as a bottom sheet of 44 px chips. Changes are drafted and applied together.
 * `value` and the draft are `{ [groupId]: string[] }`.
 */
export function FilterSheet({ open, onOpenChange, groups, value, onApply, countResults }) {
  const [draft, setDraft] = useState(value)
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setDraft(value)
  }

  const toggle = (groupId, option) => {
    setDraft((current) => {
      const selected = new Set(current[groupId] ?? [])
      if (selected.has(option)) selected.delete(option)
      else selected.add(option)
      return { ...current, [groupId]: [...selected] }
    })
  }

  const count = countResults(draft)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0">
        <SheetHeader className="flex-row items-center justify-between px-4 pt-3 pb-2 text-left">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">Choose filters, then show the results.</SheetDescription>
          <Button variant="ghost" size="sm" className="mr-10" onClick={() => setDraft({})}>
            Reset
          </Button>
        </SheetHeader>
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 pb-4">
          {groups.map((group) => (
            <fieldset key={group.id} className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">{group.label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const pressed = (draft[group.id] ?? []).includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => toggle(group.id, option)}
                      className={cn(
                        'inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors duration-(--dur-fast) outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 pointer-coarse:px-4',
                        pressed
                          ? 'border-brand bg-brand/10 font-medium text-foreground'
                          : 'bg-background text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="border-t px-4 pt-3 pb-3">
          <Button
            className="w-full"
            onClick={() => {
              onApply(draft)
              onOpenChange(false)
            }}
          >
            Show {count} {count === 1 ? 'result' : 'results'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function countActiveFilters(value) {
  return Object.values(value).reduce((total, list) => total + (list?.length ?? 0), 0)
}
