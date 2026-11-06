import { cn } from '@/lib/utils'

/** The app mark: the favicon tile, drawn with theme tokens. */
export function AppMark({ className }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('size-6 shrink-0', className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9 16.5 22.5 9.5 18.5 23l-3-5.5L9 16.5Z"
        strokeWidth="2.25"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
      <path
        d="m15.5 17.5 7-8"
        strokeWidth="2.25"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  )
}
