import { useEffect } from 'react'
import { CheckIcon, FlaskConicalIcon, MailIcon, SheetIcon, ShieldCheckIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { StepProgress, StepRail } from '@/components/common/Stepper'
import { WithReason } from '@/components/common/WithReason'
import { MockBadge } from '@/components/global/MockBadge'
import { Button } from '@/components/ui/button'
import { useAuth, useWorkspace } from '@/context/app-contexts'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'google', label: 'Connect Google' },
  { id: 'sheet', label: 'Choose your sheet' },
  { id: 'done', label: 'Ready' },
]

const PROMISES = [
  {
    icon: SheetIcon,
    title: 'Your sheet stays the source of truth',
    text: 'Applications are read from your Google Sheet. Status is written back to it.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Nothing sends without you',
    text: 'Every campaign shows each email first and waits for your confirmation.',
  },
  {
    icon: MailIcon,
    title: 'Sent from your Gmail',
    text: 'Emails go out from your own account, one at a time, at a pace you set.',
  },
]

export default function WelcomePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isDesktop = useMediaQuery(MEDIA.md)
  const { isMock, connected, setScenario } = useWorkspace()

  const index = Math.max(
    0,
    STEPS.findIndex((item) => item.id === params.get('step')),
  )
  const step = STEPS[index]
  const go = (id) => setParams(id === 'welcome' ? {} : { step: id })
  const auth = useAuth()
  const { prepare, live } = auth
  const googleReason = isMock ? null : auth.disabledReason
  const googleBusy = auth.status === 'requesting'
  useEffect(() => {
    if (step.id === 'google' && !isMock && !live) prepare()
  }, [step.id, isMock, live, prepare])
  const continueWithGoogle = async () => {
    if (isMock || live || (await auth.connect())) go('sheet')
  }
  const googleLabel = isMock
    ? 'Continue with mock account'
    : live
      ? 'Continue'
      : googleBusy
        ? 'Connecting'
        : auth.hint
          ? `Continue as ${auth.hint}`
          : 'Continue with Google'
  const steps = STEPS.map((item, i) => ({ ...item, complete: i < index, reachable: i <= index }))

  const finish = () => {
    if (isMock && !connected) setScenario('populated')
    navigate('/', { replace: true })
  }

  let body
  if (step.id === 'welcome') {
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Email recruiters from your job sheet, carefully.
          </h1>
          <p className="text-md text-pretty text-muted-foreground">
            Setup takes about two minutes. You need a Google account and a sheet of applications.
          </p>
        </div>
        <ul className="flex flex-col gap-4">
          {PROMISES.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border">
                <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => go('google')}>Get started</Button>
          <Button asChild variant="ghost">
            <Link to="/">Skip for now</Link>
          </Button>
        </div>
      </>
    )
  } else if (step.id === 'google') {
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Connect your Google account</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Google will ask to let JobApply use your sheet and send email as you. A refresh keeps
            you signed in until that session expires, about an hour. Closing the tab ends it.
          </p>
        </div>
        {isMock && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            Mock mode: continuing does not contact Google.
          </p>
        )}
        <ul className="flex flex-col gap-1 text-sm">
          <li className="font-medium">Permissions requested</li>
          <li className="text-muted-foreground">See and edit your Google Sheets</li>
          <li className="text-muted-foreground">Send email as you (it can't read your inbox)</li>
        </ul>
        {live && (
          <p className="flex items-center gap-2 text-sm">
            <CheckIcon className="size-4 text-success" aria-hidden="true" />
            Connected as {auth.user?.email}
          </p>
        )}
        {auth.status === 'partial' && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            Some permissions were not granted. You can continue, but syncing and sending need them.{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={auth.grantMissing}
            >
              Grant permissions
            </button>
          </p>
        )}
        {auth.error && !live && !isMock && <p className="text-sm text-destructive">{auth.error}</p>}
        <div className="flex flex-wrap gap-2">
          <WithReason reason={live ? null : googleReason} label={googleLabel}>
            <Button
              onClick={continueWithGoogle}
              disabled={!live && (Boolean(googleReason) || googleBusy)}
            >
              {googleLabel}
            </Button>
          </WithReason>
          <Button variant="ghost" onClick={() => go('welcome')}>
            Back
          </Button>
        </div>
      </>
    )
  } else if (step.id === 'sheet') {
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Choose your job sheet</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Paste the link to the sheet you track applications in, pick the tab, and match its
            columns. You can change this later in Google Sheets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/sheets/setup">Set up sheet</Link>
          </Button>
          {isMock && (
            <Button variant="outline" onClick={() => go('done')}>
              Use mock sheet
            </Button>
          )}
          <Button variant="ghost" onClick={() => go('google')}>
            Back
          </Button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <span className="flex size-10 items-center justify-center rounded-full bg-success/10">
          <CheckIcon className="size-5 text-success" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">You're set up</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Next: run Sync now to import your rows, then start a campaign. Syncing never sends
            email.
          </p>
        </div>
        <Button onClick={finish} className="self-start">
          Go to dashboard
        </Button>
      </>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas md:flex-row">
      {isDesktop ? (
        <aside className="flex w-72 shrink-0 flex-col gap-8 border-r bg-background p-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span
              className="flex size-6 items-center justify-center rounded-md bg-brand text-xs text-brand-foreground"
              aria-hidden="true"
            >
              J
            </span>
            JobApply
          </p>
          <StepRail steps={steps} currentId={step.id} onSelect={go} label="Setup steps" />
          <MockBadge className="mt-auto self-start" />
        </aside>
      ) : (
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 pt-safe">
          <p className="flex h-12 items-center gap-2 text-sm font-semibold">
            <span
              className="flex size-6 items-center justify-center rounded-md bg-brand text-xs text-brand-foreground"
              aria-hidden="true"
            >
              J
            </span>
            JobApply
          </p>
          <MockBadge compact />
        </header>
      )}
      <main
        id="main-content"
        className="flex flex-1 items-start justify-center px-4 py-8 pb-safe md:items-center md:px-10"
      >
        <div className="flex w-full max-w-lg flex-col gap-6">
          {!isDesktop && <StepProgress steps={steps} currentId={step.id} />}
          {body}
        </div>
      </main>
    </div>
  )
}
