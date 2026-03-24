import { useState, useEffect } from 'react'
import { getTasks, updateTask, deleteTask } from '../api/api'
import { useTasks } from '../hooks/useTasks.jsx'

function ReviewQueue() {
  const { updateTaskInState, deleteTaskFromState } = useTasks()
  const [tasks, setTasks] = useState([])
  const [edits, setEdits] = useState({})

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
      // Auto-adjust status when due date changes
      if (field === 'dueDate' && value) {
        // no status field in edits — handled at confirm time
      }
      return updated
    })
  }

  const handleConfirm = async (task) => {
    const e = edits[task.id]
    const dueDate = e.dueDate || null
    // Auto-set status: if date is in the past → COMPLETED, else CONFIRMED
    let autoStatus = 'CONFIRMED'
    if (dueDate && new Date(dueDate) < new Date()) autoStatus = 'COMPLETED'

    const updated = {
      ...task,
      title:      e.title || task.title,
      moduleCode: e.moduleCode || task.moduleCode,
      type:       e.type || task.type,
      dueDate,
      dueTime:    e.dueTime ? e.dueTime + ':00' : null,
      weightage:  e.weightage ? parseFloat(e.weightage) : null,
      note:       e.note || null,
      status:     autoStatus,
      user:       { id: task.userId },
    }
    const saved = await updateTask(task.id, updated)
    // Remove from local review list
    setTasks(prev => prev.filter(t => t.id !== task.id))
    // Update shared context so Navbar badge drops immediately
    updateTaskInState(saved)
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
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 block">Module</label>
                <input
                  type="text"
                  value={e.moduleCode || ''}
                  onChange={ev => handleChange(task.id, 'moduleCode', ev.target.value.toUpperCase())}
                  placeholder="CS2040"
                  className={inp}
                />
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
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleDiscard(task)}
                className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={() => handleConfirm(task)}
                className="text-xs px-3 py-1.5 border border-green-200 dark:border-green-900/50 rounded-lg text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 transition-all duration-150 cursor-pointer font-medium"
              >
                Confirm & save
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ReviewQueue