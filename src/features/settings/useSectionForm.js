import { useState } from 'react'
import { toast } from 'sonner'
import { useSettings } from '@/context/app-contexts'

/** Form sections report `dirty`, `save`, and `discard` so the page can show one save bar. */
export function useSectionForm(section, validate) {
  const { settings, saveSection } = useSettings()
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const values = draft ?? settings[section]
  return {
    values,
    errors,
    dirty: draft != null,
    set: (patch) => setDraft({ ...values, ...patch }),
    discard: () => {
      setDraft(null)
      setErrors({})
    },
    save: () => {
      const found = validate ? validate(values) : {}
      setErrors(found)
      if (Object.keys(found).length) return false
      try {
        saveSection(section, values)
        setDraft(null)
        toast.success('Settings saved')
        return true
      } catch (error) {
        toast.error("Couldn't save settings", { description: error.message })
        return false
      }
    },
  }
}
