import { useId, useRef } from 'react'
import { CodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PlaceholderField } from './PlaceholderField'
import { InsertVariableButton } from './VariablePicker'

const SUBJECT_SOFT_LIMIT = 70

/**
 * Subject and body editors with the variable toolbar. Shared by Templates and the campaign
 * composer. Insert variable targets whichever field was focused last (body by default).
 */
export function TemplateFields({ subject, body, onChange, sampleValues, mono, onMonoChange, disabled = false }) {
  const subjectId = useId()
  const bodyId = useId()
  const countId = useId()
  const subjectRef = useRef(null)
  const bodyRef = useRef(null)
  const lastFocused = useRef('body')

  const insert = (key) => (lastFocused.current === 'subject' ? subjectRef : bodyRef).current?.insert(key)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={subjectId}>Subject</Label>
        <PlaceholderField
          ref={subjectRef}
          id={subjectId}
          value={subject}
          disabled={disabled}
          onChange={(value) => onChange({ subject: value })}
          onFocus={() => (lastFocused.current = 'subject')}
          sampleValues={sampleValues}
          aria-describedby={subject.length > SUBJECT_SOFT_LIMIT ? countId : undefined}
          placeholder="{{job_title}} at {{company_name}}"
        />
        {subject.length > SUBJECT_SOFT_LIMIT && (
          <p id={countId} className="text-xs text-muted-foreground tabular-nums">
            {subject.length} characters. Subjects over {SUBJECT_SOFT_LIMIT} may be cut off in inboxes.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor={bodyId}>Body</Label>
        </div>
        <div
          role="toolbar"
          aria-label="Body tools"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
        >
          <InsertVariableButton onPick={insert} sampleValues={sampleValues} />
          {onMonoChange && (
            <Button variant="ghost" size="sm" aria-pressed={mono} onClick={() => onMonoChange(!mono)}>
              <CodeIcon aria-hidden="true" />
              Mono
            </Button>
          )}
          <p className="ml-auto hidden shrink-0 self-center text-xs text-muted-foreground lg:block">
            Type <kbd className="font-mono">{'{{'}</kbd> to insert a variable
          </p>
        </div>
        <PlaceholderField
          ref={bodyRef}
          id={bodyId}
          multiline
          value={body}
          disabled={disabled}
          onChange={(value) => onChange({ body: value })}
          onFocus={() => (lastFocused.current = 'body')}
          sampleValues={sampleValues}
          placeholder="Hi {{recruiter_first_name|there}},"
          className={cn('min-h-64 field-sizing-content leading-relaxed', mono && 'font-mono text-[13px]')}
        />
      </div>
    </div>
  )
}
