import { useRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PlaceholderField } from './PlaceholderField'

function Harness({ initial = '' }) {
  const [value, setValue] = useState(initial)
  const ref = useRef(null)
  return (
    <>
      <PlaceholderField ref={ref} aria-label="Subject" value={value} onChange={setValue} />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => ref.current.insert('company_name')}>
        Insert company
      </button>
    </>
  )
}

describe('PlaceholderField', () => {
  it('inserts a picked variable at the caret, not at the end', async () => {
    const user = userEvent.setup()
    render(<Harness initial="Hello  team" />)
    const input = screen.getByRole('textbox', { name: 'Subject' })

    await user.click(input)
    input.setSelectionRange(6, 6)
    input.dispatchEvent(new Event('select', { bubbles: true }))
    await user.click(screen.getByRole('button', { name: 'Insert company' }))

    expect(input).toHaveValue('Hello {{company_name}} team')
    expect(input.selectionStart).toBe(6 + '{{company_name}}'.length)
  })

  it('opens the variable list on {{ and inserts the chosen key with Enter', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: 'Subject' })

    await user.type(input, 'Hi {{{{rec')
    const list = screen.getByRole('listbox', { name: 'Variables' })
    expect(list).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-activedescendant')

    await user.keyboard('{Enter}')
    expect(input).toHaveValue('Hi {{recruiter_name}}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the list with Escape and keeps the typed text', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: 'Subject' })

    await user.type(input, '{{{{')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('{{')
  })
})
