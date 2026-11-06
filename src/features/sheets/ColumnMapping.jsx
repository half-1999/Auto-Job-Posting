import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REQUIRED_FIELDS, SHEET_COLUMNS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const MAPPABLE_FIELDS = [
  { field: 'companyName', label: 'Company name' },
  { field: 'recruiterEmail', label: 'Recruiter email' },
  { field: 'jobTitle', label: 'Job title' },
  { field: 'recruiterName', label: 'Recruiter name' },
  { field: 'jobLink', label: 'Job link' },
  { field: 'applicationStatus', label: 'Application status' },
  { field: 'templateName', label: 'Template name' },
  { field: 'notes', label: 'Notes' },
]

const NONE = '__none'

/** Maps app fields to the user's sheet headers. Required fields are marked and flagged when empty. */
export function ColumnMapping({ headers, value, onChange, showErrors = false, disabled = false }) {
  const usedBy = Object.fromEntries(Object.entries(value).map(([field, header]) => [header, field]))

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {MAPPABLE_FIELDS.map(({ field, label }) => {
        const required = REQUIRED_FIELDS.includes(field)
        const missing = required && !value[field]
        const id = `map-${field}`
        return (
          <li key={field} className="grid gap-1.5 px-4 py-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-center md:gap-4 md:py-2">
            <label htmlFor={id} className="text-sm font-medium">
              {label}
              {required && <span className="ml-1.5 text-xs font-normal text-muted-foreground">Required</span>}
            </label>
            <div className="flex min-w-0 flex-col gap-1">
              <Select
                value={value[field] ?? NONE}
                onValueChange={(header) => {
                  const next = { ...value }
                  if (header === NONE) delete next[field]
                  else {
                    const previous = usedBy[header]
                    if (previous && previous !== field) delete next[previous]
                    next[field] = header
                  }
                  onChange(next)
                }}
                disabled={disabled}
              >
                <SelectTrigger
                  id={id}
                  aria-invalid={showErrors && missing ? true : undefined}
                  aria-describedby={showErrors && missing ? `${id}-error` : undefined}
                  className={cn('w-full md:max-w-sm', !value[field] && 'text-muted-foreground')}
                >
                  <SelectValue placeholder="Not mapped" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not mapped</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                      {usedBy[header] && usedBy[header] !== field && (
                        <span className="text-xs text-muted-foreground"> (used for {MAPPABLE_FIELDS.find((f) => f.field === usedBy[header])?.label ?? SHEET_COLUMNS[usedBy[header]]})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showErrors && missing && (
                <p id={`${id}-error`} className="text-xs text-destructive">
                  Choose the column with the {label.toLowerCase()}.
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
