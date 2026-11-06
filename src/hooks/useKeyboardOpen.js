import { useEffect, useState } from 'react'

/** True while a virtual keyboard covers part of the viewport (visualViewport shrinks a lot). */
export function useKeyboardOpen(threshold = 150) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const update = () => setOpen(window.innerHeight - viewport.height > threshold)
    viewport.addEventListener('resize', update)
    return () => viewport.removeEventListener('resize', update)
  }, [threshold])

  return open
}
