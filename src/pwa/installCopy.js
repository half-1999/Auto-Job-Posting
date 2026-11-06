export const PWA_NOTE =
  'This installs a web app from this site. It is not an APK or app store download.'

export const INSTALL_BENEFITS =
  'Opens in its own window, works offline for browsing your synced data, and adds an icon to your home screen or dock.'

export const IOS_STEPS = [
  "Tap the Share button in Safari's toolbar.",
  'Scroll and tap "Add to Home Screen".',
  'Tap "Add".',
]

/** Browser-menu install steps for platforms without a prompt API (or after a dismissed prompt). */
export function manualSteps(platform) {
  switch (platform) {
    case 'macos-safari':
      return ['Open the File menu in Safari.', 'Choose "Add to Dock".']
    case 'firefox-android':
      return ['Open the browser menu.', 'Tap "Install" or "Add to Home screen".']
    default:
      return [
        'Open the browser menu, or use the install icon in the address bar.',
        'Choose "Install JobApply".',
      ]
  }
}

export const UNSUPPORTED_MESSAGE =
  "Your browser can't install web apps. Open JobApply in Chrome, Edge, or Safari."
