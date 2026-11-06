/**
 * Shift-click range selection: every id between the anchor and the target (inclusive, in
 * display order) takes the target's new value. Without a usable anchor only the target changes.
 */
export function selectRange(orderedIds, anchorId, targetId, value, selection) {
  const next = { ...selection }
  const from = orderedIds.indexOf(anchorId)
  const to = orderedIds.indexOf(targetId)
  const ids = from === -1 || to === -1 ? [targetId] : orderedIds.slice(Math.min(from, to), Math.max(from, to) + 1)
  for (const id of ids) {
    if (value) next[id] = true
    else delete next[id]
  }
  return next
}
