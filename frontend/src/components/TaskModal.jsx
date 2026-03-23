import { useState } from 'react'
import { updateTask, deleteTask } from '../api/api'

function TaskModal({ task, onClose, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: task.title || '',
    moduleCode: task.moduleCode || '',
    type: task.type || 'ASSIGNMENT',
    dueDate: task.dueDate || '',
    dueTime: task.dueTime ? task.dueTime.slice(0, 5) : '',
    status: task.status || 'CONFIRMED',
    note: task.note || '',
    weightage: task.weightage || null,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date()
  const isCompleted = task.status === 'COMPLETED'

  const typeColor = (type) => {
    switch (type) {
      case 'EXAM': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'PROJECT': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'QUIZ': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const statusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'PENDING_DATE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'NEEDS_REVIEW': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const updated = await updateTask(task.id, {
      title: form.title,
      moduleCode: form.moduleCode,
      type: form.type,
      dueDate: form.dueDate || null,
      dueTime: form.dueTime ? form.dueTime + ':00' : null,
      status: form.status,
      note: form.note,
      weightage: form.weightage || null,
      dueDateRaw: task.dueDateRaw,
      confidence: task.confidence,
      user: { id: task.userId },
    })
    setSaving(false)
    setEditing(false)
    onUpdated(updated)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await deleteTask(task.id)
    setDeleting(false)
    onDeleted(task.id)
  }

  const handleToggleComplete = async () => {
    if (isPastDue) return // locked
    setToggling(true)
    const newStatus = isCompleted ? 'CONFIRMED' : 'COMPLETED'
    const updated = await updateTask(task.id, {
      ...task,
      status: newStatus,
      user: { id: task.userId },
    })
    setToggling(false)
    onUpdated(updated)
  }

  const inputClass = "mt-1 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(task.type)}`}>
              {task.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
            {isPastDue && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                Past due
              </span>
            )}
            {task.confidence && task.confidence < 0.8 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {Math.round(task.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:scale-95 transition-all duration-150 cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>

        {/* View mode */}
        {!editing && (
          <div>
            <h2 className={`text-lg font-medium mb-4 ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
              {task.title}{task.weightage && ` (${task.weightage}%)`}
            </h2>
            <div className="space-y-2 mb-6">
              {task.moduleCode && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Module</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{task.moduleCode}</span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Due date</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {new Date(task.dueDate).toLocaleDateString('en-SG', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                    })}
                    {task.dueTime && ` · ${task.dueTime.slice(0, 5)}`}
                  </span>
                </div>
              )}
              {task.weightage && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Weightage</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{task.weightage}%</span>
                </div>
              )}

              {task.note && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="text-xs text-amber-700 dark:text-amber-400">{task.note}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-3 py-1.5 border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 text-red-400 transition-all duration-150 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <div className="flex items-center gap-2">
                {/* Complete toggle — locked if past due */}
                {isPastDue ? (
                  <span
                    title="Past due — cannot change"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={handleToggleComplete}
                    disabled={toggling}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 active:scale-95 cursor-pointer font-medium ${
                      isCompleted
                        ? 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {isCompleted && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {toggling ? '...' : isCompleted ? 'Mark as Incomplete' : 'Mark complete'}
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 text-gray-600 dark:text-gray-300 transition-all duration-150 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module</label>
                  <input type="text" value={form.moduleCode} onChange={e => setForm(p => ({ ...p, moduleCode: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputClass}>
                    {['ASSIGNMENT', 'PROJECT', 'EXAM', 'QUIZ'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due time</label>
                  <input type="time" value={form.dueTime} onChange={e => setForm(p => ({ ...p, dueTime: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Weightage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.weightage || ''}
                    onChange={e => setForm(p => ({ ...p, weightage: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="e.g. 15"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
                    {['CONFIRMED', 'COMPLETED', 'PENDING_DATE', 'NEEDS_REVIEW'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Note</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer font-medium"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskModal