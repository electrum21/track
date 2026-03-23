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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    getTasks().then(data => {
      setReviewCount(data.filter(t => t.status === 'NEEDS_REVIEW' || t.status === 'PENDING_DATE').length)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/course', label: 'Course' },
    { path: '/review', label: 'For Review', badge: true },
    { path: '/agent', label: 'Agent' },
  ]

  return (
    <>
      <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100">Track</span>

          {/* Desktop nav links */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-1">
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
              <img src={user.photoURL} className="w-7 h-7 rounded-full hidden sm:block" alt="avatar" />
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="w-8 h-8 hidden md:flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M13.3 6.6l-.8-.4a5.4 5.4 0 000-1.7l.8-.5a.7.7 0 00.2-.9l-.9-1.5a.7.7 0 00-.9-.3l-.8.5a5.4 5.4 0 00-1.5-.9V.7A.7.7 0 008.7 0H7.3a.7.7 0 00-.7.7v.9a5.4 5.4 0 00-1.5.9l-.8-.5a.7.7 0 00-.9.3L2.5 3.8a.7.7 0 00.2.9l.8.4a5.4 5.4 0 000 1.7l-.8.5a.7.7 0 00-.2.9l.9 1.5a.7.7 0 00.9.3l.8-.5c.5.4 1 .7 1.5.9v.9c0 .4.3.7.7.7h1.4c.4 0 .7-.3.7-.7v-.9a5.4 5.4 0 001.5-.9l.8.5a.7.7 0 00.9-.3l.9-1.5a.7.7 0 00-.2-.9z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer relative"
              aria-label="Toggle menu"
            >
              {reviewCount > 0 && !mobileMenuOpen && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white dark:border-gray-950" />
              )}
              {mobileMenuOpen ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 pb-1 flex flex-col gap-0.5">
            {links.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  location.pathname === link.path
                    ? 'text-gray-900 dark:text-gray-100 font-medium bg-gray-100 dark:bg-gray-800'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
                {link.badge && reviewCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full bg-amber-400 dark:bg-amber-500 text-white leading-none">
                    {reviewCount}
                  </span>
                )}
              </Link>
            ))}
            <div className="flex items-center justify-between px-3 py-2.5 mt-1 border-t border-gray-100 dark:border-gray-800">
              {user?.photoURL && (
                <img src={user.photoURL} className="w-7 h-7 rounded-full" alt="avatar" />
              )}
              <button
                onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true) }}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer ml-auto"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M13.3 6.6l-.8-.4a5.4 5.4 0 000-1.7l.8-.5a.7.7 0 00.2-.9l-.9-1.5a.7.7 0 00-.9-.3l-.8.5a5.4 5.4 0 00-1.5-.9V.7A.7.7 0 008.7 0H7.3a.7.7 0 00-.7.7v.9a5.4 5.4 0 00-1.5.9l-.8-.5a.7.7 0 00-.9.3L2.5 3.8a.7.7 0 00.2.9l.8.4a5.4 5.4 0 000 1.7l-.8.5a.7.7 0 00-.2.9l.9 1.5a.7.7 0 00.9.3l.8-.5c.5.4 1 .7 1.5.9v.9c0 .4.3.7.7.7h1.4c.4 0 .7-.3.7-.7v-.9a5.4 5.4 0 001.5-.9l.8.5a.7.7 0 00.9-.3l.9-1.5a.7.7 0 00-.2-.9z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Settings
              </button>
            </div>
          </div>
        )}
      </nav>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default Navbar
