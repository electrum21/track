import { useState } from 'react'
import { createTask } from '../api/api'

// Quick "create a task" modal. Used from Calendar's semester view (double-click a
// week/module cell: module is locked, due date defaults to that week's start) and
// month view (double-click a day: due date is locked to that day, module is free-pick).
function AddTaskModal({ courses, initialModuleCode = '', initialDueDate = '', lockModule = false, lockDueDate = false, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    moduleCode: initialModuleCode || '',
    type: 'ASSIGNMENT',
    dueDate: initialDueDate || '',
    dueTime: '',
    weightage: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false)

  const myModuleCodes = (courses || []).map(c => c.moduleCode).sort((a, b) => a.localeCompare(b))
  const moduleError = form.moduleCode && !myModuleCodes.includes(form.moduleCode.toUpperCase())
    ? `"${form.moduleCode}" is not in your modules. Add it first if you want to file this task there.`
    : null

  const inputClass = "mt-1 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"

  const handleCreate = async () => {
    if (!form.title.trim() || moduleError) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await createTask({
        title: form.title,
        moduleCode: form.moduleCode || null,
        type: form.type,
        dueDate: form.dueDate || null,
        dueTime: form.dueTime ? form.dueTime + ':00' : null,
        weightage: form.weightage ? parseFloat(form.weightage) : null,
        note: form.note || null,
        status: form.dueDate ? 'CONFIRMED' : 'PENDING_DATE',
      })
      onCreated(saved)
    } catch (err) {
      setSaveError(err.message || 'Could not create task. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 border border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Add task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:scale-95 transition-all duration-150 cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Title</label>
            <input
              type="text"
              autoFocus
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Assignment 2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module</label>
              <input
                type="text"
                autoComplete="off"
                disabled={lockModule}
                value={form.moduleCode}
                onChange={e => setForm(p => ({ ...p, moduleCode: e.target.value.toUpperCase() }))}
                onFocus={() => setModuleDropdownOpen(true)}
                onBlur={() => setTimeout(() => setModuleDropdownOpen(false), 150)}
                className={inputClass}
              />
              {!lockModule && moduleDropdownOpen && myModuleCodes.length > 0 && (() => {
                const matches = myModuleCodes.filter(code => !form.moduleCode || code.includes(form.moduleCode))
                return (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                    {matches.length > 0 ? matches.map(code => (
                      <button
                        key={code}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setForm(p => ({ ...p, moduleCode: code })); setModuleDropdownOpen(false) }}
                        className="block w-full text-left text-xs px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        {code}
                      </button>
                    )) : (
                      <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No matching modules</div>
                    )}
                  </div>
                )
              })()}
              {moduleError && (
                <div className="text-xs text-red-500 dark:text-red-400 mt-1">{moduleError}</div>
              )}
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
              <input
                type="date"
                disabled={lockDueDate}
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                className={inputClass}
              />
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
                value={form.weightage}
                onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))}
                placeholder="e.g. 15"
                className={inputClass}
              />
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

        <div className="flex justify-between items-start">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex flex-col items-end gap-1.5">
            {saveError && <div className="text-xs text-red-500 dark:text-red-400 max-w-[220px] text-right">{saveError}</div>}
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !!moduleError}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddTaskModal