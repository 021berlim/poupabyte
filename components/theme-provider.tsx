'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'
type ThemeAttribute = 'class' | `data-${string}`

type ThemeProviderProps = {
 children: React.ReactNode
 attribute?: ThemeAttribute | ThemeAttribute[]
 defaultTheme?: Theme
 disableTransitionOnChange?: boolean
 enableColorScheme?: boolean
 enableSystem?: boolean
 forcedTheme?: Theme
 storageKey?: string
 themes?: Theme[]
}

type ThemeProviderState = {
 forcedTheme?: Theme
 resolvedTheme: ResolvedTheme
 setTheme: React.Dispatch<React.SetStateAction<Theme>>
 systemTheme: ResolvedTheme
 theme: Theme
 themes: Theme[]
}

const DEFAULT_THEMES: Theme[] = ['light', 'dark']
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

const ThemeContext = React.createContext<ThemeProviderState | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
 if (typeof window === 'undefined') return 'light'
 return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light'
}

function normalizeTheme(value: string | null | undefined, defaultTheme: Theme, enableSystem: boolean) {
 if (value === 'light' || value === 'dark') return value
 if (value === 'system' && enableSystem) return value
 return defaultTheme === 'system' && !enableSystem ? 'light' : defaultTheme
}

function getInitialTheme(storageKey: string, defaultTheme: Theme, enableSystem: boolean) {
 if (typeof window === 'undefined') {
  return normalizeTheme(undefined, defaultTheme, enableSystem)
 }

 try {
  return normalizeTheme(window.localStorage.getItem(storageKey), defaultTheme, enableSystem)
 } catch {
  return normalizeTheme(undefined, defaultTheme, enableSystem)
 }
}

function resolveTheme(theme: Theme, systemTheme: ResolvedTheme, enableSystem: boolean) {
 return theme === 'system' && enableSystem ? systemTheme : theme === 'dark' ? 'dark' : 'light'
}

function withoutTransitions() {
 const style = document.createElement('style')
 style.appendChild(
  document.createTextNode(
   '*,*::before,*::after{transition:none!important;animation:none!important}',
  ),
 )
 document.head.appendChild(style)

 return () => {
  window.getComputedStyle(document.body)
  window.setTimeout(() => style.remove(), 1)
 }
}

function applyTheme({
 attribute,
 disableTransitionOnChange,
 enableColorScheme,
 resolvedTheme,
}: {
 attribute: ThemeAttribute | ThemeAttribute[]
 disableTransitionOnChange: boolean
 enableColorScheme: boolean
 resolvedTheme: ResolvedTheme
}) {
 const restoreTransitions = disableTransitionOnChange ? withoutTransitions() : undefined
 const root = document.documentElement
 const attributes = Array.isArray(attribute) ? attribute : [attribute]

 for (const attr of attributes) {
  if (attr === 'class') {
   root.classList.remove('light', 'dark')
   root.classList.add(resolvedTheme)
  } else {
   root.setAttribute(attr, resolvedTheme)
  }
 }

 if (enableColorScheme) {
  root.style.colorScheme = resolvedTheme
 }

 restoreTransitions?.()
}

export function ThemeProvider({
 attribute = 'data-theme',
 children,
 defaultTheme = 'system',
 disableTransitionOnChange = false,
 enableColorScheme = true,
 enableSystem = true,
 forcedTheme,
 storageKey = 'theme',
 themes = DEFAULT_THEMES,
}: ThemeProviderProps) {
 const [themeState, setThemeState] = React.useState<Theme>(() =>
  getInitialTheme(storageKey, defaultTheme, enableSystem),
 )
 const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme())
 const activeTheme = forcedTheme ?? themeState
 const resolvedTheme = resolveTheme(activeTheme, systemTheme, enableSystem)

 React.useEffect(() => {
  applyTheme({
   attribute,
   disableTransitionOnChange,
   enableColorScheme,
   resolvedTheme,
  })
 }, [attribute, disableTransitionOnChange, enableColorScheme, resolvedTheme])

 React.useEffect(() => {
  if (!enableSystem) return

  const media = window.matchMedia(SYSTEM_THEME_QUERY)
  const handleChange = (event: MediaQueryListEvent) => {
   setSystemTheme(event.matches ? 'dark' : 'light')
  }

  media.addEventListener('change', handleChange)
  return () => media.removeEventListener('change', handleChange)
 }, [enableSystem])

 React.useEffect(() => {
  const handleStorage = (event: StorageEvent) => {
   if (event.key !== storageKey) return
   setThemeState(normalizeTheme(event.newValue, defaultTheme, enableSystem))
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
 }, [defaultTheme, enableSystem, storageKey])

 const setTheme = React.useCallback<React.Dispatch<React.SetStateAction<Theme>>>(
  (value) => {
   setThemeState((currentTheme) => {
    const nextValue = typeof value === 'function' ? value(currentTheme) : value
    const nextTheme = normalizeTheme(nextValue, defaultTheme, enableSystem)

    try {
     window.localStorage.setItem(storageKey, nextTheme)
    } catch {
     // Ignore storage failures in private browsing or locked-down contexts.
    }

    return nextTheme
   })
  },
  [defaultTheme, enableSystem, storageKey],
 )

 const availableThemes = React.useMemo(() => {
  return enableSystem ? Array.from(new Set([...themes, 'system' as Theme])) : themes
 }, [enableSystem, themes])

 const value = React.useMemo<ThemeProviderState>(
  () => ({
   forcedTheme,
   resolvedTheme,
   setTheme,
   systemTheme,
   theme: themeState,
   themes: availableThemes,
  }),
  [availableThemes, forcedTheme, resolvedTheme, setTheme, systemTheme, themeState],
 )

 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
 const context = React.useContext(ThemeContext)

 if (!context) {
  throw new Error('useTheme must be used within ThemeProvider')
 }

 return context
}
