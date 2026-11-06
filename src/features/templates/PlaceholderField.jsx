import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getCaretCoordinates } from '@/lib/caretPosition'
import { filterVariables, findPlaceholderTrigger, insertPlaceholder } from '@/lib/templateEngine'
import { cn } from '@/lib/utils'

const LIST_WIDTH = 280

/**
 * Input or textarea that opens the variable list at the caret when the user types `{{`.
 * ↑/↓ choose, ↵ or Tab insert, Esc closes. The ref exposes `insert(key)`, which inserts at the
 * last known selection (used by the Insert variable button and sheet).
 */
export const PlaceholderField = forwardRef(function PlaceholderField(
  { multiline = false, value, onChange, sampleValues = {}, className, onKeyDown, onBlur, ...props },
  ref,
) {
  const listId = useId()
  const elementRef = useRef(null)
  const wrapperRef = useRef(null)
  const selectionRef = useRef({ start: value.length, end: value.length })
  const pendingCaret = useRef(null)
  const [trigger, setTrigger] = useState(null)
  const [active, setActive] = useState(0)
  const options = trigger ? filterVariables(trigger.query) : []
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0))

  useLayoutEffect(() => {
    if (pendingCaret.current == null || !elementRef.current) return
    const caret = pendingCaret.current
    pendingCaret.current = null
    elementRef.current.focus()
    elementRef.current.setSelectionRange(caret, caret)
    selectionRef.current = { start: caret, end: caret }
  })

  const rememberSelection = () => {
    const element = elementRef.current
    if (element) selectionRef.current = { start: element.selectionStart, end: element.selectionEnd }
  }

  const updateTrigger = (nextValue, caret) => {
    const found = findPlaceholderTrigger(nextValue, caret)
    if (!found) {
      setTrigger(null)
      return
    }
    const element = elementRef.current
    const coords = getCaretCoordinates(element, found.start)
    const width = wrapperRef.current?.clientWidth ?? LIST_WIDTH
    setTrigger({
      ...found,
      top: coords.top + coords.height + 4,
      left: Math.max(0, Math.min(coords.left, width - LIST_WIDTH)),
    })
    setActive(0)
  }

  const apply = (key, replaceFrom = null) => {
    const { start, end } = selectionRef.current
    const result = insertPlaceholder(value, start, end, key, replaceFrom)
    pendingCaret.current = result.caret
    setTrigger(null)
    onChange(result.value)
  }

  useImperativeHandle(ref, () => ({
    insert: (key) => apply(key),
    focus: () => elementRef.current?.focus(),
  }))

  const handleKeyDown = (event) => {
    if (trigger && options.length) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActive((activeIndex + step + options.length) % options.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        rememberSelection()
        apply(options[activeIndex].key, trigger.start)
        return
      }
    }
    if (trigger && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setTrigger(null)
      return
    }
    onKeyDown?.(event)
  }

  const Field = multiline ? Textarea : Input
  return (
    <div ref={wrapperRef} className="relative">
      <Field
        ref={elementRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          selectionRef.current = { start: event.target.selectionStart, end: event.target.selectionEnd }
          updateTrigger(event.target.value, event.target.selectionStart)
        }}
        onSelect={rememberSelection}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          rememberSelection()
          setTrigger(null)
          onBlur?.(event)
        }}
        aria-autocomplete="list"
        aria-controls={trigger ? listId : undefined}
        aria-activedescendant={trigger && options.length ? `${listId}-${activeIndex}` : undefined}
        className={className}
        {...props}
      />
      {trigger && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Variables"
          style={{ top: trigger.top, left: trigger.left, width: LIST_WIDTH }}
          className="absolute z-50 max-h-60 overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-pop"
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault()
                apply(option.key, trigger.start)
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-default items-center justify-between gap-3 rounded-sm px-2 py-1.5 pointer-coarse:min-h-11',
                index === activeIndex && 'bg-accent',
              )}
            >
              <span className="truncate font-mono text-xs">{option.key}</span>
              <span className="truncate text-xs text-muted-foreground">{sampleValues[option.key] || 'empty'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
