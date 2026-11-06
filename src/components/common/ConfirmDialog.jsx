import { useId, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

/**
 * Confirmation for destructive or outbound actions. The confirm label must name the
 * exact effect ("Send 12 emails", "Delete template"). Dismissal is blocked while busy.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  busy = false,
  acknowledgement,
  children,
}) {
  const checkId = useId()
  const [acknowledged, setAcknowledged] = useState(false)
  const blocked = Boolean(acknowledgement) && !acknowledged

  const handleOpenChange = (next) => {
    if (busy) return
    if (!next) setAcknowledged(false)
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      dismissible={!busy}
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={blocked || busy}
          >
            {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {acknowledgement && (
        <div className="flex items-start gap-2.5 py-2">
          <Checkbox
            id={checkId}
            checked={acknowledged}
            onCheckedChange={(value) => setAcknowledged(value === true)}
            disabled={busy}
            className="mt-0.5"
          />
          <Label htmlFor={checkId} className="text-sm leading-5 font-normal">
            {acknowledgement}
          </Label>
        </div>
      )}
    </ResponsiveDialog>
  )
}
