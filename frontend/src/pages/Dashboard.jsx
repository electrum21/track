import { useState, useEffect } from 'react'
import { getTasks, uploadCourseFile, createTask, getCourses, updateTask } from '../api/api'
import TaskModal from '../components/TaskModal'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '', moduleCode: '', type: 'ASSIGNMENT',
    dueDate: '', dueTime: '', weightage: '', note: ''
  })
  const [creating, setCreating] = useState(false)
  const [showTaskOptions, setShowTaskOptions] = useState(false)
  const [courses, setCourses] = useState([])
  const [showModuleDropdown, setShowModuleDropdown] = useState(false)

  useEffect(() => {
    const handleClickOutside = () => setShowTaskOptions(false)
    if (showTaskOptions) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
    }, [showTaskOptions])

  useEffect(() => {
    getTasks().then(data => {
      setTasks(data)
      // Auto-complete past due tasks
      const toComplete = data.filter(t =>
        t.dueDate && t.status === 'CONFIRMED' && new Date(t.dueDate) < new Date()
      )
      if (toComplete.length > 0) {
        Promise.all(toComplete.map(t =>
          updateTask(t.id, { ...t, status: 'COMPLETED', user: { id: t.userId } })
        )).then(() => {
          setTasks(prev => prev.map(t =>
            toComplete.find(c => c.id === t.id) ? { ...t, status: 'COMPLETED' } : t
          ))
        })
      }
    })
    getCourses().then(data => setCourses(data))
  }, [])

  const today = new Date()
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const total = tasks.length

  const dueThisWeek = tasks.filter(task => {
    if (!task.dueDate) return false
    const due = new Date(task.dueDate)
    return due >= today && due <= sevenDaysFromNow
  }).length

  const needsReview = tasks.filter(task =>
    task.status === 'NEEDS_REVIEW' || task.status === 'PENDING_DATE'
  ).length

  const completed = tasks.filter(task =>
    task.status === 'COMPLETED'
  ).length

  const thisWeekTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'COMPLETED') return false
    const due = new Date(task.dueDate)
    return due >= today && due <= sevenDaysFromNow
  })

  const laterTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'COMPLETED') return false
    const due = new Date(task.dueDate)
    return due > sevenDaysFromNow
  })

  // Past due = completed tasks that were auto-completed (past their deadline)
  const pastDueTasks = tasks.filter(task =>
    task.status === 'COMPLETED' && task.dueDate && new Date(task.dueDate) < today
  )

  // Manually completed = completed before deadline
  const completedTasks = tasks.filter(task =>
    task.status === 'COMPLETED' && (!task.dueDate || new Date(task.dueDate) >= today)
  )

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const result = await uploadCourseFile(file)
      const { courses: newCourses, tasks: newTasks } = result
      if (newCourses && newCourses.length > 0) {
        setCourses(prev => {
          let updated = [...prev]
          newCourses.forEach(course => {
            const idx = updated.findIndex(c => c.id === course.id)
            if (idx >= 0) updated[idx] = course
            else updated.push(course)
          })
          return updated
        })
      }
      if (newTasks && newTasks.length > 0) {
        setTasks(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          return [...prev, ...newTasks.filter(t => !existingIds.has(t.id))]
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
    }
    setUploading(false)
  }

  const handleCreateTask = async () => {
    if (!createForm.title.trim()) return
    setCreating(true)
    const saved = await createTask({
      title: createForm.title,
      moduleCode: createForm.moduleCode || null,
      type: createForm.type,
      dueDate: createForm.dueDate || null,
      dueTime: createForm.dueTime ? createForm.dueTime + ':00' : null,
      weightage: createForm.weightage ? parseFloat(createForm.weightage) : null,
      note: createForm.note || null,
      status: createForm.dueDate ? 'CONFIRMED' : 'PENDING_DATE',
    })
    setTasks(prev => [...prev, saved])
    setCreateForm({ title: '', moduleCode: '', type: 'ASSIGNMENT', dueDate: '', dueTime: '', weightage: '', note: '' })
    setShowCreateForm(false)
    setCreating(false)
  }

  const handleTaskUpdated = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(null)
  }

  const handleTaskDeleted = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTask(null)
  }

  const isPastDue = (task) => task.dueDate && new Date(task.dueDate) < today

  const handleToggleComplete = async (e, task) => {
    e.stopPropagation()
    // Past due tasks are locked — auto-completed and cannot be changed
    if (isPastDue(task)) return
    const isCompleted = task.status === 'COMPLETED'
    const updated = { ...task, status: isCompleted ? 'CONFIRMED' : 'COMPLETED', user: { id: task.userId } }
    await updateTask(task.id, updated)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: updated.status } : t))
  }

  const getUrgencyColor = (dueDate) => {
    if (!dueDate) return 'bg-gray-100 dark:bg-gray-800'
    const due = new Date(dueDate)
    const diff = (due - today) / (1000 * 60 * 60 * 24)
    if (diff <= 1) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (diff <= 3) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }

  const getDaysLabel = (dueDate) => {
    if (!dueDate) return ''
    const due = new Date(dueDate)
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return 'Due today'
    if (diff === 1) return 'Due tomorrow'
    if (diff <= 7) return `${diff} days`
    return `in ${diff} days`
  }

  const getDotColor = (dueDate) => {
    if (!dueDate) return 'bg-gray-300 dark:bg-gray-600'
    const due = new Date(dueDate)
    const diff = (due - today) / (1000 * 60 * 60 * 24)
    if (diff <= 1) return 'bg-red-400'
    if (diff <= 3) return 'bg-amber-400'
    return 'bg-green-400'
  }

  const inputClass = "mt-1 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Upcoming Deadlines</h1>
        <div className="relative">
            <button
            onClick={(e) => { e.stopPropagation(); setShowTaskOptions(prev => !prev) }}
            className="text-xs px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 text-gray-700 dark:text-gray-300 cursor-pointer"
            >
            {uploading ? 'Uploading...' : '+ Add Task Information'}
            </button>

            {showTaskOptions && (
            <div
                className="absolute right-0 top-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg z-10 overflow-hidden w-40"
                onClick={e => e.stopPropagation()}
            >
                <label className="block text-xs px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-150">
                Upload Course Assessment Slides
                <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.pptx,image/*"
                    onChange={(e) => { setShowTaskOptions(false); handleUpload(e) }}
                />
                </label>
                <button
                onClick={() => { setShowTaskOptions(false); setShowCreateForm(true) }}
                className="block w-full text-left text-xs px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 border-t border-gray-100 dark:border-gray-800 cursor-pointer"
                >
                Manual Entry
                </button>
            </div>
            )}
        </div>
        </div>
      {/* Create task form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">New task</span>
            <button onClick={() => setShowCreateForm(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Title</label>
              <input type="text" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Assignment 1" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={createForm.moduleCode}
                  onChange={e => {
                    setCreateForm(p => ({ ...p, moduleCode: e.target.value.toUpperCase() }))
                    setShowModuleDropdown(true)
                  }}
                  onFocus={() => setShowModuleDropdown(true)}
                  onBlur={() => setTimeout(() => setShowModuleDropdown(false), 150)}
                  placeholder="e.g. CS2040"
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {showModuleDropdown && (() => {
                  const filtered = courses.filter(c =>
                    c.moduleCode.includes(createForm.moduleCode.toUpperCase()) ||
                    createForm.moduleCode === ''
                  )
                  return filtered.length > 0 ? (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {filtered.map(c => (
                        <button
                          key={c.id}
                          onMouseDown={() => {
                            setCreateForm(p => ({ ...p, moduleCode: c.moduleCode }))
                            setShowModuleDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">{c.moduleCode}</span>
                          {c.name && <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{c.name}</span>}
                        </button>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Type</label>
              <select value={createForm.type} onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))} className={inputClass}>
                {['ASSIGNMENT', 'PROJECT', 'EXAM', 'QUIZ'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due date</label>
              <input type="date" value={createForm.dueDate} onChange={e => setCreateForm(p => ({ ...p, dueDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due time</label>
              <input type="time" value={createForm.dueTime} onChange={e => setCreateForm(p => ({ ...p, dueTime: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Weightage (%)</label>
              <input type="number" min="0" max="100" value={createForm.weightage} onChange={e => setCreateForm(p => ({ ...p, weightage: e.target.value }))} placeholder="e.g. 15" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Note</label>
              <input type="text" value={createForm.note} onChange={e => setCreateForm(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              disabled={creating || !createForm.title.trim()}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 font-medium cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Saving...' : 'Save task'}
            </button>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total tasks', value: total, color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Due this week', value: dueThisWeek, color: 'text-red-600 dark:text-red-400' },
          { label: 'Needs review', value: needsReview, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Completed', value: completed, color: 'text-green-600 dark:text-green-400' },
        ].map(card => (
          <div key={card.label} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
            <div className={`text-2xl font-medium ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* This week */}
      {thisWeekTasks.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            This week
          </div>
          {thisWeekTasks.map(task => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-2 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-150"
            >
              <button
                onClick={e => handleToggleComplete(e, task)}
                disabled={isPastDue(task)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isPastDue(task) ? 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-40' : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 cursor-pointer'}`}
              />
              <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {task.title}{task.weightage && ` (${task.weightage}%)`}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {task.moduleCode && `${task.moduleCode} · `}{task.type}
                  {task.dueTime && ` · ${task.dueTime.slice(0, 5)}`}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getUrgencyColor(task.dueDate)}`}>
                {getDaysLabel(task.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Later */}
      {laterTasks.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            Later
          </div>
          {laterTasks.map(task => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-2 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-150"
            >
              <button
                onClick={e => handleToggleComplete(e, task)}
                disabled={isPastDue(task)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isPastDue(task) ? 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-40' : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 cursor-pointer'}`}
              />
              <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {task.title}{task.weightage && ` (${task.weightage}%)`}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {task.moduleCode && `${task.moduleCode} · `}{task.type}
                  {task.dueTime && ` · ${task.dueTime.slice(0, 5)}`}
                </div>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {getDaysLabel(task.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Past due */}
      {pastDueTasks.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            Past due
          </div>
          {pastDueTasks.map(task => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-2 flex items-center gap-3 opacity-50"
            >
              <button
                disabled
                title="Past due — cannot unmark"
                className="w-5 h-5 rounded-full bg-green-400 dark:bg-green-500 flex items-center justify-center flex-shrink-0 cursor-not-allowed"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">
                  {task.title}{task.weightage && ` (${task.weightage}%)`}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {task.moduleCode && `${task.moduleCode} · `}{task.type}
                  {task.dueDate && ` · ${new Date(task.dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            Completed
          </div>
          {completedTasks.map(task => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-2 flex items-center gap-3 opacity-60 hover:opacity-80 transition-all duration-150"
            >
              <button
                onClick={e => handleToggleComplete(e, task)}
                disabled={isPastDue(task)}
                title={isPastDue(task) ? 'Past due — cannot unmark' : 'Mark as incomplete'}
                className={`w-5 h-5 rounded-full bg-green-400 dark:bg-green-500 flex items-center justify-center flex-shrink-0 ${isPastDue(task) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-green-500 dark:hover:bg-green-400'} transition-colors`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">
                  {task.title}{task.weightage && ` (${task.weightage}%)`}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {task.moduleCode && `${task.moduleCode} · `}{task.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <div className="text-sm">No tasks yet — upload your slides to get started</div>
        </div>
      )}

      {/* Full-screen parsing overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-xl">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Parsing file...</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">Extracting tasks from your document</div>
            </div>
          </div>
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

export default Dashboard