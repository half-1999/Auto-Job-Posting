import { useState } from 'react'
import {
  BellIcon,
  CircleAlertIcon,
  DownloadIcon,
  MessageSquareReplyIcon,
  RefreshCwIcon,
  SendIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TimeAgo } from '@/components/common/TimeAgo'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useNotifications } from '@/context/NotificationContext'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

const TYPE_ICONS = {
  campaign: SendIcon,
  reply: MessageSquareReplyIcon,
  sync: RefreshCwIcon,
  update: DownloadIcon,
  error: CircleAlertIcon,
}

function NotificationList({ onNavigate }) {
  const { items, markRead, markAllRead, clear, unreadCount } = useNotifications()

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-sm font-semibold">Notifications</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
          <Button variant="ghost" size="xs" onClick={clear} disabled={items.length === 0}>
            Clear
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-6 pt-6 pb-8 text-center text-sm text-pretty text-muted-foreground">
          Nothing yet. Sync results, finished campaigns, and new replies show up here.
        </p>
      ) : (
        <ul className="max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain border-t p-1">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? BellIcon
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(item.id)
                    if (item.href) onNavigate(item.href)
                  }}
                  className="flex w-full gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      item.type === 'error' ? 'text-destructive' : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('text-sm', !item.readAt && 'font-medium')}>
                      {item.title}
                    </span>
                    {item.body && (
                      <span className="text-xs text-muted-foreground">{item.body}</span>
                    )}
                    <TimeAgo value={item.createdAt} className="text-xs text-subtle-foreground" />
                  </span>
                  {!item.readAt && <span className="sr-only">Unread</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function BellButton({ unreadCount, ...props }) {
  const label = unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'
  return (
    <Button variant="ghost" size="icon" aria-label={label} className="relative" {...props}>
      <BellIcon aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground tabular-nums pointer-coarse:top-1.5 pointer-coarse:right-1.5"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  )
}

export function NotificationCenter() {
  const { unreadCount } = useNotifications()
  const isDesktop = useMediaQuery(MEDIA.md)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const go = (href) => {
    setOpen(false)
    navigate(href)
  }

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {unreadCount ? `${unreadCount} unread notifications` : ''}
      </span>
      {isDesktop ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <BellButton unreadCount={unreadCount} />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <NotificationList onNavigate={go} />
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <BellButton unreadCount={unreadCount} onClick={() => setOpen(true)} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="bottom" className="gap-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Notifications</SheetTitle>
                <SheetDescription>Events from this device</SheetDescription>
              </SheetHeader>
              <NotificationList onNavigate={go} />
            </SheetContent>
          </Sheet>
        </>
      )}
    </>
  )
}
