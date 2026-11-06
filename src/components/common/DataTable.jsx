import { useRef, useState } from 'react'
import { flexRender } from '@tanstack/react-table'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ListFilterIcon,
  Settings2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { selectRange } from '@/lib/selection'
import { cn } from '@/lib/utils'

/** Column filter for faceted checklists: the row's value must be one of the selected values. */
export function inSet(row, columnId, value) {
  return !value?.length || value.includes(row.getValue(columnId))
}
inSet.autoRemove = (value) => !value?.length

const INTERACTIVE = 'button, a, input, select, textarea, [role="combobox"], [data-row-ignore]'

/**
 * Renders a TanStack table instance owned by the page.
 * Keyboard (docs/UI_UX_PLAN.md §6): ↑/↓ move row focus, Home/End jump, ↵ opens, Space or x
 * toggles selection, e runs `onEmail`. Shift-click on a checkbox or row selects a range.
 */
export function DataTable({
  table,
  label,
  onRowOpen,
  onEmail,
  selectable = false,
  density = 'comfortable',
  rowLabel = (row) => row.id,
  className,
}) {
  const rows = table.getRowModel().rows
  const [focusIndex, setFocusIndex] = useState(0)
  const anchorRef = useRef(null)
  const bodyRef = useRef(null)
  const activeIndex = Math.min(focusIndex, Math.max(rows.length - 1, 0))
  const cellY = density === 'compact' ? 'py-1.5' : 'py-2.5'

  const toggle = (row, shiftKey) => {
    const value = !row.getIsSelected()
    if (shiftKey && anchorRef.current) {
      const ids = rows.map((item) => item.id)
      table.setRowSelection((current) => selectRange(ids, anchorRef.current, row.id, value, current))
    } else {
      row.toggleSelected(value)
    }
    anchorRef.current = row.id
  }

  const focusRow = (index) => {
    const target = Math.max(0, Math.min(index, rows.length - 1))
    setFocusIndex(target)
    bodyRef.current?.querySelectorAll(':scope > tr')[target]?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.target.tagName !== 'TR' || event.metaKey || event.ctrlKey || event.altKey) return
    const row = rows[activeIndex]
    const actions = {
      ArrowDown: () => focusRow(activeIndex + 1),
      ArrowUp: () => focusRow(activeIndex - 1),
      Home: () => focusRow(0),
      End: () => focusRow(rows.length - 1),
      Enter: () => row && onRowOpen?.(row),
      ' ': () => selectable && row && toggle(row, event.shiftKey),
      x: () => selectable && row && toggle(row, event.shiftKey),
      e: () => onEmail?.(),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const handleRowClick = (event, row, index) => {
    if (event.target.closest(INTERACTIVE)) return
    setFocusIndex(index)
    if (selectable && event.shiftKey) {
      event.preventDefault()
      toggle(row, true)
      return
    }
    onRowOpen?.(row)
  }

  const allSelected = table.getIsAllPageRowsSelected()
  const someSelected = table.getIsSomePageRowsSelected()

  return (
    <div className={cn('relative min-h-0 overflow-auto', className)}>
      <table aria-label={label} className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {selectable && (
                <th scope="col" className="w-11 border-b pr-1 pl-4 text-left md:pl-6 xl:pl-8">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
                  />
                </th>
              )}
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const meta = header.column.columnDef.meta ?? {}
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'h-9 border-b px-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground last:pr-4 md:last:pr-6',
                      meta.headerClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="-mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                        ) : sorted === 'desc' ? (
                          <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronsUpDownIcon className="size-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody ref={bodyRef} onKeyDown={handleKeyDown}>
          {rows.map((row, index) => {
            const selected = row.getIsSelected()
            return (
              <tr
                key={row.id}
                tabIndex={index === activeIndex ? 0 : -1}
                data-state={selected ? 'selected' : undefined}
                onFocus={(event) => event.target === event.currentTarget && setFocusIndex(index)}
                onClick={(event) => handleRowClick(event, row, index)}
                className={cn(
                  'group/row outline-none transition-colors duration-(--dur-fast) focus-visible:bg-muted focus-visible:shadow-[inset_2px_0_0_var(--ring)]',
                  onRowOpen && 'cursor-pointer',
                  selected ? 'bg-accent' : 'hover:bg-muted/60',
                )}
              >
                {selectable && (
                  <td className={cn('border-b pr-1 pl-4 align-top md:pl-6 xl:pl-8', cellY)}>
                    <Checkbox
                      tabIndex={-1}
                      aria-label={`Select ${rowLabel(row)}`}
                      checked={selected}
                      onClick={(event) => {
                        event.preventDefault()
                        toggle(row, event.shiftKey)
                      }}
                      className="mt-0.5"
                    />
                  </td>
                )}
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-b px-3 align-top last:pr-4 md:last:pr-6',
                      cellY,
                      cell.column.columnDef.meta?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DataTablePagination({ table, className }) {
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getPrePaginationRowModel().rows.length
  const from = total ? pageIndex * pageSize + 1 : 0
  const to = Math.min(total, (pageIndex + 1) * pageSize)
  const pageCount = table.getPageCount()

  return (
    <div className={cn('flex items-center justify-between gap-3 text-sm text-muted-foreground', className)}>
      <p aria-live="polite" className="tabular-nums">
        {from} to {to} of {total}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <span className="mr-2 tabular-nums">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}

/** Faceted filter as a checklist menu with counts (from the rows matching the other filters). */
export function FacetFilter({ column, title, options }) {
  const selected = new Set(column.getFilterValue() ?? [])
  const facets = column.getFacetedUniqueValues()

  const toggleValue = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    column.setFilterValue(next.size ? [...next] : undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn(selected.size && 'border-border-strong')}>
          <ListFilterIcon aria-hidden="true" />
          {title}
          {selected.size > 0 && (
            <span className="ml-0.5 rounded-sm bg-muted px-1 text-xs tabular-nums">{selected.size}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{title}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.has(option)}
            onCheckedChange={() => toggleValue(option)}
            onSelect={(event) => event.preventDefault()}
          >
            <span className="flex-1 truncate">{option}</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{facets.get(option) ?? 0}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => column.setFilterValue(undefined)}>Clear filter</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TableViewMenu({ table, density, onDensityChange }) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide())
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2Icon aria-hidden="true" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Columns</DropdownMenuLabel>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(value === true)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.columnDef.meta?.label ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
        {onDensityChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Density</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={density} onValueChange={onDensityChange}>
              <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
