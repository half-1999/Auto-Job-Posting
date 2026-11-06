import { FlaskConicalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MOCK_SCENARIOS, useWorkspace } from '@/context/app-contexts'
import { cn } from '@/lib/utils'

/** Visible whenever mock data is on. Also switches the scenario so every page state can be reviewed. */
export function MockBadge({ compact = false, className }) {
  const { isMock, scenario, setScenario } = useWorkspace()
  if (!isMock) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'icon' : 'sm'}
          aria-label={compact ? 'Mock data: choose scenario' : undefined}
          className={cn('border-dashed text-warning', className)}
        >
          <FlaskConicalIcon aria-hidden="true" />
          {!compact && 'Mock data'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs leading-relaxed font-normal text-muted-foreground">
          Mock data for UI review. Nothing is read from or written to Google, and no email is sent.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Scenario</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={scenario} onValueChange={setScenario}>
          {MOCK_SCENARIOS.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
