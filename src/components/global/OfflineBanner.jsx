import { CloudOffIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/time'

const timeOnly = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function formatSyncedAt(value) {
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString() ? timeOnly.format(date) : formatDateTime(value)
}

export function OfflineBanner({ online, syncedAt }) {
  if (online) return null

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b bg-warning/10 px-4 py-2 text-sm md:px-6 xl:px-8"
    >
      <CloudOffIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-pretty">
        <span className="font-medium">
          {syncedAt ? (
            <>
              Offline · last synced{' '}
              <time dateTime={syncedAt} title={formatDateTime(syncedAt)}>
                {formatSyncedAt(syncedAt)}
              </time>
            </>
          ) : (
            "You're offline."
          )}
        </span>{' '}
        <span className="text-muted-foreground">
          {syncedAt ? (
            <>
              Showing your saved copy. Syncing and sending are paused until you're back online and
              choose to continue.
            </>
          ) : (
            "Saved data stays visible. Syncing and sending wait until you're back online and choose to continue."
          )}
        </span>
      </p>
    </div>
  )
}
