import * as React from "react"
import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-input bg-background px-2.5 py-1 text-sm transition-[border-color,box-shadow] duration-(--dur-fast) outline-none selection:bg-brand/25 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-subtle-foreground hover:border-border-strong disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:h-11 pointer-coarse:px-3 pointer-coarse:text-md",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
