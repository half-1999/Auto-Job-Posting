import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { PageBody, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <PageBody>
        <EmptyState
          icon={CompassIcon}
          title="This page doesn't exist"
          description="The link may be old, or the address was mistyped."
          action={
            <Button asChild variant="outline">
              <Link to="/">Go to Dashboard</Link>
            </Button>
          }
        />
      </PageBody>
    </>
  )
}
