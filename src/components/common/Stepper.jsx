import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Desktop step rail. Each step: `{ id, label, complete, reachable, meta }`. */
export function StepRail({ steps, currentId, onSelect, label = 'Steps', className }) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-col gap-0.5">
        {steps.map((step, index) => {
          const current = step.id === currentId
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!step.reachable}
                aria-current={current ? 'step' : undefined}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors duration-(--dur-fast) outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                  current ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums',
                    step.complete && !current && 'border-brand bg-brand text-brand-foreground',
                    current && 'border-foreground text-foreground',
                  )}
                >
                  {step.complete && !current ? <CheckIcon className="size-3" /> : index + 1}
                </span>
                <span className="flex-1 truncate">{step.label}</span>
                {step.meta != null && <span className="text-xs text-muted-foreground tabular-nums">{step.meta}</span>}
                {step.complete && <span className="sr-only">(complete)</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Phone progress header: "Recipients · 1 of 4" over a segmented bar. */
export function StepProgress({ steps, currentId, className }) {
  const index = Math.max(0, steps.findIndex((step) => step.id === currentId))
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-sm">
        <span className="font-medium">{steps[index].label}</span>
        <span className="text-muted-foreground">
          {' '}
          · {index + 1} of {steps.length}
        </span>
      </p>
      <div aria-hidden="true" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, i) => (
          <span key={step.id} className={cn('h-1 rounded-full', i <= index ? 'bg-brand' : 'bg-muted')} />
        ))}
      </div>
    </div>
  )
}
