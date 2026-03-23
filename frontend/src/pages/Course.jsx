import { useState, useEffect } from 'react'
import { getTasks, updateTask, getCourses, createCourse, updateCourse, deleteCourse, deleteTask, uploadCourseFile } from '../api/api'
import TaskModal from '../components/TaskModal'

function Course() {
  const [tasks, setTasks] = useState([])
  const [courses, setCourses] = useState([])
  const [selectedMod, setSelectedMod] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [addForm, setAddForm] = useState({ code: '', name: '', prof: '', examDate: '', examVenue: '' })
  const [extracting, setExtracting] = useState(false)
  const [editingMod, setEditingMod] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', prof: '', examDate: '', examVenue: '' })
  const [selectedTask, setSelectedTask] = useState(null)
  const [confirmDeregister, setConfirmDeregister] = useState(null)
  const [deregistering, setDeregistering] = useState(false)

  useEffect(() => {
    getTasks().then(data => setTasks(data))
    getCourses().then(data => setCourses(data))
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setShowAddOptions(false)
    if (showAddOptions) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showAddOptions])

  const modules = [...new Set([
    ...courses.map(c => c.moduleCode),
    ...tasks.map(t => t.moduleCode).filter(Boolean)
  ])].sort()

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setExtracting(true)
    try {
      const result = await uploadCourseFile(file)
      const { courses: newCourses, tasks: newTasks } = result
      if (!newCourses || newCourses.length === 0) { console.error('Upload failed: no courses returned', result); return }
      // Upsert all courses in local state
      setCourses(prev => {
        let updated = [...prev]
        newCourses.forEach(course => {
          const idx = updated.findIndex(c => c.id === course.id)
          if (idx >= 0) updated[idx] = course
          else updated.push(course)
        })
        return updated
      })
      // Add new tasks
      if (newTasks && newTasks.length > 0) {
        setTasks(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          return [...prev, ...newTasks.filter(t => !existingIds.has(t.id))]
        })
      }
      setSelectedMod(newCourses[0].moduleCode)
    } catch (err) {
      console.error('Upload error:', err)
    }
    setExtracting(false)
  }

  const handleAddCourse = async () => {
    const code = addForm.code.trim().toUpperCase()
    if (!code) return
    const saved = await createCourse({
      moduleCode: code,
      name: addForm.name,
      prof: addForm.prof,
      examDate: addForm.examDate || null,
      examVenue: addForm.examVenue
    })
    setCourses(prev => [...prev, saved])
    setAddForm({ code: '', name: '', prof: '', examDate: '', examVenue: '' })
    setShowAddForm(false)
    setExtracted(false)
  }

  const handleSaveEdit = async (mod) => {
    const course = courses.find(c => c.moduleCode === mod)
    if (!course) return
    const newCode = (editForm.moduleCode || mod).trim().toUpperCase()
    const updated = await updateCourse(course.id, {
      moduleCode: newCode,
      name: editForm.name,
      prof: editForm.prof,
      examDate: editForm.examDate || null,
      examVenue: editForm.examVenue
    })
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c))
    // Remap tasks in local state if the module code changed
    if (newCode !== mod) {
      setTasks(prev => prev.map(t => t.moduleCode === mod ? { ...t, moduleCode: newCode } : t))
    }
    // Keep the detail panel open on the (possibly renamed) course
    setSelectedMod(newCode)
    setEditingMod(null)
  }

  const handleDeleteCourse = async (mod) => {
    const course = courses.find(c => c.moduleCode === mod)
    if (!course) return
    await deleteCourse(course.id)
    setCourses(prev => prev.filter(c => c.moduleCode !== mod))
    setSelectedMod(null)
  }

  const handleDeregister = async () => {
    if (!confirmDeregister) return
    setDeregistering(true)
    const course = courses.find(c => c.moduleCode === confirmDeregister)
    if (course) await deleteCourse(course.id)
    const modTasks = tasks.filter(t => t.moduleCode === confirmDeregister)
    await Promise.all(modTasks.map(t => deleteTask(t.id)))
    setCourses(prev => prev.filter(c => c.moduleCode !== confirmDeregister))
    setTasks(prev => prev.filter(t => t.moduleCode !== confirmDeregister))
    if (selectedMod === confirmDeregister) setSelectedMod(null)
    setConfirmDeregister(null)
    setDeregistering(false)
  }

  const handleToggleComplete = async (e, task) => {
    e.stopPropagation()
    const isPastDue = task.dueDate && new Date(task.dueDate) < new Date()
    if (isPastDue) return
    const newStatus = task.status === 'COMPLETED' ? 'CONFIRMED' : 'COMPLETED'
    const updated = { ...task, status: newStatus, user: { id: task.userId } }
    await updateTask(task.id, updated)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const handleTaskUpdated = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(null)
  }

  const handleTaskDeleted = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTask(null)
  }

  const typeColor = (type) => {
    switch (type) {
      case 'EXAM': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'PROJECT': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'QUIZ': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const getModStats = (mod) => {
    const modTasks = tasks.filter(t => t.moduleCode === mod)
    const completed = modTasks.filter(t => t.status === 'COMPLETED').length
    const review = modTasks.filter(t => t.status === 'NEEDS_REVIEW' || t.status === 'PENDING_DATE').length
    const upcoming = modTasks.filter(t => t.status === 'CONFIRMED').length
    return { total: modTasks.length, completed, review, upcoming }
  }

  const inputClass = "mt-1 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Courses</h1>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddOptions(prev => !prev) }}
            className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 text-gray-600 dark:text-gray-300 transition-all duration-150 cursor-pointer"
          >
            {extracting ? 'Uploading & parsing...' : '+ Add Course Information'}
          </button>
          {showAddOptions && (
            <div
              className="absolute right-0 top-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg z-10 overflow-hidden w-36"
              onClick={e => e.stopPropagation()}
            >
              <label className="block text-xs px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-150">
                Upload & Parse File
                <input type="file" className="hidden" accept=".pdf,.docx,.pptx,image/*" onChange={(e) => { setShowAddOptions(false); handleFileUpload(e) }} />
              </label>
              <button
                onClick={() => { setShowAddOptions(false); setShowAddForm(true); setExtracted(false); setAddForm({ code: '', name: '', prof: '', examDate: '', examVenue: '' }) }}
                className="block w-full text-left text-xs px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 border-t border-gray-100 dark:border-gray-800 cursor-pointer"
              >
                Manual Entry
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">New course</span>

            </div>
            <button onClick={() => setShowAddForm(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-all duration-150">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module code</label><input type="text" value={addForm.code} onChange={e => setAddForm(p => ({ ...p, code: e.target.value }))} onBlur={e => {
                const code = e.target.value.trim().toUpperCase()
                const existing = courses.find(c => c.moduleCode === code)
                if (existing) setAddForm(p => ({
                  ...p,
                  name: existing.name || p.name,
                  prof: existing.prof || p.prof,
                  examDate: existing.examDate || p.examDate,
                  examVenue: existing.examVenue || p.examVenue,
                }))
              }} placeholder="e.g. CS2040" className={inputClass} /></div>
            <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Course name</label><input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Structures" className={inputClass} /></div>
            <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Professor</label><input type="text" value={addForm.prof} onChange={e => setAddForm(p => ({ ...p, prof: e.target.value }))} placeholder="e.g. Prof Chan" className={inputClass} /></div>
            <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Exam date</label><input type="date" value={addForm.examDate} onChange={e => setAddForm(p => ({ ...p, examDate: e.target.value }))} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Exam venue</label><input type="text" value={addForm.examVenue} onChange={e => setAddForm(p => ({ ...p, examVenue: e.target.value }))} placeholder="e.g. SPMS LT" className={inputClass} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddForm({ code: addForm.code, name: '', prof: '', examDate: '', examVenue: '' })} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer">Clear</button>
            <button onClick={() => setShowAddForm(false)} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer">Cancel</button>
            <button onClick={handleAddCourse} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 font-medium cursor-pointer">Save</button>
          </div>
        </div>
      )}

      {/* Course cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {modules.map(mod => {
          const details = courses.find(c => c.moduleCode === mod) || {}
          const stats = getModStats(mod)
          const isSelected = selectedMod === mod
          return (
            <div
              key={mod}
              onClick={() => setSelectedMod(isSelected ? null : mod)}
              className={`bg-white dark:bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all duration-150 relative ${
                isSelected ? 'border-gray-400 dark:border-gray-500' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {/* Header row with module code and deregister button */}
              <div className="flex justify-between items-start mb-0.5">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{mod}</div>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDeregister(mod) }}
                  className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-all duration-150 cursor-pointer ml-2 flex-shrink-0"
                  title="Deregister from course"
                >
                  ✕
                </button>
              </div>

              {details.name
                ? <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 truncate">{details.name}</div>
                : <div className="mb-3" />
              }
              {(details.prof || details.examDate) && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 space-y-0.5">
                  {details.prof && <div>{details.prof}</div>}
                  {details.examDate && <div>Exam · {new Date(details.examDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</div>}
                </div>
              )}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                <div className="flex justify-between">
                  {[
                    { label: 'Tasks', value: stats.total, color: 'text-gray-900 dark:text-gray-100' },
                    { label: 'Done', value: stats.completed, color: 'text-green-600 dark:text-green-400' },
                    { label: 'Review', value: stats.review, color: 'text-amber-500 dark:text-amber-400' },
                    { label: 'Up next', value: stats.upcoming, color: 'text-blue-600 dark:text-blue-400' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className={`text-base font-medium ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>
                {stats.total > 0 && (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-0.5 mt-3">
                    <div className="bg-green-400 h-0.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((stats.completed / stats.total) * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected course detail panel */}
      {selectedMod && (() => {
        const details = courses.find(c => c.moduleCode === selectedMod) || {}
        const modTasks = tasks.filter(t => t.moduleCode === selectedMod)
        const isEditing = editingMod === selectedMod
        return (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <div>
                <div className="text-base font-medium text-gray-900 dark:text-gray-100">{selectedMod}</div>
                {details.name && <div className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{details.name}</div>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleSaveEdit(selectedMod)
                    } else {
                      setEditingMod(selectedMod)
                      const course = courses.find(c => c.moduleCode === selectedMod) || {}
                      setEditForm({ moduleCode: course.moduleCode || '', name: course.name || '', prof: course.prof || '', examDate: course.examDate || '', examVenue: course.examVenue || '' })
                    }
                  }}
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 text-gray-500 dark:text-gray-400 transition-all duration-150 cursor-pointer"
                >
                  {isEditing ? 'Save' : 'Edit'}
                </button>
                <button
                  onClick={() => setConfirmDeregister(selectedMod)}
                  className="text-xs px-3 py-1.5 border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 text-red-400 transition-all duration-150 cursor-pointer"
                >
                  Deregister from Course
                </button>
              </div>
            </div>

            {isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module code</label><input type="text" value={editForm.moduleCode || ''} onChange={e => setEditForm(p => ({ ...p, moduleCode: e.target.value.toUpperCase() }))} placeholder="e.g. CS2040" className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Course name</label><input type="text" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Structures" className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Professor</label><input type="text" value={editForm.prof || ''} onChange={e => setEditForm(p => ({ ...p, prof: e.target.value }))} placeholder="e.g. Prof Chan" className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Exam date</label><input type="date" value={editForm.examDate || ''} onChange={e => setEditForm(p => ({ ...p, examDate: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Exam venue</label><input type="text" value={editForm.examVenue || ''} onChange={e => setEditForm(p => ({ ...p, examVenue: e.target.value }))} placeholder="e.g. SPMS LT" className={inputClass} /></div>
              </div>
            )}

            {!isEditing && (details.prof || details.examDate || details.examVenue) && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500 mb-4">
                {details.prof && <span>{details.prof}</span>}
                {details.examDate && <span>Exam · {new Date(details.examDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                {details.examVenue && <span>{details.examVenue}</span>}
              </div>
            )}

            {modTasks.length === 0 && (
              <div className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">No tasks uploaded for this module yet</div>
            )}

            {modTasks.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Tasks</div>
                {modTasks.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0
                    if (!a.dueDate) return 1
                    if (!b.dueDate) return -1
                    return new Date(a.dueDate) - new Date(b.dueDate)
                    }).map(task => {
                    const isPastDue = task.dueDate && new Date(task.dueDate) < new Date()
                    const isCompleted = task.status === 'COMPLETED'
                    return (
                        <div key={task.id} className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-800">
                        <div
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => setSelectedTask(task)}
                        >
                            {isPastDue ? (
                            <div
                                title="Deadline has passed — cannot change"
                                className="w-4 h-4 rounded-full bg-green-400 dark:bg-green-500 flex items-center justify-center flex-shrink-0 cursor-not-allowed opacity-60"
                            >
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            ) : isCompleted ? (
                            <button
                                onClick={e => handleToggleComplete(e, task)}
                                title="Mark as incomplete"
                                className="w-4 h-4 rounded-full bg-green-400 dark:bg-green-500 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-green-500 transition-colors"
                            >
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            ) : (
                            <button
                                onClick={e => handleToggleComplete(e, task)}
                                title="Mark as complete"
                                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0 cursor-pointer hover:border-green-400 dark:hover:border-green-500 transition-colors"
                            />
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline w-24 text-center ${typeColor(task.type)}`}>{task.type}</span>
                            <div>
                            <span className={`text-sm ${
                                isCompleted
                                ? 'line-through text-gray-300 dark:text-gray-600'
                                : isPastDue
                                ? 'text-gray-400 dark:text-gray-600'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                                {task.title}
                            </span>
                            {task.weightage && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{task.weightage}%</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs ${isPastDue && !isCompleted ? 'text-gray-400 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : '—'}
                            {task.dueTime && ` · ${task.dueTime.slice(0, 5)}`}
                            </span>

                        </div>
                        </div>
                    )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {modules.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">Add your first course to get started</div>
      )}

      {/* Full-screen parsing overlay */}
      {extracting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-xl">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Parsing file...</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">Extracting course and task info</div>
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

      {/* Deregister confirmation modal */}
      {confirmDeregister && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setConfirmDeregister(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5">
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                Deregister from {confirmDeregister}?
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                This will permanently remove the course and all {tasks.filter(t => t.moduleCode === confirmDeregister).length} associated tasks. This cannot be undone.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeregister(null)}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeregister}
                disabled={deregistering}
                className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all duration-150 cursor-pointer font-medium"
              >
                {deregistering ? 'Removing...' : 'Deregister'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Course