import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings.jsx'
import { useAuth } from '../AuthContext'
import { signOutUser, auth } from '../firebase'
import { deleteAccount } from '../api/api'

// ── tiny primitives ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 mt-5 first:mt-0">
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors duration-200 focus:outline-none
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
        ${checked
          ? 'bg-gray-800 dark:bg-gray-200 border-gray-800 dark:border-gray-200'
          : 'bg-transparent border-gray-300 dark:border-gray-600'
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full shadow transform transition-transform duration-200 mt-[2px]
          ${checked
            ? 'translate-x-4 bg-white dark:bg-gray-900'
            : 'translate-x-[3px] bg-gray-300 dark:bg-gray-600'
          }`}
      />
    </button>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer
            ${value === opt.value
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Row({ label, sublabel, right }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <div className="text-sm text-gray-800 dark:text-gray-200">{label}</div>
        {sublabel && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</div>}
      </div>
      {right}
    </div>
  )
}

// ── main panel ───────────────────────────────────────────────────────────────

export default function SettingsPanel({ open, onClose }) {
  const { settings, update, toggleTaskField, persistSettings } = useSettings()
  const { user } = useAuth()
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      // Delete Firebase account too, then sign out
      if (auth.currentUser) {
        try { await auth.currentUser.delete() } catch (_) {}
      }
      localStorage.clear()
      navigate('/login')
    } catch (err) {
      console.error('Delete account failed:', err)
      setDeleting(false)
    }
  }

  const handleClose = () => {
    persistSettings(settings)
    onClose()
  }

  const handleLogout = async () => {
    await signOutUser()
    localStorage.clear()
    navigate('/login')
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, settings])

  useEffect(() => {
    if (open) panelRef.current?.focus()
    // Reset sign out confirmation when panel reopens
    if (!open) { setConfirmSignOut(false); setConfirmDelete(false) }
  }, [open])

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  const calendarOptions = [
    { value: 'month', label: 'Month' },
    { value: 'semester', label: 'Semester' },
    { value: 'module', label: 'Module' },
  ]

  const taskFields = [
    { key: 'moduleCode', label: 'Module code', compulsory: true },
    { key: 'title', label: 'Task title', compulsory: true },
    { key: 'dueDate', label: 'Due date' },
    { key: 'dueTime', label: 'Due time' },
    { key: 'weightage', label: 'Weightage' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: open ? 'blur(2px)' : 'none' }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={`fixed top-0 right-0 h-full z-50 w-full sm:w-80 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col
          transform transition-transform duration-300 ease-in-out focus:outline-none
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Settings</span>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-150 cursor-pointer"
            aria-label="Close settings"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Account section — top */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              {user.photoURL && (
                <img src={user.photoURL} className="w-8 h-8 rounded-full flex-shrink-0" alt="avatar" />
              )}
              <div className="min-w-0">
                {user.displayName && (
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.displayName}</div>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</div>
              </div>
            </div>
          )}
          {!confirmSignOut ? (
            <button
              onClick={() => setConfirmSignOut(true)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 cursor-pointer text-center"
            >
              Sign out
            </button>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sign out of Track?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSignOut(false)}
                  className="flex-1 text-xs py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 text-xs py-1.5 rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-150 cursor-pointer font-medium"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {/* Delete account */}
          <div className="mt-2">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs px-3 py-2 rounded-lg text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all duration-150 cursor-pointer text-center"
              >
                Delete account
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Delete your account?</p>
                <p className="text-xs text-red-500 dark:text-red-500 mb-3">
                  This permanently deletes all your tasks, courses, and calendar data. Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 text-xs py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 text-xs py-1.5 rounded-md border border-red-300 dark:border-red-700 text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-all duration-150 cursor-pointer font-medium disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete everything'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          <SectionLabel>Appearance</SectionLabel>
          <SegmentedControl
            options={themeOptions}
            value={settings.theme}
            onChange={(val) => update({ theme: val })}
          />

          <SectionLabel>Default calendar view</SectionLabel>
          <SegmentedControl
            options={calendarOptions}
            value={settings.calendarView}
            onChange={(val) => update({ calendarView: val })}
          />

          <SectionLabel>Task card info</SectionLabel>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-3">
            {taskFields.map(field => (
              <Row
                key={field.key}
                label={field.label}
                sublabel={field.compulsory ? 'Always shown' : undefined}
                right={
                  <Toggle
                    checked={settings.taskDisplay[field.key] ?? true}
                    onChange={() => toggleTaskField(field.key)}
                    disabled={field.compulsory}
                  />
                }
              />
            ))}
          </div>

          <SectionLabel>Preview</SectionLabel>
          <TaskPreview settings={settings} />

        </div>
      </div>
    </>
  )
}

// ── live preview card ────────────────────────────────────────────────────────

function TaskPreview({ settings }) {
  const { taskDisplay } = settings
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-2">
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Sample task</div>
      <div className="flex items-center gap-2 flex-wrap">
        {taskDisplay.moduleCode && (
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
            CS2040
          </span>
        )}
        {taskDisplay.title && (
          <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">Assignment 3</span>
        )}
        {taskDisplay.weightage && (
          <span className="text-xs text-gray-400 dark:text-gray-500">15%</span>
        )}
      </div>
      {(taskDisplay.dueDate || taskDisplay.dueTime) && (
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
            <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {taskDisplay.dueDate && <span>14 Apr</span>}
          {taskDisplay.dueDate && taskDisplay.dueTime && <span>·</span>}
          {taskDisplay.dueTime && <span>23:59</span>}
        </div>
      )}
    </div>
  )
}