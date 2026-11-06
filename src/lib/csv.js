/**
 * RFC 4180 CSV. Cells that a spreadsheet would run as a formula (= + - @, tab, CR) are
 * prefixed with an apostrophe so an exported file can't execute anything when opened.
 */
export function toCsv(rows, columns) {
  const escape = (value) => {
    let text = value == null ? '' : String(value)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = columns.map((column) => escape(column.label)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escape(column.value ? column.value(row) : row[column.key])).join(','),
  )
  return [header, ...body].join('\r\n')
}

/** Excel and Google Sheets need a UTF-8 BOM to keep non-ASCII characters (AC-14). */
export function withCsvBom(contents) {
  return contents.startsWith('\uFEFF') ? contents : `\uFEFF${contents}`
}

export function downloadFile(filename, contents, type = 'text/csv;charset=utf-8') {
  const payload = type.startsWith('text/csv') ? withCsvBom(contents) : contents
  const blob = new Blob([payload], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
