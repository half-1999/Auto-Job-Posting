import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon, title, description, action, secondaryAction, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-semibold text-balance">{title}</h2>
        {description && (
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
