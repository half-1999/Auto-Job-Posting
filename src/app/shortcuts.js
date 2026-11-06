import { useEffect, useRef } from 'react'
import { findNavItemByShortcut } from './navigation'

const SEQUENCE_TIMEOUT_MS = 1000

export function isTypingTarget(target) {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
    return true
  }
  return Boolean(target.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'))
}

/**
 * Global keyboard map (docs/UI_UX_PLAN.md §3.1):
 * Ctrl/⌘+K or "/" opens the palette, "?" opens the shortcuts sheet, "[" toggles the sidebar,
 * and "G" followed by a nav key navigates.
 */
export function createShortcutHandler(actions, now = () => Date.now()) {
  let pendingGAt = null

  return function handleKeyDown(event) {
    const key = event.key

    if ((event.metaKey || event.ctrlKey) && !event.altKey && key.toLowerCase() === 'k') {
      event.preventDefault()
      actions.onPalette()
      return
    }

    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
    if (isTypingTarget(event.target)) return

    if (pendingGAt !== null && now() - pendingGAt <= SEQUENCE_TIMEOUT_MS) {
      pendingGAt = null
      const item = findNavItemByShortcut(key.toLowerCase())
      if (item) {
        event.preventDefault()
        actions.onNavigate(item.path)
      }
      return
    }
    pendingGAt = null

    if (key === 'g' || key === 'G') {
      pendingGAt = now()
    } else if (key === '/') {
      event.preventDefault()
      actions.onPalette()
    } else if (key === '?') {
      event.preventDefault()
      actions.onHelp()
    } else if (key === '[') {
      event.preventDefault()
      actions.onToggleSidebar()
    }
  }
}

export function useGlobalShortcuts(actions) {
  const actionsRef = useRef(actions)

  useEffect(() => {
    actionsRef.current = actions
  })

  useEffect(() => {
    const handler = createShortcutHandler({
      onPalette: () => actionsRef.current.onPalette(),
      onHelp: () => actionsRef.current.onHelp(),
      onToggleSidebar: () => actionsRef.current.onToggleSidebar(),
      onNavigate: (path) => actionsRef.current.onNavigate(path),
    })
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

export const GLOBAL_SHORTCUTS = [
  { keys: ['mod', 'K'], label: 'Open command palette' },
  { keys: ['/'], label: 'Search' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['['], label: 'Collapse or expand the sidebar' },
  { keys: ['Esc'], label: 'Close the open dialog or panel' },
]
