import { PaperclipIcon, TriangleAlertIcon } from 'lucide-react'
import { describeIssue } from '@/lib/templateEngine'
import { cn } from '@/lib/utils'

/** Renders template segments; empty and unknown placeholders are underlined and listed. */
export function RenderedText({ segments, className }) {
  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          segment.value
        ) : segment.status === 'ok' || segment.status === 'fallback' ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <mark
            key={index}
            title={segment.status === 'unknown' ? 'Not a supported placeholder' : 'No value'}
            className="rounded-[3px] bg-warning/15 px-0.5 text-foreground underline decoration-warning decoration-wavy underline-offset-4"
          >
            {segment.raw}
          </mark>
        ),
      )}
    </span>
  )
}

export function IssueList({ issues, className }) {
  if (!issues.length) return null
  return (
    <ul className={cn('flex flex-col gap-1 text-sm', className)} aria-label="Template warnings">
      {issues.map((issue) => (
        <li key={`${issue.kind}:${issue.key}`} className="flex items-start gap-2">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span>{describeIssue(issue)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Email-card preview: From, To, Subject, then the body at reading size (16 px, 68ch). */
export function EmailCard({ from, to, email, attachmentName, className }) {
  return (
    <article className={cn('overflow-hidden rounded-lg border bg-background', className)}>
      <dl className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b px-4 py-3 text-sm">
        {from && (
          <>
            <dt className="text-muted-foreground">From</dt>
            <dd className="truncate">{from}</dd>
          </>
        )}
        <dt className="text-muted-foreground">To</dt>
        <dd className="truncate font-mono text-xs leading-5">{to}</dd>
        <dt className="text-muted-foreground">Subject</dt>
        <dd className="font-medium">
          <RenderedText segments={email.subject.segments} />
        </dd>
      </dl>
      <div className="max-w-[68ch] px-4 py-4 text-md leading-relaxed">
        <RenderedText segments={email.body.segments} />
      </div>
      {attachmentName && (
        <p className="mx-4 mb-4 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground">
          <PaperclipIcon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Attachment: </span>
          <span className="text-foreground">{attachmentName}</span>
        </p>
      )}
    </article>
  )
}
