import { useSyncExternalStore } from 'react'
import { canOfferInstall, getInstallState, promptInstall, subscribeInstall } from './installPrompt'

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribeInstall, getInstallState)
  return { ...state, canOffer: canOfferInstall(state.status), promptInstall }
}
