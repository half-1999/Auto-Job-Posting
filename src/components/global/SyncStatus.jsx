import {
  CloudOffIcon,
  FlaskConicalIcon,
  Loader2Icon,
  RefreshCwIcon,
  RefreshCwOffIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TimeAgo } from '@/components/common/TimeAgo'
import { Button } from '@/components/ui/button'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const STATES = {
  synced: { icon: RefreshCwIcon, tone: 'text-muted-foreground', label: 'Synced' },
  mock: { icon: FlaskConicalIcon, tone: 'text-muted-foreground', label: 'Mock data' },
  syncing: { icon: Loader2Icon, tone: 'text-brand animate-spin', label: 'Syncing' },
  failed: { icon: TriangleAlertIcon, tone: 'text-warning', label: 'Sync failed' },
  offline: { icon: CloudOffIcon, tone: 'text-warning', label: 'Offline' },
  never: { icon: RefreshCwIcon, tone: 'text-muted-foreground', label: 'Not synced yet' },
  'not-connected': {
    icon: RefreshCwOffIcon,
    tone: 'text-muted-foreground',
    label: 'No sheet connected',
  },
}

function describe(sync) {
  const state = STATES[sync.status] ?? STATES['not-connected']
  return { ...state, hasTime: sync.status === 'synced' && sync.syncedAt }
}

function Label({ sync, state }) {
  if (state.hasTime) {
    return (
      <>
        Synced <TimeAgo value={sync.syncedAt} />
      </>
    )
  }
  if (sync.status === 'offline' && sync.syncedAt) {
    return (
      <>
        Offline · last synced <TimeAgo value={sync.syncedAt} />
      </>
    )
  }
  return state.label
}

/** Sidebar footer row. Until Sheets is connected it opens the Google Sheets page. */
export function SyncStatusRow({ sync }) {
  const navigate = useNavigate()
  const state = describe(sync)
  const Icon = state.icon

  return (
    <SidebarMenuButton
      size="sm"
      onClick={() => navigate('/sheets')}
      tooltip={state.label}
      className="text-muted-foreground"
    >
      <Icon className={cn('size-3.5!', state.tone)} aria-hidden="true" />
      <span className="truncate" aria-live="polite">
        <Label sync={sync} state={state} />
      </span>
    </SidebarMenuButton>
  )
}

/** Compact header glyph on phones. */
export function SyncStatusGlyph({ sync }) {
  const navigate = useNavigate()
  const state = describe(sync)
  const Icon = state.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/sheets')}
          aria-label={`Sync status: ${state.label}`}
        >
          <Icon className={state.tone} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{state.label}</TooltipContent>
    </Tooltip>
  )
}
