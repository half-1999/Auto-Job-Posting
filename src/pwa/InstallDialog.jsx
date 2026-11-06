import { ShareIcon } from 'lucide-react'
import { useShell } from '@/app/ShellContext'
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import {
  INSTALL_BENEFITS,
  IOS_STEPS,
  manualSteps,
  PWA_NOTE,
  UNSUPPORTED_MESSAGE,
} from './installCopy'
import { useInstallPrompt } from './useInstallPrompt'

export function Steps({ steps, shareIcon = false }) {
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
      {steps.map((step, index) => (
        <li key={step}>
          {step}
          {index === 0 && shareIcon && (
            <ShareIcon
              className="ml-1.5 inline size-4 align-text-bottom text-muted-foreground"
              aria-label="Share icon"
            />
          )}
        </li>
      ))}
    </ol>
  )
}

/** One modal for every platform (WIREFRAMES §10.3 and §10.4). It never promises a prompt the browser can't show. */
export function InstallDialog() {
  const { installOpen, setInstallOpen } = useShell()
  const { status, platform, promptInstall } = useInstallPrompt()
  const close = () => setInstallOpen(false)

  const install = async () => {
    const outcome = await promptInstall()
    if (outcome !== 'dismissed') close()
  }

  let title = 'Install JobApply'
  let body
  let footer

  if (status === 'available') {
    body = <p className="text-sm text-pretty">{INSTALL_BENEFITS}</p>
    footer = (
      <>
        <Button variant="outline" onClick={close}>
          Not now
        </Button>
        <Button onClick={install}>Install app</Button>
      </>
    )
  } else if (status === 'ios-instructions') {
    title = 'Add to Home Screen'
    body = (
      <>
        <Steps steps={IOS_STEPS} shareIcon />
        <p className="text-sm text-pretty text-muted-foreground">
          iPhone and iPad do not show an install prompt for web apps. These steps are the only way
          to install.
        </p>
      </>
    )
    footer = <Button onClick={close}>Got it</Button>
  } else if (status === 'manual') {
    body = (
      <>
        <p className="text-sm text-pretty">{INSTALL_BENEFITS}</p>
        <Steps steps={manualSteps(platform)} />
      </>
    )
    footer = <Button onClick={close}>Got it</Button>
  } else if (status === 'pending') {
    body = <p className="text-sm">Installing. Your browser finishes this in a moment.</p>
    footer = <Button onClick={close}>Close</Button>
  } else if (status === 'installed') {
    body = (
      <p className="text-sm">
        Installed on this device. Open the app from your home screen or dock.
      </p>
    )
    footer = <Button onClick={close}>Close</Button>
  } else {
    body = <p className="text-sm text-pretty">{UNSUPPORTED_MESSAGE}</p>
    footer = <Button onClick={close}>Close</Button>
  }

  return (
    <ResponsiveDialog
      open={installOpen}
      onOpenChange={setInstallOpen}
      title={title}
      footer={footer}
    >
      <div className="flex flex-col gap-3">
        {body}
        <p className="text-sm text-pretty text-muted-foreground">{PWA_NOTE}</p>
      </div>
    </ResponsiveDialog>
  )
}
