import { useState } from 'react'
import { BracesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { TEMPLATE_VARIABLES } from '@/lib/templateEngine'

const GROUPS = ['Application', 'Profile']

function VariableOptions({ sampleValues, onPick }) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((group) => (
        <div key={group} role="group" aria-label={group} className="flex flex-col">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group}</p>
          {TEMPLATE_VARIABLES.filter((variable) => variable.group === group).map((variable) => (
            <button
              key={variable.key}
              type="button"
              onClick={() => onPick(variable.key)}
              className="flex min-h-9 flex-col items-start rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-12"
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="text-sm">{variable.label}</span>
                <span className="truncate text-xs text-muted-foreground">{sampleValues[variable.key] || 'empty'}</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground">{`{{${variable.key}}}`}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Insert variable: a popover from `md`, a bottom sheet on phones. */
export function InsertVariableButton({ onPick, sampleValues = {}, size = 'sm' }) {
  const isDesktop = useMediaQuery(MEDIA.md)
  const [open, setOpen] = useState(false)
  const pick = (key) => {
    setOpen(false)
    onPick(key)
  }
  const trigger = (
    <Button variant="outline" size={size} onMouseDown={(event) => event.preventDefault()}>
      <BracesIcon aria-hidden="true" />
      Insert variable
    </Button>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-1.5" onCloseAutoFocus={(event) => event.preventDefault()}>
          <VariableOptions sampleValues={sampleValues} onPick={pick} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        <BracesIcon aria-hidden="true" />
        Insert variable
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0" onCloseAutoFocus={(event) => event.preventDefault()}>
          <SheetHeader className="px-4 pt-3 pb-2 text-left">
            <SheetTitle>Insert variable</SheetTitle>
            <SheetDescription>Inserted where your cursor was.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-2 pb-4">
            <VariableOptions sampleValues={sampleValues} onPick={pick} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
