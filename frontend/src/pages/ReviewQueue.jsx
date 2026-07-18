import { useState, useEffect } from 'react'
import { getTasks, getCourses, updateTask, deleteTask } from '../api/api'
import { useTasks } from '../hooks/useTasks.jsx'

function ReviewQueue() {
  const { updateTaskInState, deleteTaskFromState } = useTasks()
  const [tasks, setTasks] = useState([])
  const [edits, setEdits] = useState({})
  const [courses, setCourses] = useState([])
  const [saveErrors, setSaveErrors] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [openModuleDropdownId, setOpenModuleDropdownId] = useState(null)

  const myModuleCodes = courses.map(c => c.moduleCode).sort((a, b) => a.localeCompare(b))

  useEffect(() => {
    getCourses().then(data => { if (Array.isArray(data)) setCourses(data) }).catch(() => {})
  }, [])

  useEffect(() => {
    getTasks().then(data => {
      const pending = data.filter(t =>
        t.status === 'NEEDS_REVIEW' || t.status === 'PENDING_DATE'
      )
      setTasks(pending)
      const initial = {}
      pending.forEach(t => {
        initial[t.id] = {
          title:      t.title || '',
          moduleCode: t.moduleCode || '',
          type:       t.type || 'ASSIGNMENT',
          dueDate:    t.dueDate || '',
          dueTime:    t.dueTime ? t.dueTime.slice(0, 5) : '',
          weightage:  t.weightage != null ? String(t.weightage) : '',
          note:       t.note || '',
        }
      })
      setEdits(initial)
    })
  }, [])

  const handleChange = (id, field, value) => {
    setEdits(prev => {
      const updated = { ...prev, [id]: { ...prev[id], [field]: value } }
      return updated
    })
    setSaveErrors(prev => {
      if (!prev[id]) return prev
      const { [id]: _, ...rest } = prev
      return rest
    })
  }

  const handleConfirm = async (task) => {
    const e = edits[task.id]
    const moduleCode = e.moduleCode || task.moduleCode
    if (moduleCode && !myModuleCodes.includes(moduleCode.toUpperCase())) {
      setSaveErrors(prev => ({ ...prev, [task.id]: `"${moduleCode}" is not in your modules. Add it first if you want to move this task there.` }))
      return
    }
    const dueDate = e.dueDate || null
    // Auto-set status: if date is in the past → COMPLETED, else CONFIRMED
    let autoStatus = 'CONFIRMED'
    if (dueDate && new Date(dueDate) < new Date()) autoStatus = 'COMPLETED'

    const updated = {
      ...task,
      title:      e.title || task.title,
      moduleCode,
      type:       e.type || task.type,
      dueDate,
      dueTime:    e.dueTime ? e.dueTime + ':00' : null,
      weightage:  e.weightage ? parseFloat(e.weightage) : null,
      note:       e.note || null,
      status:     autoStatus,
      user:       { id: task.userId },
    }
    setSavingId(task.id)
    try {
      const saved = await updateTask(task.id, updated)
      // Remove from local review list
      setTasks(prev => prev.filter(t => t.id !== task.id))
      // Update shared context so Navbar badge drops immediately
      updateTaskInState(saved)
    } catch (err) {
      setSaveErrors(prev => ({ ...prev, [task.id]: err.message || 'Could not save changes. Please try again.' }))
    }
    setSavingId(null)
  }

  const handleDiscard = async (task) => {
    await deleteTask(task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
    deleteTaskFromState(task.id)
  }

  const inp = "w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Review Queue</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} need your attention
        </p>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          All tasks have been reviewed
        </div>
      )}

      {tasks.map(task => {
        const e = edits[task.id] || {}
        return (
          <div
            key={task.id}
            className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-3"
          >
            {/* Title row + badge */}
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                value={e.title || ''}
                onChange={ev => handleChange(task.id, 'title', ev.target.value)}
                className="text-sm font-medium bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 flex-1 min-w-0 mr-3"
                placeholder="Task title"
              />
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium flex-shrink-0">
                {task.status === 'PENDING_DATE' ? 'Missing date' : 'Needs review'}
              </span>
            </div>

            {/* AI note */}
            {task.note && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mb-3 leading-relaxed">
                {task.note}
              </div>
            )}

            {/* Fields grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="relative">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Module</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={e.moduleCode || ''}
                  onChange={ev => handleChange(task.id, 'moduleCode', ev.target.value.toUpperCase())}
                  onFocus={() => setOpenModuleDropdownId(task.id)}
                  onBlur={() => setTimeout(() => setOpenModuleDropdownId(prev => prev === task.id ? null : prev), 150)}
                  placeholder="CS2040"
                  className={inp}
                />
                {openModuleDropdownId === task.id && myModuleCodes.length > 0 && (() => {
                  const matches = myModuleCodes.filter(code => !e.moduleCode || code.includes(e.moduleCode))
                  return (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                      {matches.length > 0 ? matches.map(code => (
                        <button
                          key={code}
                          type="button"
                          onMouseDown={ev => { ev.preventDefault(); handleChange(task.id, 'moduleCode', code); setOpenModuleDropdownId(null) }}
                          className="block w-full text-left text-xs px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          {code}
                        </button>
                      )) : (
                        <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">No matching modules</div>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Type</label>
                <select
                  value={e.type || 'ASSIGNMENT'}
                  onChange={ev => handleChange(task.id, 'type', ev.target.value)}
                  className={inp}
                >
                  {['ASSIGNMENT', 'PROJECT', 'EXAM', 'QUIZ'].map(t => (
                    <option key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Due date</label>
                <input
                  type="date"
                  value={e.dueDate || ''}
                  onChange={ev => handleChange(task.id, 'dueDate', ev.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Due time</label>
                <input
                  type="time"
                  value={e.dueTime || ''}
                  onChange={ev => handleChange(task.id, 'dueTime', ev.target.value)}
                  className={inp}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Weight %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={e.weightage || ''}
                  onChange={ev => handleChange(task.id, 'weightage', ev.target.value)}
                  placeholder="15"
                  className={inp}
                />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Note</label>
                <input
                  type="text"
                  value={e.note || ''}
                  onChange={ev => handleChange(task.id, 'note', ev.target.value)}
                  placeholder="Optional note"
                  className={inp}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-3">
              {saveErrors[task.id] && (
                <div className="text-xs text-red-500 dark:text-red-400">{saveErrors[task.id]}</div>
              )}
              <div className="flex justify-end gap-2 ml-auto">
                <button
                  onClick={() => handleDiscard(task)}
                  className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={() => handleConfirm(task)}
                  disabled={savingId === task.id}
                  className="text-xs px-3 py-1.5 border border-green-200 dark:border-green-900/50 rounded-lg text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 transition-all duration-150 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingId === task.id ? 'Saving...' : 'Confirm & save'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ReviewQueue