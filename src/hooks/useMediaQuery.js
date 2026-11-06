import { useCallback, useSyncExternalStore } from 'react'

export const MEDIA = {
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  coarse: '(pointer: coarse)',
}

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
