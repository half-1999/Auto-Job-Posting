import { describe, expect, it } from 'vitest'
import {
  buildTemplateValues,
  findPlaceholderTrigger,
  insertPlaceholder,
  renderEmail,
  renderTemplate,
} from './templateEngine'

const values = buildTemplateValues(
  { recruiterName: 'Meera Iyer', companyName: 'Razorpay', jobTitle: 'Frontend Engineer II' },
  { name: 'Ananya Rao', portfolio: '' },
)

describe('renderTemplate', () => {
  it('substitutes known placeholders and derives the first name', () => {
    const result = renderTemplate('Hi {{recruiter_first_name}}, {{job_title}} at {{company_name}}', values)
    expect(result.text).toBe('Hi Meera, Frontend Engineer II at Razorpay')
    expect(result.issues).toEqual([])
  })

  it('uses the fallback when the value is empty', () => {
    const empty = buildTemplateValues({}, {})
    const result = renderTemplate('Hi {{recruiter_first_name|there}},', empty)
    expect(result.text).toBe('Hi there,')
    expect(result.segments[1]).toMatchObject({ status: 'fallback', value: 'there' })
    expect(result.issues).toEqual([])
  })

  it('reports empty and unknown placeholders once each and leaves them visible', () => {
    const result = renderTemplate('{{my_portfolio}} {{my_portfolio}} {{salary}}', values)
    expect(result.text).toBe('{{my_portfolio}} {{my_portfolio}} {{salary}}')
    expect(result.issues).toEqual([
      { key: 'my_portfolio', kind: 'empty' },
      { key: 'salary', kind: 'unknown' },
    ])
  })

  it('tolerates spaces inside braces', () => {
    expect(renderTemplate('{{ company_name }}', values).text).toBe('Razorpay')
  })
})

describe('renderEmail', () => {
  it('merges subject and body issues without duplicates', () => {
    const result = renderEmail(
      { subject: '{{my_portfolio}}', body: '{{my_portfolio}} {{my_phone}}' },
      { companyName: 'Razorpay' },
      {},
    )
    expect(result.issues.map((issue) => issue.key)).toEqual(['my_portfolio', 'my_phone'])
  })
})

describe('placeholder insertion', () => {
  it('finds an unfinished {{ trigger before the caret', () => {
    expect(findPlaceholderTrigger('Hi {{rec', 8)).toEqual({ start: 3, query: 'rec' })
    expect(findPlaceholderTrigger('Hi {{recruiter_name}} ', 22)).toBeNull()
    expect(findPlaceholderTrigger('Hi {', 4)).toBeNull()
  })

  it('inserts at the caret, replacing a selection', () => {
    expect(insertPlaceholder('Hi , welcome', 3, 3, 'my_name')).toEqual({
      value: 'Hi {{my_name}}, welcome',
      caret: 14,
    })
    expect(insertPlaceholder('Hi NAME!', 3, 7, 'my_name').value).toBe('Hi {{my_name}}!')
  })

  it('replaces the open trigger text when given', () => {
    expect(insertPlaceholder('Hi {{rec', 8, 8, 'recruiter_first_name', 3)).toEqual({
      value: 'Hi {{recruiter_first_name}}',
      caret: 27,
    })
  })
})
