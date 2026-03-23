import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useState, useEffect } from 'react'
import { getTasks } from '../api/api'
import SettingsPanel from './SettingsPanel'

function Navbar() {
  const location = useLocation()
  const { user } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    if (!user) return
    getTasks().then(data => {
      setReviewCount(data.filter(t => t.status === 'NEEDS_REVIEW' || t.status === 'PENDING_DATE').length)
    }).catch(() => {})
  }, [user])

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/course', label: 'Course' },
    { path: '/review', label: 'For Review', badge: true },
    { path: '/agent', label: 'Agent' },
  ]

  return (
    <>
      <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-gray-100">Track</span>
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1">
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative text-sm px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                location.pathname === link.path
                  ? 'text-gray-900 dark:text-gray-100 font-medium bg-gray-100 dark:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
              {link.badge && reviewCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-semibold rounded-full bg-amber-400 dark:bg-amber-500 text-white leading-none">
                  {reviewCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {user?.photoURL && (
            <img src={user.photoURL} className="w-7 h-7 rounded-full" alt="avatar" />
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M13.3 6.6l-.8-.4a5.4 5.4 0 000-1.7l.8-.5a.7.7 0 00.2-.9l-.9-1.5a.7.7 0 00-.9-.3l-.8.5a5.4 5.4 0 00-1.5-.9V.7A.7.7 0 008.7 0H7.3a.7.7 0 00-.7.7v.9a5.4 5.4 0 00-1.5.9l-.8-.5a.7.7 0 00-.9.3L2.5 3.8a.7.7 0 00.2.9l.8.4a5.4 5.4 0 000 1.7l-.8.5a.7.7 0 00-.2.9l.9 1.5a.7.7 0 00.9.3l.8-.5c.5.4 1 .7 1.5.9v.9c0 .4.3.7.7.7h1.4c.4 0 .7-.3.7-.7v-.9a5.4 5.4 0 001.5-.9l.8.5a.7.7 0 00.9-.3l.9-1.5a.7.7 0 00-.2-.9z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </nav>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default Navbar