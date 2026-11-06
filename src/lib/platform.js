export function isApplePlatform(nav = globalThis.navigator) {
  if (!nav) return false
  const platform = nav.userAgentData?.platform ?? nav.platform ?? ''
  return /mac|iphone|ipad|ipod/i.test(platform)
}

/** Label for the primary modifier key in shortcut hints. */
export function modKeyLabel(nav) {
  return isApplePlatform(nav) ? '⌘' : 'Ctrl'
}
