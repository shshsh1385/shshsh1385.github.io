import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DATA } from '../config/data.js'
import { track } from '../config/notify.js'

const AppContext = createContext(null)

const prefersDark =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches !== false

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'fa')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  const t = DATA[lang]
  const isRTL = t.dir === 'rtl'

  useEffect(() => {
    const root = document.documentElement
    root.lang = t.htmlLang
    root.dir = t.dir
    localStorage.setItem('lang', lang)
  }, [lang, t])

  // page view on first load + language switch events (session-deduped)
  useEffect(() => {
    const marked = sessionStorage.getItem('pv_' + lang)
    if (!marked) {
      sessionStorage.setItem('pv_' + lang, '1')
      track('page_view', { lang })
    } else {
      track('lang_switch', { lang })
    }
  }, [lang])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const value = useMemo(
    () => ({ lang, setLang, theme, setTheme, t, isRTL }),
    [lang, theme, t, isRTL]
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

// fade-up reveal used by every section
export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: 'easeOut' },
  }),
}
