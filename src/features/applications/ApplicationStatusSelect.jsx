import { toast } from 'sonner'
import { getStatusTone } from '@/lib/statusTones'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWorkspace } from '@/context/app-contexts'
import { APPLICATION_STATUS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useWriteReason } from './useWriteReason'

const DOT = {
  neutral: 'bg-muted-foreground/50',
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

export function StatusDot({ status }) {
  return <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', DOT[getStatusTone(status)])} />
}

/**
 * Inline Application Status editor. The change is written to the row's Application Status cell,
 * found by its Application ID. In mock mode it is kept in memory and the toast says so.
 */
export function ApplicationStatusSelect({ application, size = 'sm', className }) {
  const { isMock, updateApplications } = useWorkspace()
  const reason = useWriteReason()
  const value = application.applicationStatus || APPLICATION_STATUS.notApplied

  const change = async (next) => {
    if (next === value) return
    const saved = await updateApplications([application.id], { applicationStatus: next })
    if (saved === false) return
    toast.success(`${application.companyName}: ${next}`, {
      description: isMock ? 'Mock data only. Your sheet was not changed.' : 'Saved to your sheet.',
    })
  }

  return (
    <Select value={value} onValueChange={change} disabled={Boolean(reason)}>
      <SelectTrigger
        size={size}
        aria-label={`Application status for ${application.companyName}`}
        title={reason ?? undefined}
        className={cn('w-36 border-transparent bg-transparent hover:bg-muted', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {Object.values(APPLICATION_STATUS).map((status) => (
          <SelectItem key={status} value={status}>
            <StatusDot status={status} />
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
