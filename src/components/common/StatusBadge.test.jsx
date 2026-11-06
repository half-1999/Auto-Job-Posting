import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { APPLICATION_STATUS, EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'
import { getStatusTone } from '@/lib/statusTones'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="Replied" />)

    expect(screen.getByText('Replied')).toHaveAttribute('data-tone', 'success')
  })

  it('maps failure statuses to the destructive tone', () => {
    expect(getStatusTone('Failed')).toBe('destructive')
    expect(getStatusTone('Bounced')).toBe('destructive')
    expect(getStatusTone('Rejected')).toBe('destructive')
  })

  it('falls back to neutral for unknown or empty values', () => {
    expect(getStatusTone('Something else')).toBe('neutral')
    render(<StatusBadge status="" />)

    expect(screen.getByText('Not Set')).toHaveAttribute('data-tone', 'neutral')
  })

  it('has an explicit tone for every status defined in constants', () => {
    const all = [
      ...Object.values(APPLICATION_STATUS),
      ...Object.values(EMAIL_STATUS),
      ...Object.values(REPLY_STATUS),
    ]
    const unmapped = all.filter(
      (s) => getStatusTone(s) === 'neutral' && !/^(Not |No Reply|Do Not|Withdrawn|Queued)/.test(s),
    )

    expect(unmapped).toEqual([])
  })
})
