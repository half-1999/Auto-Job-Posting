import { useState } from 'react'
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataTable, FacetFilter, inSet } from './DataTable'

const DATA = [
  { id: 'r1', company: 'Acme', status: 'Applied' },
  { id: 'r2', company: 'Globex', status: 'Interviewing' },
  { id: 'r3', company: 'Initech', status: 'Applied' },
  { id: 'r4', company: 'Umbrella', status: 'Rejected' },
  { id: 'r5', company: 'Hooli', status: 'Applied' },
]

const COLUMNS = [
  { id: 'company', accessorKey: 'company', header: 'Company' },
  { id: 'status', accessorKey: 'status', header: 'Status', filterFn: inSet },
]

function Harness({ onRowOpen, onEmail, onSelection }) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnFilters, setColumnFilters] = useState([])
  const table = useReactTable({
    data: DATA,
    columns: COLUMNS,
    state: { rowSelection, columnFilters },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: (updater) =>
      setRowSelection((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        onSelection?.(next)
        return next
      }),
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })
  return (
    <TooltipProvider>
      <FacetFilter column={table.getColumn('status')} title="Filter status" options={['Applied', 'Interviewing', 'Rejected']} />
      <DataTable
        table={table}
        label="Companies"
        selectable
        onRowOpen={onRowOpen}
        onEmail={onEmail}
        rowLabel={(row) => row.original.company}
      />
    </TooltipProvider>
  )
}

const bodyRows = () => within(screen.getByRole('table', { name: 'Companies' })).getAllByRole('row').slice(1)

describe('DataTable', () => {
  it('selects a range with Shift-click on a checkbox', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('checkbox', { name: 'Select Globex' }))
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('checkbox', { name: 'Select Umbrella' }))
    await user.keyboard('{/Shift}')

    for (const name of ['Globex', 'Initech', 'Umbrella']) {
      expect(screen.getByRole('checkbox', { name: `Select ${name}` })).toBeChecked()
    }
    expect(screen.getByRole('checkbox', { name: 'Select Acme' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Select Hooli' })).not.toBeChecked()
  })

  it('moves row focus with the arrow keys, toggles with Space, opens with Enter, emails with e', async () => {
    const user = userEvent.setup()
    const onRowOpen = vi.fn()
    const onEmail = vi.fn()
    render(<Harness onRowOpen={onRowOpen} onEmail={onEmail} />)

    const rows = bodyRows()
    expect(rows[0]).toHaveAttribute('tabindex', '0')
    rows[0].focus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(bodyRows()[2]).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Select Initech' })).toBeChecked()

    await user.keyboard('{End}')
    expect(bodyRows()[4]).toHaveFocus()
    await user.keyboard('{Home}{Enter}')
    expect(onRowOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }))

    await user.keyboard('e')
    expect(onEmail).toHaveBeenCalledTimes(1)
  })

  it('filters rows with a faceted filter and shows counts', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Filter status' }))
    const option = await screen.findByRole('menuitemcheckbox', { name: /Applied/ })
    expect(option).toHaveTextContent('3')
    await user.click(option)
    await user.keyboard('{Escape}')

    expect(bodyRows().map((row) => row.textContent)).toEqual(['AcmeApplied', 'InitechApplied', 'HooliApplied'])
  })
})
