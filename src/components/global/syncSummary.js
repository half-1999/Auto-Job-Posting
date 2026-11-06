/** "Imported 92 · Skipped 3 · Invalid 5", plus how many new IDs were written. */
export function syncSummary({ summary, assignedIds }) {
  const parts = [`Imported ${summary.imported}`, `Skipped ${summary.skipped}`, `Invalid ${summary.invalid}`]
  if (assignedIds) parts.push(`${assignedIds} new ${assignedIds === 1 ? 'ID' : 'IDs'} saved to your sheet`)
  return parts.join(' · ')
}
