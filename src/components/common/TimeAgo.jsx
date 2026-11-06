import { useEffect, useState } from 'react'
import { formatDateTime, formatRelativeTime } from '@/lib/time'

/** Relative time that refreshes every minute, with the exact time in the tooltip text. */
export function TimeAgo({ value, className }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!value) return null
  const iso = new Date(value).toISOString()

  return (
    <time dateTime={iso} title={formatDateTime(value)} className={className}>
      {formatRelativeTime(value, now)}
    </time>
  )
}
