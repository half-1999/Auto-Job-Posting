const STATUS_TONES = {
  'Not Sent': 'neutral',
  'Not Applied': 'neutral',
  'Not Checked': 'neutral',
  'No Reply': 'neutral',
  'Do Not Email': 'neutral',
  Withdrawn: 'neutral',
  Queued: 'neutral',
  Test: 'neutral',
  Sending: 'brand',
  Sent: 'brand',
  Applied: 'brand',
  Interviewing: 'brand',
  Replied: 'success',
  Offer: 'success',
  'Auto-Reply': 'warning',
  Uncertain: 'warning',
  'On Hold': 'warning',
  Failed: 'destructive',
  Bounced: 'destructive',
  Rejected: 'destructive',
}

export function getStatusTone(status) {
  return STATUS_TONES[status] ?? 'neutral'
}

/** Fills for the pipeline bar and status breakdown. Always shown next to a text label. */
export const STATUS_FILLS = {
  'Not Applied': 'bg-muted-foreground/30',
  Applied: 'bg-brand',
  Interviewing: 'bg-brand/50',
  Offer: 'bg-success',
  Rejected: 'bg-destructive/70',
  Withdrawn: 'bg-muted-foreground/60',
  'On Hold': 'bg-warning',
}
