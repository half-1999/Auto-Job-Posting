import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const SHOW_AFTER_MS = 150

/** Suspense fallback for lazy routes. Hidden for fast loads so cached chunks never flash. */
export function RouteFallback() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(id)
  }, [])

  if (!visible) return null

  return (
    <div role="status" aria-label="Loading page" className="relative">
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
        <div className="h-full w-1/3 animate-route-progress bg-brand" />
      </div>
      <div className="hidden h-13 items-center border-b px-6 md:flex xl:px-8">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-6 md:px-6 xl:px-8">
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  )
}
