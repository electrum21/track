import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
})

const defaults = {
  theme: 'system',
  calendarView: 'month',
  taskDisplay: {
    moduleCode: true,
    title: true,
    weightage: true,
    dueDate: true,
    dueTime: true,
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('track-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          ...defaults,
          ...parsed,
          taskDisplay: { ...defaults.taskDisplay, ...(parsed.taskDisplay || {}) }
        }
      }
    } catch {}
    return defaults
  })

  // Load from server on mount
  useEffect(() => {
    const token = localStorage.getItem('firebase_token')
    if (!token) return
    fetch(`${BASE_URL}/users/preferences`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.preferences && data.preferences !== '{}') {
          try {
            const remote = JSON.parse(data.preferences)
            const merged = {
              ...defaults,
              ...remote,
              taskDisplay: { ...defaults.taskDisplay, ...(remote.taskDisplay || {}) }
            }
            setSettings(merged)
            localStorage.setItem('track-settings', JSON.stringify(merged))
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
    root.classList.toggle('dark', isDark)
    localStorage.setItem('track-theme', isDark ? 'dark' : 'light')
  }, [settings.theme])

  const update = useCallback((patch) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  const toggleTaskField = useCallback((field) => {
    if (field === 'moduleCode' || field === 'title') return
    setSettings(prev => ({
      ...prev,
      taskDisplay: { ...prev.taskDisplay, [field]: !prev.taskDisplay[field] }
    }))
  }, [])

  // Called by SettingsPanel on close
  const persistSettings = useCallback((current) => {
    localStorage.setItem('track-settings', JSON.stringify(current))
    fetch(`${BASE_URL}/users/preferences`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(current)
    }).catch(() => {})
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, update, toggleTaskField, persistSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}