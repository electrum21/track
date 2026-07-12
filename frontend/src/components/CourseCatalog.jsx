import { useState, useEffect, useMemo } from 'react'
import { getCourseCatalog } from '../api/api'

const RESULTS_CAP = 60

function CourseCatalog({ courses, onAdd }) {
  const [allModules, setAllModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [query, setQuery] = useState('')
  const [addingCode, setAddingCode] = useState(null)

  useEffect(() => {
    getCourseCatalog()
      .then(data => setAllModules(Array.isArray(data) ? data : []))
      .catch(err => { console.error('Failed to load NTU module catalog:', err); setLoadError('Could not load the module catalog. Please try again later.') })
      .finally(() => setLoading(false))
  }, [])

  const registeredCodes = useMemo(
    () => new Set(courses.map(c => c.moduleCode)),
    [courses]
  )

  const results = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return []
    return allModules
      .filter(m => m.moduleCode.toUpperCase().includes(q) || (m.name || '').toUpperCase().includes(q))
      .slice(0, RESULTS_CAP)
  }, [allModules, query])

  const totalMatches = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return 0
    return allModules.filter(m => m.moduleCode.toUpperCase().includes(q) || (m.name || '').toUpperCase().includes(q)).length
  }, [allModules, query])

  const handleAdd = async (mod) => {
    if (registeredCodes.has(mod.moduleCode) || addingCode) return
    setAddingCode(mod.moduleCode)
    try {
      await onAdd(mod)
    } finally {
      setAddingCode(null)
    }
  }

  return (
    <div>
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by module code or course title, e.g. CS2040 or Data Structures"
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600"
        />
        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">Loading module catalog...</div>
      )}

      {!loading && loadError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {loadError}
        </div>
      )}

      {!loading && !loadError && query.trim() === '' && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          Start typing to search {allModules.length.toLocaleString()} NTU modules
        </div>
      )}

      {!loading && !loadError && query.trim() !== '' && results.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">No modules match "{query.trim()}"</div>
      )}

      {!loading && !loadError && results.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {results.map(mod => {
            const isAdded = registeredCodes.has(mod.moduleCode)
            const isAdding = addingCode === mod.moduleCode
            return (
              <div key={mod.moduleCode} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{mod.moduleCode}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{mod.name}</div>
                </div>
                <button
                  onClick={() => handleAdd(mod)}
                  disabled={isAdded || isAdding}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 flex-shrink-0 ${
                    isAdded
                      ? 'border border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-default'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isAdded ? 'Added' : isAdding ? 'Adding...' : '+ Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !loadError && totalMatches > RESULTS_CAP && (
        <div className="text-xs text-gray-300 dark:text-gray-600 text-center mt-3">
          Showing {RESULTS_CAP} of {totalMatches} matches — refine your search to narrow it down
        </div>
      )}
    </div>
  )
}

export default CourseCatalog