import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/context/NotificationContext'
import { useProfile, useSettings, useWorkspace } from '@/context/app-contexts'
import { playBell, showBrowserNotice } from '@/lib/browserNotice'
import { campaignNotices } from './campaignNotices'

/** Keeps the screen awake while a real campaign is sending. Failure is ignored; sending still works. */
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock?.request) return undefined
    let lock = null
    let cancelled = false
    navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (cancelled) sentinel.release()
        else lock = sentinel
      })
      .catch(() => {})
    return () => {
      cancelled = true
      lock?.release()
    }
  }, [active])
}

/**
 * Sends the next real-campaign email when one is running. Going back online does not start it:
 * a paused campaign stays paused until the user confirms Resume.
 */
export function CampaignEngine() {
  const { runs, online, sheetConfig, usage, updateRun, patchApplications, queueSheetWrite, addEmailLog, noteSent } = useWorkspace()
  const { settings } = useSettings()
  const profile = useProfile()
  const { notify } = useNotifications()
  const navigate = useNavigate()
  const lock = useRef(false)
  const generation = useRef(0)
  const statuses = useRef(null)
  const run = Object.values(runs).find((item) => item.mock === false && item.status === 'running')
  const browserNotifications = Boolean(settings.browserNotifications?.enabled)

  useEffect(() => {
    const snapshot = Object.fromEntries(Object.values(runs).map((item) => [item.id, item.status]))
    const notices = campaignNotices(statuses.current, runs)
    statuses.current = snapshot
    for (const notice of notices) {
      notify({ type: 'campaign', title: notice.title, body: notice.body, href: notice.href })
      if (!browserNotifications || !document.hidden) continue
      playBell().then((played) => {
        showBrowserNotice({ ...notice, silent: played, onClick: () => navigate(notice.href) })
      })
    }
  }, [runs, notify, navigate, browserNotifications])

  useEffect(() => {
    if (!run) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [run])

  useWakeLock(Boolean(run))

  useEffect(() => {
    if (!run || !sheetConfig) return undefined
    if (!online) {
      updateRun(run.id, (current) =>
        current.status === 'running' ? { ...current, status: 'paused', pausedReason: 'offline' } : current,
      )
      return undefined
    }
    const token = ++generation.current
    const wait = Math.max(0, (run.nextAt ?? 0) - Date.now())
    const timer = setTimeout(async () => {
      if (generation.current !== token || lock.current) return
      lock.current = true
      try {
        const mod = await import('./sendOne.js')
        await mod.sendNext(
          run,
          mod.liveDeps({
            sheetConfig,
            sentToday: usage.sentToday,
            dailyCap: settings.sending.dailyCap,
            delayMs: settings.sending.delaySeconds * 1000,
            profile,
            now: () => new Date(),
            updateRun,
            patchApplication: (id, patch) => patchApplications([id], patch),
            queueWrite: queueSheetWrite,
            addLog: addEmailLog,
            onSent: noteSent,
          }),
        )
      } finally {
        lock.current = false
      }
    }, wait)
    return () => clearTimeout(timer)
  }, [
    run,
    online,
    sheetConfig,
    usage.sentToday,
    updateRun,
    patchApplications,
    queueSheetWrite,
    addEmailLog,
    noteSent,
    settings.sending.dailyCap,
    settings.sending.delaySeconds,
    profile,
  ])

  return null
}
