import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResponsiveList } from './ResponsiveList'

const ITEMS = Array.from({ length: 7 }, (_, index) => ({ id: `i${index}`, name: `Item ${index + 1}` }))

function Harness({ selectionMode, onOpen }) {
  const [selected, setSelected] = useState(new Set())
  return (
    <ResponsiveList
      items={ITEMS}
      getKey={(item) => item.id}
      label="Items"
      pageSize={5}
      onOpen={onOpen}
      selectionMode={selectionMode}
      isSelected={(item) => selected.has(item.id)}
      onToggle={(item) =>
        setSelected((current) => {
          const next = new Set(current)
          if (next.has(item.id)) next.delete(item.id)
          else next.add(item.id)
          return next
        })
      }
      renderRow={(item) => item.name}
    />
  )
}

describe('ResponsiveList', () => {
  it('opens rows outside selection mode', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<Harness selectionMode={false} onOpen={onOpen} />)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Item 2' }))
    expect(onOpen).toHaveBeenCalledWith(ITEMS[1])
  })

  it('turns rows into checkboxes in selection mode and toggles them instead of opening', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<Harness selectionMode onOpen={onOpen} />)

    const row = screen.getByRole('checkbox', { name: 'Item 3' })
    expect(row).toHaveAttribute('aria-checked', 'false')
    await user.click(row)
    expect(row).toHaveAttribute('aria-checked', 'true')
    await user.click(row)
    expect(row).toHaveAttribute('aria-checked', 'false')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('shows the rest with "Show N more"', async () => {
    const user = userEvent.setup()
    render(<Harness selectionMode={false} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    await user.click(screen.getByRole('button', { name: 'Show 2 more' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    expect(screen.queryByRole('button', { name: /more/ })).not.toBeInTheDocument()
  })
})
