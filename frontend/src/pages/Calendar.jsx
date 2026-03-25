import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings.jsx'
import { useTasks } from '../hooks/useTasks.jsx'
import { getCourses, getAcademicWeeks, uploadAcademicCalendar, setupAcademicCalendar, clearAcademicCalendar } from '../api/api'
import { validateUploadFile } from '../utils/fileValidation'
import TaskModal from '../components/TaskModal'

const FALLBACK_WEEKS = [
  { weekLabel: 'Week 1', startDate: '2026-01-12', endDate: '2026-01-18', weekType: 'TEACHING' },
  { weekLabel: 'Week 2', startDate: '2026-01-19', endDate: '2026-01-25', weekType: 'TEACHING' },
  { weekLabel: 'Week 3', startDate: '2026-01-26', endDate: '2026-02-01', weekType: 'TEACHING' },
  { weekLabel: 'Week 4', startDate: '2026-02-02', endDate: '2026-02-08', weekType: 'TEACHING' },
  { weekLabel: 'Week 5', startDate: '2026-02-09', endDate: '2026-02-15', weekType: 'TEACHING' },
  { weekLabel: 'Week 6', startDate: '2026-02-16', endDate: '2026-02-22', weekType: 'TEACHING' },
  { weekLabel: 'Week 7', startDate: '2026-02-23', endDate: '2026-03-01', weekType: 'TEACHING' },
  { weekLabel: 'Recess', startDate: '2026-03-02', endDate: '2026-03-08', weekType: 'RECESS' },
  { weekLabel: 'Week 8', startDate: '2026-03-09', endDate: '2026-03-15', weekType: 'TEACHING' },
  { weekLabel: 'Week 9', startDate: '2026-03-16', endDate: '2026-03-22', weekType: 'TEACHING' },
  { weekLabel: 'Week 10', startDate: '2026-03-23', endDate: '2026-03-29', weekType: 'TEACHING' },
  { weekLabel: 'Week 11', startDate: '2026-03-30', endDate: '2026-04-05', weekType: 'TEACHING' },
  { weekLabel: 'Week 12', startDate: '2026-04-06', endDate: '2026-04-12', weekType: 'TEACHING' },
  { weekLabel: 'Week 13', startDate: '2026-04-13', endDate: '2026-04-19', weekType: 'TEACHING' },
  { weekLabel: 'Exam Week', startDate: '2026-04-20', endDate: '2026-05-10', weekType: 'EXAM' },
]

const parseDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function normaliseWeeks(weeks) {
  // Rename legacy labels
  const rename = { 'Study': 'Exam Week', 'Exam': 'Exam Week' }
  // Deduplicate by startDate — keep first occurrence
  const seen = new Set()
  return weeks
    .map(w => ({ ...w, weekLabel: rename[w.weekLabel] || w.weekLabel }))
    .filter(w => {
      if (!w.startDate || seen.has(w.startDate)) return false
      seen.add(w.startDate)
      return true
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
}

function Calendar() {
  const { tasks, updateTaskInState, deleteTaskFromState } = useTasks()
  const [courses, setCourses] = useState([])
  const { settings } = useSettings()
  const td = settings.taskDisplay
  const [view, setView] = useState(() => settings.calendarView || 'month')
  const [semesterWeeks, setSemesterWeeks] = useState(FALLBACK_WEEKS)
  const [showCalendarSetup, setShowCalendarSetup] = useState(false)
  const [calendarUploading, setCalendarUploading] = useState(false)
  const [calendarUploadError, setCalendarUploadError] = useState(null)
  const [semester, setSemester] = useState('1')
  const [manualForm, setManualForm] = useState({ semesterStart: '', recessStart: '', examStart: '', teachingWeeks: '13', examWeeks: '3' })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState(null)
  const [collapsedModules, setCollapsedModules] = useState({})

  const handleTaskUpdated = (updated) => {
    updateTaskInState(updated)
    setSelectedTask(null)
  }

  const handleTaskDeleted = (id) => {
    deleteTaskFromState(id)
    setSelectedTask(null)
  }

  const toggleModule = (mod) => {
    setCollapsedModules(prev => ({ ...prev, [mod]: !prev[mod] }))
  }

  useEffect(() => {
    getCourses().then(data => { if (Array.isArray(data)) setCourses(data) }).catch(() => {})
    getAcademicWeeks().then(data => {
      if (Array.isArray(data) && data.length > 0) setSemesterWeeks(data)
    }).catch(() => {})
  }, [])

  const modules = [...new Set([
    ...courses.map(c => c.moduleCode),
    ...tasks.map(t => t.moduleCode).filter(Boolean)
  ])].sort()

  const typeColor = (type) => {
    switch (type) {
      case 'EXAM': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'PROJECT': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'QUIZ': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const legendColor = (type) => {
    switch (type) {
      case 'EXAM': return 'bg-red-100 dark:bg-red-900/30'
      case 'PROJECT': return 'bg-purple-100 dark:bg-purple-900/30'
      case 'QUIZ': return 'bg-amber-100 dark:bg-amber-900/30'
      default: return 'bg-blue-100 dark:bg-blue-900/30'
    }
  }

  const getTasksForDay = (date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const [y, m, d] = task.dueDate.split('-').map(Number)
      return (
        y === date.getFullYear() &&
        m - 1 === date.getMonth() &&
        d === date.getDate()
      )
    })
  }

  const isToday = (date) => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const daysInPrevMonth = getDaysInMonth(year, month - 1)
  const monthName = currentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), currentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), currentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), currentMonth: false })
  }

  const groupedByModule = tasks.reduce((acc, task) => {
    const mod = task.moduleCode || 'Unknown'
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(task)
    return acc
  }, {})

  const sortTasks = (taskList) => [...taskList].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return parseDate(a.dueDate) - parseDate(b.dueDate)
  })

  const views = ['month', 'semester', 'module']

  const handleClearCalendar = async () => {
    await clearAcademicCalendar()
    setSemesterWeeks(FALLBACK_WEEKS)
  }

  const handleCalendarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const err = validateUploadFile(file)
    if (err) { setCalendarUploadError(err); return }
    setCalendarUploadError(null)
    setCalendarUploading(true)
    try {
      const weeks = await uploadAcademicCalendar(file, semester)
      if (weeks && weeks.length > 0) { setSemesterWeeks(weeks); setShowCalendarSetup(false) }
    } catch (err) { console.error(err) }
    setCalendarUploading(false)
  }

  const handleManualSetup = async () => {
    if (!manualForm.semesterStart) return
    try {
      const weeks = await setupAcademicCalendar(manualForm)
      if (weeks && weeks.length > 0) { setSemesterWeeks(weeks); setShowCalendarSetup(false) }
    } catch (err) { console.error(err) }
  }

  // ── iCalendar export ──────────────────────────────────────────────────────
  const exportICS = () => {
    const pad = n => String(n).padStart(2, '0')
    const toICSDate = (dateStr, timeStr) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      if (timeStr) {
        const [h, min] = timeStr.slice(0, 5).split(':').map(Number)
        return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`
      }
      return `${y}${pad(m)}${pad(d)}`
    }

    const exportable = tasks.filter(t => t.dueDate)
    if (exportable.length === 0) return

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}@track`
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

    const events = exportable.map(t => {
      const hasTime = !!t.dueTime
      const dtProp = hasTime ? 'DTSTART' : 'DTSTART;VALUE=DATE'
      const dtVal = toICSDate(t.dueDate, t.dueTime)
      const summary = [t.moduleCode, t.title, t.weightage ? `(${t.weightage}%)` : '']
        .filter(Boolean).join(' ')
      const lines = [
        'BEGIN:VEVENT',
        `UID:${uid()}`,
        `DTSTAMP:${stamp}`,
        `${dtProp}:${dtVal}`,
        hasTime ? `DTEND:${dtVal}` : `DTEND;VALUE=DATE:${dtVal}`,
        `SUMMARY:${summary}`,
        t.note ? `DESCRIPTION:${t.note.replace(/\n/g, '\\n')}` : '',
        `CATEGORIES:${t.type}`,
        'END:VEVENT',
      ].filter(Boolean)
      return lines.join('\r\n')
    })

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Track//Academic Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'track-deadlines.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── PDF / print semester table ────────────────────────────────────────────
  const printSemester = () => {
    window.print()
  }

  return (
    <div>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #semester-print-area, #semester-print-area * { visibility: visible; }
          #semester-print-area { position: absolute; inset: 0; padding: 24px; }
          #semester-print-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Calendar</h1>

        {view === 'month' ? (
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="text-sm px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 text-gray-500 dark:text-gray-400 cursor-pointer">←</button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-36 text-center">{monthName}</span>
            <button onClick={nextMonth} className="text-sm px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 text-gray-500 dark:text-gray-400 cursor-pointer">→</button>
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Export buttons */}
          <button
            onClick={exportICS}
            disabled={tasks.filter(t => t.dueDate).length === 0}
            title="Export all deadlines to Google / Apple Calendar"
            className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 9.5V11h10V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Export .ics
          </button>
          {view === 'semester' && (
            <button
              onClick={printSemester}
              title="Download semester table as PDF"
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3.5 4.5h5M3.5 6.5h5M3.5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Save PDF
            </button>
          )}
          <button
            onClick={() => setShowCalendarSetup(p => !p)}
            className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer"
          >
            {calendarUploading ? 'Uploading...' : '⚙ Academic Calendar'}
          </button>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {views.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-4 py-2 transition-all duration-150 ${
                  view === v
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Academic calendar setup panel */}
      {showCalendarSetup && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Academic Calendar Setup</span>
            <button onClick={() => setShowCalendarSetup(false)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Upload calendar file</p>
              <div className="flex gap-2 mb-2">
                {['1', '2'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSemester(s)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-all duration-150 cursor-pointer font-medium ${semester === s ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    Sem {s}
                  </button>
                ))}
              </div>
              <label className="block text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-150 text-center">
                {calendarUploading ? 'Parsing...' : 'Upload PDF / PPTX'}
                <input type="file" className="hidden" accept=".pdf,.pptx,.docx,image/*" onChange={handleCalendarUpload} />
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Semester {semester} · Extraction may not be reliable — manual entry is advised for higher accuracy</p>
              {calendarUploadError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{calendarUploadError}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Or enter manually</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-28">Semester start</label>
                  <input type="date" value={manualForm.semesterStart} onChange={e => setManualForm(p => ({...p, semesterStart: e.target.value}))} className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-28">Recess start</label>
                  <input type="date" value={manualForm.recessStart} onChange={e => setManualForm(p => ({...p, recessStart: e.target.value}))} className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-28">Exam period start</label>
                  <input type="date" value={manualForm.examStart} onChange={e => setManualForm(p => ({...p, examStart: e.target.value}))} className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-28">Teaching weeks</label>
                  <input type="number" min="1" max="20" value={manualForm.teachingWeeks} onChange={e => setManualForm(p => ({...p, teachingWeeks: e.target.value}))} className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-28">Exam weeks</label>
                  <input type="number" min="1" max="10" value={manualForm.examWeeks} onChange={e => setManualForm(p => ({...p, examWeeks: e.target.value}))} className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" />
                </div>
              </div>
              <button
                onClick={handleManualSetup}
                disabled={!manualForm.semesterStart}
                className="mt-3 text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer font-medium disabled:opacity-50"
              >
                Generate weeks
              </button>
            </div>
          </div>
          {semesterWeeks !== FALLBACK_WEEKS && semesterWeeks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={handleClearCalendar}
                className="text-xs px-3 py-1.5 border border-red-100 dark:border-red-900/50 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Clear calendar data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-xs text-center font-medium text-gray-400 dark:text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const dayTasks = getTasksForDay(cell.date)
              return (
                <div key={i} className={`min-h-16 sm:min-h-32 rounded-lg p-1 sm:p-1.5 border ${
                  isToday(cell.date)
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : cell.currentMonth
                    ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
                }`}>
                  <div className={`text-xs font-medium mb-1 ${
                    isToday(cell.date) ? 'text-blue-600 dark:text-blue-400' :
                    cell.currentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'
                  }`}>{cell.date.getDate()}</div>
                  {dayTasks.slice(0, 4).map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      title={task.title}
                      className={`text-xs px-1 py-1 rounded mb-0.5 cursor-pointer font-medium hover:opacity-80 transition-all duration-150 ${typeColor(task.type)}`}
                    >
                      <div className="flex items-start justify-between gap-0.5">
                        <div className="text-xs leading-tight break-words flex-1">
                          {task.moduleCode && <span className="opacity-60 mr-0.5">{task.moduleCode}</span>}
                          {task.title}{td.weightage && task.weightage && ` (${task.weightage}%)`}
                        </div>
                        {task.status === 'COMPLETED' && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 ml-0.5"><circle cx="6" cy="6" r="5.5" fill="#4ade80"/><path d="M3.5 6l1.8 1.8L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="opacity-70 font-normal mt-0.5">
                        {td.dueTime && task.dueTime && <span>{task.dueTime.slice(0, 5)}</span>}
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">+{dayTasks.length - 2} more</div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-4">
            {['ASSIGNMENT', 'PROJECT', 'EXAM', 'QUIZ'].map(type => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${legendColor(type)}`} />
                <span className="text-xs text-gray-400 dark:text-gray-500">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semester view */}
      {view === 'semester' && (
        <div id="semester-print-area">
          <div id="semester-print-title" className="hidden print:block text-gray-900 mb-3">
            Semester Overview — Track
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-gray-400 dark:text-gray-500 w-24 sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">Week</th>
                  {modules.map(mod => (
                    <th key={mod} className="text-left p-2 font-medium text-gray-600 dark:text-gray-300 min-w-32 border-r border-gray-200 dark:border-gray-700">{mod}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semesterWeeks.map(semWeek => {
                  const today = new Date()
                  const start = parseDate(semWeek.startDate)
                  const end = parseDate(semWeek.endDate)
                  const isPast = end < today
                  const isCurrent = today >= start && today <= end

                  const rowBg = semWeek.weekType === 'RECESS'
                    ? 'bg-blue-50 dark:bg-blue-900/10'
                    : semWeek.weekType === 'EXAM'
                    ? 'bg-red-50 dark:bg-red-900/10'
                    : isCurrent
                    ? 'bg-yellow-50 dark:bg-yellow-900/10'
                    : 'bg-white dark:bg-gray-900'

                  const weekCellBg = isPast
                    ? 'bg-gray-900 dark:bg-gray-950'
                    : semWeek.weekType === 'RECESS'
                    ? 'bg-blue-50 dark:bg-blue-900/10'
                    : semWeek.weekType === 'EXAM'
                    ? 'bg-red-50 dark:bg-red-900/10'
                    : isCurrent
                    ? 'bg-yellow-50 dark:bg-yellow-900/10'
                    : 'bg-white dark:bg-gray-900'

                  const weekLabelColor = isPast
                    ? 'text-gray-400 dark:text-gray-600'
                    : semWeek.weekType === 'RECESS'
                    ? 'text-blue-600 dark:text-blue-400'
                    : semWeek.weekType === 'EXAM'
                    ? 'text-red-600 dark:text-red-400'
                    : isCurrent
                    ? 'text-yellow-700 dark:text-yellow-500'
                    : 'text-gray-500 dark:text-gray-400'

                  return (
                    <tr key={semWeek.startDate || semWeek.weekLabel} className={`border-t border-gray-100 dark:border-gray-800 ${rowBg}`}>
                      <td className={`p-2 font-medium sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700 ${weekCellBg} ${weekLabelColor}`}>
                        <div>{semWeek.weekLabel}</div>
                        <div className={`font-normal mt-0.5 ${isPast ? 'text-gray-600 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                          {parseDate(semWeek.startDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                        </div>
                        {isCurrent && (
                          <span className="inline-block mt-1 bg-yellow-400 dark:bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded-full font-medium">Now</span>
                        )}
                      </td>
                      {modules.map(mod => {
                        const cellTasks = tasks.filter(task => {
                          if (task.moduleCode !== mod || !task.dueDate) return false
                          const due = parseDate(task.dueDate)
                          return due >= start && due <= end
                        })
                        return (
                          <td key={mod} className={`p-2 align-top border-r border-gray-200 dark:border-gray-700 ${rowBg}`}>
                            {cellTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={`px-2 py-1.5 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-all duration-150 font-medium ${typeColor(task.type)}`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span>{task.title}{td.weightage && task.weightage && ` (${task.weightage}%)`}</span>
                                  {task.status === 'COMPLETED' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0"><circle cx="6" cy="6" r="5.5" fill="#4ade80"/><path d="M3.5 6l1.8 1.8L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <div className="font-normal mt-0.5 opacity-70">
                                  {td.dueDate && task.dueDate && parseDate(task.dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                                  {td.dueTime && task.dueTime && ` · ${task.dueTime.slice(0, 5)}`}
                                </div>
                              </div>
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {modules.some(mod => tasks.some(t => t.moduleCode === mod && !t.dueDate)) && (
                  <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <td className="p-2 font-medium sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                      No date
                    </td>
                    {modules.map(mod => {
                      const undated = tasks.filter(t => t.moduleCode === mod && !t.dueDate)
                      return (
                        <td key={mod} className={`p-2 align-top border-r border-gray-200 dark:border-gray-700 ${rowBg}`}>
                          {undated.map(task => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`px-2 py-1.5 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-all duration-150 font-medium ${typeColor(task.type)}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span>{task.title}{td.weightage && task.weightage && ` (${task.weightage}%)`}</span>
                                {task.status === 'COMPLETED' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0"><circle cx="6" cy="6" r="5.5" fill="#4ade80"/><path d="M3.5 6l1.8 1.8L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 mt-4">
            {[
              { label: 'Current week', color: 'bg-yellow-400' },
              { label: 'Recess', color: 'bg-blue-400' },
              { label: 'Exam', color: 'bg-red-400' },
              { label: 'Past', color: 'bg-gray-900' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                <span className="text-xs text-gray-400 dark:text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module view */}
        {view === 'module' && (
        <div>
            {Object.entries(groupedByModule).sort(([a], [b]) => a.localeCompare(b)).map(([mod, modTasks]) => {
            const isCollapsed = collapsedModules[mod]
            const sorted = sortTasks(modTasks)
            const withDate = sorted.filter(t => t.dueDate)
            const withoutDate = sorted.filter(t => !t.dueDate)

            return (
                <div key={mod} className="mb-3">
                <button
                    onClick={() => toggleModule(mod)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-150 cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{mod}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{modTasks.length} tasks</span>
                    </div>
                    <div className="flex items-center gap-3">
                    {withDate.filter(t => parseDate(t.dueDate) >= new Date()).length > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                        Next: {parseDate(withDate.filter(t => parseDate(t.dueDate) >= new Date())[0].dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                    <span className={`text-xs text-gray-400 dark:text-gray-500 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-180'}`}>
                        ↑
                    </span>
                    </div>
                </button>

                {!isCollapsed && (
                    <div className="mt-1 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">

                    {withDate.map((task, index) => {
                        const isPastDue = parseDate(task.dueDate) < new Date()
                        const isCompleted = task.status === 'COMPLETED'

                        return (
                        <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-150 ${
                            index !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                            }`}
                        >
                            <div className="flex items-center gap-3 flex-1">
                            {isCompleted ? (
                                <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-green-600 dark:text-green-400" style={{ fontSize: '10px' }}>✓</span>
                                </div>
                            ) : isPastDue ? (
                            <div
                                title="Deadline has passed"
                                className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 cursor-help"
                            >
                                <span className="text-green-600 dark:text-green-400" style={{ fontSize: '10px' }}>✓</span>
                            </div>
                            ) : (
                                <div
                                title="Upcoming"
                                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                />
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 w-24 text-center ${typeColor(task.type)}`}>
                                {task.type}
                            </span>
                            <span className={`text-sm ${
                                isCompleted
                                ? 'line-through text-gray-300 dark:text-gray-600'
                                : isPastDue
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                                <span className="flex items-center justify-between gap-1 w-full">
                                  <span>{task.title}{td.weightage && task.weightage && ` (${task.weightage}%)`}</span>
                                  {task.status === 'COMPLETED' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0"><circle cx="6" cy="6" r="5.5" fill="#4ade80"/><path d="M3.5 6l1.8 1.8L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </span>
                            </span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                            <div className={`text-xs ${isPastDue && !isCompleted ? 'text-gray-400 dark:text-gray-600' : 'text-white-500 dark:text-white-400'}`}>
                                {td.dueDate && task.dueDate && parseDate(task.dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {td.dueTime && task.dueTime && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{task.dueTime.slice(0, 5)}</div>
                            )}
                            </div>
                        </div>
                        )
                    })}

                    {withoutDate.length > 0 && (
                        <>
                        {withDate.length > 0 && (
                            <div className="px-4 py-1.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-xs text-gray-400 dark:text-gray-500">No date</span>
                            </div>
                        )}
                        {withoutDate.map((task) => (
                            <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-150 border-t border-gray-100 dark:border-gray-800"
                            >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0 opacity-30" />
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 w-24 text-center ${typeColor(task.type)}`}>
                                {task.type}
                                </span>
                                <span className="text-sm text-gray-800 dark:text-gray-200">
                                <span className="flex items-center justify-between gap-1 w-full">
                                  <span>{task.title}{td.weightage && task.weightage && ` (${task.weightage}%)`}</span>
                                  {task.status === 'COMPLETED' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0"><circle cx="6" cy="6" r="5.5" fill="#4ade80"/><path d="M3.5 6l1.8 1.8L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </span>
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 ml-4 italic">
                                {task.dueDateRaw || '—'}
                            </div>
                            </div>
                        ))}
                        </>
                    )}
                    </div>
                )}
                </div>
            )
            })}

            {Object.keys(groupedByModule).length === 0 && (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
                No tasks yet — upload your slides from the dashboard
            </div>
            )}
        </div>
        )}

      {tasks.length === 0 && view !== 'module' && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          No tasks yet — upload your slides from the dashboard
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  )
}

export default Calendar