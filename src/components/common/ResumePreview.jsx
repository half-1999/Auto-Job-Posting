import { useEffect, useState } from 'react'

/** Shows a PDF already stored in this browser. The object URL is dropped when the file changes. */
export function ResumePreview({ file, name = 'resume.pdf' }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!file) return undefined
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  if (!file || !url) return null

  return (
    <iframe
      title={`Preview of ${name}`}
      src={url}
      className="h-96 w-full rounded-md border bg-background"
    />
  )
}
