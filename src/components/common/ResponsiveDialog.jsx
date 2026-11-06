import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/** Centered dialog from `md`, bottom sheet below it. */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
}) {
  const isDesktop = useMediaQuery(MEDIA.md)
  const guard = dismissible ? undefined : (event) => event.preventDefault()

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn('sm:max-w-[480px]', className)}
          showCloseButton={dismissible}
          onEscapeKeyDown={guard}
          onInteractOutside={guard}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn('gap-0', className)}
        showCloseButton={dismissible}
        onEscapeKeyDown={guard}
        onInteractOutside={guard}
      >
        <SheetHeader className="px-4 pt-3 pb-2 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto px-4 pb-2">{children}</div>
        {footer && (
          <SheetFooter className="mt-0 flex-col-reverse gap-2 px-4 pt-2 [&>*]:w-full">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
