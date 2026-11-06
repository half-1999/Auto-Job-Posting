import { createContext, useContext, useMemo, useState } from 'react'

const ShellContext = createContext(null)

/** Open state for the shell's global overlays, so any page or menu can open them. */
export function ShellProvider({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)

  const value = useMemo(
    () => ({
      paletteOpen,
      setPaletteOpen,
      shortcutsOpen,
      setShortcutsOpen,
      drawerOpen,
      setDrawerOpen,
      installOpen,
      setInstallOpen,
    }),
    [paletteOpen, shortcutsOpen, drawerOpen, installOpen],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell() {
  const context = useContext(ShellContext)
  if (!context) throw new Error('useShell must be used inside ShellProvider')
  return context
}
