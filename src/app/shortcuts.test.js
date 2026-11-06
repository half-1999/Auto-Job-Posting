import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createShortcutHandler, isTypingTarget } from './shortcuts'

function press(handler, key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...options })
  Object.defineProperty(event, 'target', { value: options.target ?? document.body })
  handler(event)
  return event
}

describe('createShortcutHandler', () => {
  let actions
  let clock
  let handler

  beforeEach(() => {
    actions = {
      onPalette: vi.fn(),
      onHelp: vi.fn(),
      onToggleSidebar: vi.fn(),
      onNavigate: vi.fn(),
    }
    clock = 0
    handler = createShortcutHandler(actions, () => clock)
  })

  it('opens the palette with Ctrl+K, Cmd+K, and slash', () => {
    press(handler, 'k', { ctrlKey: true })
    press(handler, 'k', { metaKey: true })
    press(handler, '/')
    expect(actions.onPalette).toHaveBeenCalledTimes(3)
  })

  it('navigates on G then a page key within the timeout', () => {
    press(handler, 'g')
    clock = 500
    press(handler, 'a')
    expect(actions.onNavigate).toHaveBeenCalledWith('/applications')
  })

  it('ignores the second key after the sequence times out', () => {
    press(handler, 'g')
    clock = 1500
    press(handler, 'a')
    expect(actions.onNavigate).not.toHaveBeenCalled()
  })

  it('handles help and sidebar keys', () => {
    press(handler, '?', { shiftKey: true })
    press(handler, '[')
    expect(actions.onHelp).toHaveBeenCalledOnce()
    expect(actions.onToggleSidebar).toHaveBeenCalledOnce()
  })

  it('stays out of the way while typing, except for Ctrl+K', () => {
    const input = document.createElement('input')
    document.body.append(input)
    press(handler, '/', { target: input })
    press(handler, 'g', { target: input })
    press(handler, 'a', { target: input })
    expect(actions.onPalette).not.toHaveBeenCalled()
    expect(actions.onNavigate).not.toHaveBeenCalled()

    press(handler, 'k', { ctrlKey: true, target: input })
    expect(actions.onPalette).toHaveBeenCalledOnce()
    input.remove()
  })
})

describe('isTypingTarget', () => {
  it('treats fields, editable regions, and open dialogs as typing contexts', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.append(button)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')

    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(editable)).toBe(true)
    expect(isTypingTarget(button)).toBe(true)
    expect(isTypingTarget(document.body)).toBe(false)
  })
})
