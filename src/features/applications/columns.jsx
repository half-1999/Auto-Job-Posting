import { EllipsisIcon, ExternalLinkIcon, MailIcon, BanIcon, PanelRightOpenIcon, UndoIcon } from 'lucide-react'
import { inSet } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TimeAgo } from '@/components/common/TimeAgo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EMAIL_STATUS } from '@/lib/constants'
import { ApplicationStatusSelect } from './ApplicationStatusSelect'

const byDate = (a, b, id) => {
  const x = a.getValue(id) || ''
  const y = b.getValue(id) || ''
  if (!x && !y) return 0
  if (!x) return -1
  if (!y) return 1
  return x < y ? -1 : x > y ? 1 : 0
}

/**
 * Column definitions. `meta.className` hides lower-priority columns below `lg`, so tablets
 * keep the essentials (Company and Role, Status, Email, Reply).
 */
export function createColumns({ onOpen, onEmail, onToggleDoNotEmail }) {
  return [
    {
      id: 'company',
      accessorKey: 'companyName',
      header: 'Company / Role',
      enableHiding: false,
      meta: { label: 'Company / Role', className: 'min-w-48 max-w-72' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.companyName}</p>
          <p className="truncate text-muted-foreground">{row.original.jobTitle}</p>
        </div>
      ),
    },
    {
      id: 'recruiter',
      accessorFn: (app) => app.recruiterName || app.recruiterEmail,
      header: 'Recruiter',
      meta: { label: 'Recruiter', className: 'max-lg:hidden max-w-64', headerClassName: 'max-lg:hidden' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate">{row.original.recruiterName || <span className="text-muted-foreground">No name</span>}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.original.recruiterEmail}</p>
        </div>
      ),
    },
    {
      id: 'applicationStatus',
      accessorFn: (app) => app.applicationStatus || 'Not Applied',
      header: 'Status',
      filterFn: inSet,
      meta: { label: 'Status' },
      cell: ({ row }) => <ApplicationStatusSelect application={row.original} />,
    },
    {
      id: 'emailStatus',
      accessorFn: (app) => app.emailStatus || EMAIL_STATUS.notSent,
      header: 'Email',
      filterFn: inSet,
      meta: { label: 'Email' },
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    {
      id: 'replyStatus',
      accessorFn: (app) => app.replyStatus || '-',
      header: 'Reply',
      filterFn: inSet,
      meta: { label: 'Reply' },
      cell: ({ getValue }) =>
        getValue() === '-' ? <span className="text-muted-foreground">-</span> : <StatusBadge status={getValue()} />,
    },
    {
      id: 'templateName',
      accessorFn: (app) => app.templateName || 'None',
      header: 'Template',
      filterFn: inSet,
      meta: { label: 'Template', className: 'max-xl:hidden', headerClassName: 'max-xl:hidden' },
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
    },
    {
      id: 'sentDate',
      accessorKey: 'sentDate',
      header: 'Last sent',
      sortingFn: byDate,
      sortUndefined: 'last',
      meta: { label: 'Last sent', className: 'max-lg:hidden whitespace-nowrap text-muted-foreground', headerClassName: 'max-lg:hidden' },
      cell: ({ getValue }) => (getValue() ? <TimeAgo value={getValue()} /> : '-'),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10 text-right', headerClassName: 'w-10' },
      cell: ({ row }) => {
        const app = row.original
        const blocked = app.emailStatus === EMAIL_STATUS.doNotEmail
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${app.companyName}`}>
                <EllipsisIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => onOpen(app)}>
                <PanelRightOpenIcon aria-hidden="true" />
                Open details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEmail([app.id])} disabled={blocked}>
                <MailIcon aria-hidden="true" />
                Email recruiter
              </DropdownMenuItem>
              {app.jobLink && (
                <DropdownMenuItem asChild>
                  <a href={app.jobLink} target="_blank" rel="noreferrer noopener">
                    <ExternalLinkIcon aria-hidden="true" />
                    Open job posting
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onToggleDoNotEmail([app.id], !blocked)}>
                {blocked ? <UndoIcon aria-hidden="true" /> : <BanIcon aria-hidden="true" />}
                {blocked ? 'Allow email again' : 'Mark Do Not Email'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
