import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

/**
 * Shown when a route throws. No auth or workspace hooks, so it still renders
 * when those providers are what failed. Native controls keep this out of the button chunk.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`.trim()
    : error instanceof Error
      ? error.message
      : 'This page hit an error.'

  return (
    <div className="flex min-h-[70vh] w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex max-w-md flex-col gap-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-pretty text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground pointer-coarse:h-11 pointer-coarse:px-4"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <a
          href="/"
          className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium pointer-coarse:h-11 pointer-coarse:px-4"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
