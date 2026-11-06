import { DEFAULT_TEMPLATES } from './defaultTemplates'
import { STORAGE_KEYS } from './constants'
import { readStorage, writeStorage } from './storage'

const stamp = () => new Date().toISOString()

export function seedTemplates(now = stamp()) {
  return DEFAULT_TEMPLATES.map((template) => ({ ...template, createdAt: now, updatedAt: now }))
}

/** Saved templates, or the defaults when this browser has none (AC-6). */
export function loadTemplates() {
  const stored = readStorage(STORAGE_KEYS.templates)
  if (Array.isArray(stored?.items) && stored.items.length) return stored.items
  const items = seedTemplates()
  try {
    writeStorage(STORAGE_KEYS.templates, { items })
  } catch {
    // The defaults still show for this session. The next edit tries again.
  }
  return items
}
