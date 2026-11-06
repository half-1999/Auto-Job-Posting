import { useState } from 'react'
import { DownloadIcon, ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { WithReason } from '@/components/common/WithReason'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/app-contexts'
import { downloadFile } from '@/lib/csv'
import { SAMPLE_SHEET_TITLE, SAMPLE_TAB_TITLE, sampleSheetCsv, sampleSheetTable } from '@/lib/sampleSheet'
import { createSpreadsheet } from '@/services/sheetsService'

export function SampleSheet({ onCreated }) {
  const { live, disabledReason } = useAuth()
  const [busy, setBusy] = useState(false)
  const { headers, row } = sampleSheetTable()
  const openReason = disabledReason ?? (live ? null : 'Connect Google first')

  const openInSheets = async () => {
    const popup = window.open('about:blank', '_blank')
    setBusy(true)
    try {
      const sheet = await createSpreadsheet({
        title: SAMPLE_SHEET_TITLE,
        sheets: [{ title: SAMPLE_TAB_TITLE, rows: [headers, row] }],
      })
      if (popup) popup.location.href = sheet.url
      else window.open(sheet.url, '_blank', 'noopener')
      onCreated?.(sheet.url)
      toast.success('Sample sheet opened', {
        description: 'Edit the sample row, then paste the sheet link here to connect it.',
      })
    } catch (error) {
      popup?.close()
      toast.error("Couldn't create the sample sheet", {
        description: error?.userMessage ?? 'Try the CSV download instead.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Sample sheet" className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">Sample sheet</h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Copy these headers. Company Name, Recruiter Email, and Job Title are required. Leave
          Application ID empty. Replace the sample row, then connect the sheet.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto rounded-md border">
        <table className="w-max text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-2 py-1.5 font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {row.map((cell, index) => (
                <td key={headers[index]} className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                  {cell || 'blank'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadFile('jobapply-sample-sheet.csv', sampleSheetCsv())}
        >
          <DownloadIcon aria-hidden="true" />
          Download CSV
        </Button>
        <WithReason reason={busy ? null : openReason} label="Open sample in Google Sheets">
          <Button type="button" size="sm" onClick={openInSheets} disabled={Boolean(openReason) || busy}>
            <ExternalLinkIcon aria-hidden="true" />
            {busy ? 'Opening' : 'Open in Google Sheets'}
          </Button>
        </WithReason>
      </div>
    </section>
  )
}
