import { Suspense, useId, useState } from 'react'
import { ChartColumnIcon, TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/**
 * A titled chart with a one-sentence summary and a "View as table" alternative.
 * Screens under 360 px always get the table. Chart children may be lazy; height is reserved.
 */
export function ChartFrame({
  title,
  summary,
  columns,
  rows,
  actions,
  chartClassName = 'h-[180px] md:h-[240px]',
  children,
  className,
}) {
  const id = useId()
  const narrow = useMediaQuery('(max-width: 359px)')
  const [asTable, setAsTable] = useState(false)
  const showTable = asTable || narrow

  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {!narrow && (
            <Button variant="ghost" size="sm" aria-pressed={asTable} onClick={() => setAsTable((value) => !value)}>
              {asTable ? <ChartColumnIcon aria-hidden="true" /> : <TableIcon aria-hidden="true" />}
              {asTable ? 'View as chart' : 'View as table'}
            </Button>
          )}
        </div>
      </div>
      {summary && <p className="text-sm text-pretty text-muted-foreground">{summary}</p>}
      {showTable ? (
        <DataTableFallback caption={title} columns={columns} rows={rows} />
      ) : (
        <div className={cn('min-w-0', chartClassName)} aria-hidden="true">
          <Suspense fallback={<Skeleton className="size-full" />}>{children}</Suspense>
        </div>
      )}
    </section>
  )
}

function DataTableFallback({ caption, columns, rows }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-background">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-8 border-b px-3 text-xs font-medium text-muted-foreground',
                  column.numeric ? 'text-right' : 'text-left',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key ?? index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'border-b px-3 py-1.5 whitespace-nowrap',
                    column.numeric && 'text-right tabular-nums',
                  )}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
