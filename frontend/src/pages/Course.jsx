import { useState, useEffect } from 'react'
import { getTasks, updateTask, getCourses, createCourse, createTask, updateCourse, deleteCourse, deleteTask, uploadCourseFile, confirmCourseUpload } from '../api/api'
import { validateUploadFile } from '../utils/fileValidation'
import TaskModal from '../components/TaskModal'
import CourseCatalog from '../components/CourseCatalog'

function Course() {
  const [activeTab, setActiveTab] = useState('my')
  const [tasks, setTasks] = useState([])
  const [courses, setCourses] = useState([])
  const [selectedMod, setSelectedMod] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [catalogAddError, setCatalogAddError] = useState(null)
  const [editingMod, setEditingMod] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', prof: '', examDate: '', examVenue: '' })
  const [selectedTask, setSelectedTask] = useState(null)
  const [confirmDeregister, setConfirmDeregister] = useState(null)
  const [deregistering, setDeregistering] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)
  const [confirmingAdd, setConfirmingAdd] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({ title: '', type: 'ASSIGNMENT', dueDate: '', dueTime: '', weightage: '', note: '' })
  const [creatingTask, setCreatingTask] = useState(false)
  const [moduleMismatch, setModuleMismatch] = useState(null)
  const [confirmingMismatchAdd, setConfirmingMismatchAdd] = useState(false)

  useEffect(() => {
    getTasks().then(data => setTasks(data))
    getCourses().then(data => setCourses(data))
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setShowAddMenu(false)
    if (showAddMenu) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showAddMenu])

  const modules = [...new Set([
    ...courses.map(c => c.moduleCode),
    ...tasks.map(t => t.moduleCode).filter(Boolean)
  ])].sort()

  // Merges saved courses/tasks into local state — shared by the direct-save path
  // and the confirm-add path below.
  const applyUploadResult = (newCourses, newTasks) => {
    setCourses(prev => {
      let updated = [...prev]
      newCourses.forEach(course => {
        const idx = updated.findIndex(c => c.id === course.id)
        if (idx >= 0) updated[idx] = course
        else updated.push(course)
      })
      return updated
    })
    if (newTasks && newTasks.length > 0) {
      setTasks(prev => {
        const existingIds = new Set(prev.map(t => t.id))
        return [...prev, ...newTasks.filter(t => !existingIds.has(t.id))]
      })
    }
    if (newCourses.length > 0) setSelectedMod(newCourses[0].moduleCode)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    if (!selectedMod) return
    const err = validateUploadFile(file)
    if (err) { setUploadError(err); return }
    setUploadError(null)
    setExtracting(true)
    try {
      const result = await uploadCourseFile(file, selectedMod)
      if (result.moduleMismatch) {
        // The file doesn't seem to reference the module we're viewing — nothing saved yet.
        // Hold the extracted data and let the user decide whether to add it anyway.
        setModuleMismatch({
          expectedModule: result.expectedModule,
          detectedModules: result.detectedModules || [],
          courses: result.courses,
          tasks: result.tasks
        })
        setExtracting(false)
        return
      }
      if (result.needsConfirmation) {
        // Nothing saved yet — hold the extracted data and ask the user to confirm.
        setPendingUpload({
          missingModules: result.missingModules,
          courses: result.courses,
          tasks: result.tasks
        })
        setExtracting(false)
        return
      }
      const { courses: newCourses, tasks: newTasks } = result
      if (!newCourses || newCourses.length === 0) { console.error('Upload failed: no courses returned', result); setExtracting(false); return }
      applyUploadResult(newCourses, newTasks)
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Upload failed. Please try again.')
    }
    setExtracting(false)
  }

  const handleConfirmMismatchAdd = async () => {
    if (!moduleMismatch) return
    setConfirmingMismatchAdd(true)
    try {
      const result = await confirmCourseUpload(moduleMismatch.courses, moduleMismatch.tasks)
      applyUploadResult(result.courses || [], result.tasks || [])
      setModuleMismatch(null)
    } catch (err) {
      console.error('Confirm mismatch add error:', err)
      setUploadError(err.message || 'Could not add the tasks. Please try again.')
      setModuleMismatch(null)
    }
    setConfirmingMismatchAdd(false)
  }

  const handleCreateManualTask = async () => {
    if (!manualForm.title.trim() || !selectedMod) return
    setCreatingTask(true)
    try {
      const saved = await createTask({
        title: manualForm.title,
        moduleCode: selectedMod,
        type: manualForm.type,
        dueDate: manualForm.dueDate || null,
        dueTime: manualForm.dueTime ? manualForm.dueTime + ':00' : null,
        weightage: manualForm.weightage ? parseFloat(manualForm.weightage) : null,
        note: manualForm.note || null,
        status: manualForm.dueDate ? 'CONFIRMED' : 'PENDING_DATE',
      })
      setTasks(prev => [...prev, saved])
      setManualForm({ title: '', type: 'ASSIGNMENT', dueDate: '', dueTime: '', weightage: '', note: '' })
      setShowManualForm(false)
    } catch (err) {
      console.error('Create task error:', err)
    }
    setCreatingTask(false)
  }

  const handleConfirmAddCourse = async () => {
    if (!pendingUpload) return
    setConfirmingAdd(true)
    try {
      const result = await confirmCourseUpload(pendingUpload.courses, pendingUpload.tasks)
      applyUploadResult(result.courses || [], result.tasks || [])
      setPendingUpload(null)
    } catch (err) {
      console.error('Confirm add module error:', err)
      setUploadError(err.message || 'Could not add the module. Please try again.')
      setPendingUpload(null)
    }
    setConfirmingAdd(false)
  }

  // Adds a course from the Course Catalog tab — replaces the old flow of
  // manually typing the module code and course name.
  const handleAddFromCatalog = async (mod) => {
    if (courses.some(c => c.moduleCode === mod.moduleCode)) return
    setCatalogAddError(null)
    try {
      const saved = await createCourse({
        moduleCode: mod.moduleCode,
        name: mod.name
      })
      setCourses(prev => [...prev, saved])
    } catch (err) {
      console.error('Failed to add module from catalog:', err)
      setCatalogAddError(`Could not add ${mod.moduleCode}. Please try again.`)
    }
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

  const tabButtonClass = (tab) =>
    `text-sm px-1 pb-3 -mb-px border-b-2 transition-all duration-150 cursor-pointer ${
      activeTab === tab
        ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100 font-medium'
        : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
    }`

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Modules</h1>
      </div>

      {/* Subtabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-6">
        <button onClick={() => setActiveTab('my')} className={tabButtonClass('my')}>My Modules</button>
        <button onClick={() => setActiveTab('catalog')} className={tabButtonClass('catalog')}>Module Catalog</button>
      </div>

      {activeTab === 'catalog' && (
        <>
          {catalogAddError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
              {catalogAddError}
              <button onClick={() => setCatalogAddError(null)} className="ml-3 text-red-400 hover:text-red-600 cursor-pointer">✕</button>
            </div>
          )}
          <CourseCatalog courses={courses} onAdd={handleAddFromCatalog} />
        </>
      )}

      {activeTab === 'my' && (
      <>
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
                  title="Deregister from module"
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
                  {isEditing ? 'Save' : 'Edit Module Details'}
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
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module Code</label><input type="text" value={editForm.moduleCode || ''} onChange={e => setEditForm(p => ({ ...p, moduleCode: e.target.value.toUpperCase() }))} placeholder="e.g. CS2040" className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Module Name</label><input type="text" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Structures" className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Professor</label><input type="text" value={editForm.prof || ''} onChange={e => setEditForm(p => ({ ...p, prof: e.target.value }))} placeholder="e.g. Prof Chan" className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Exam Date</label><input type="date" value={editForm.examDate || ''} onChange={e => setEditForm(p => ({ ...p, examDate: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Exam Venue</label><input type="text" value={editForm.examVenue || ''} onChange={e => setEditForm(p => ({ ...p, examVenue: e.target.value }))} placeholder="e.g. SPMS LT" className={inputClass} /></div>
              </div>
            )}

            {!isEditing && (details.prof || details.examDate || details.examVenue) && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500 mb-4">
                {details.prof && <span>{details.prof}</span>}
                {details.examDate && <span>Exam · {new Date(details.examDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                {details.examVenue && <span>{details.examVenue}</span>}
              </div>
            )}

            {uploadError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
                {uploadError}
                <button onClick={() => setUploadError(null)} className="ml-3 text-red-400 hover:text-red-600 cursor-pointer">✕</button>
              </div>
            )}

            {/* Add task controls */}
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tasks</div>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddMenu(prev => !prev) }}
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  {extracting ? 'Uploading...' : '+ Add Task'}
                </button>
                {showAddMenu && (
                  <div
                    className="absolute right-0 top-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg z-10 overflow-hidden w-48"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setShowAddMenu(false); setShowManualForm(true) }}
                      className="block w-full text-left text-xs px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                    >
                      Create New Task Manually
                    </button>
                    <label className="block text-xs px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-150 border-t border-gray-100 dark:border-gray-800">
                      Upload Module Syllabus Slides
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.pptx,image/*"
                        onChange={(e) => { setShowAddMenu(false); handleFileUpload(e) }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Manual task creation form */}
            {showManualForm && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">New task for {selectedMod}</span>
                  <button onClick={() => setShowManualForm(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Title</label>
                    <input type="text" value={manualForm.title} onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Assignment 1" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Type</label>
                    <select value={manualForm.type} onChange={e => setManualForm(p => ({ ...p, type: e.target.value }))} className={inputClass}>
                      {['ASSIGNMENT', 'PROJECT', 'EXAM', 'QUIZ'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due date</label>
                    <input type="date" value={manualForm.dueDate} onChange={e => setManualForm(p => ({ ...p, dueDate: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due time</label>
                    <input type="time" value={manualForm.dueTime} onChange={e => setManualForm(p => ({ ...p, dueTime: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Weightage (%)</label>
                    <input type="number" min="0" max="100" value={manualForm.weightage} onChange={e => setManualForm(p => ({ ...p, weightage: e.target.value }))} placeholder="e.g. 15" className={inputClass} />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Note</label>
                    <input type="text" value={manualForm.note} onChange={e => setManualForm(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" className={inputClass} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowManualForm(false)} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateManualTask}
                    disabled={creatingTask || !manualForm.title.trim()}
                    className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {creatingTask ? 'Saving...' : 'Save task'}
                  </button>
                </div>
              </div>
            )}

            {modTasks.length === 0 && (
              <div className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">No tasks yet for this module — add one above</div>
            )}

            {modTasks.length > 0 && (
              <div>
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
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          No modules yet — add one from the Module Catalog tab to get started
        </div>
      )}
      </>
      )}

      {/* Full-screen parsing overlay */}
      {extracting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-xl">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Parsing file...</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">Extracting module and task info</div>
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
                This will permanently remove the module and all {tasks.filter(t => t.moduleCode === confirmDeregister).length} associated tasks. This cannot be undone.
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
      {/* Confirm add course modal — shown when an upload references a module not yet in the user's courses */}
      {pendingUpload && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => !confirmingAdd && setPendingUpload(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5">
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                {pendingUpload.missingModules.length === 1
                  ? `Add ${pendingUpload.missingModules[0]} to your modules?`
                  : `Add ${pendingUpload.missingModules.join(', ')} to your modules?`}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                {pendingUpload.missingModules.length === 1 ? 'This module isn\'t' : 'These modules aren\'t'} in your modules yet. Add {pendingUpload.missingModules.length === 1 ? 'it' : 'them'} to save the {pendingUpload.tasks.length} task{pendingUpload.tasks.length === 1 ? '' : 's'} found in this file.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingUpload(null)}
                disabled={confirmingAdd}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddCourse}
                disabled={confirmingAdd}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer font-medium"
              >
                {confirmingAdd ? 'Adding...' : 'Add Module'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Module mismatch confirmation modal — shown when an upload's content doesn't seem to match the selected module */}
      {moduleMismatch && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => !confirmingMismatchAdd && setModuleMismatch(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5">
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                This file doesn't look like {moduleMismatch.expectedModule}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                {moduleMismatch.detectedModules.length > 0
                  ? `It looks like it might be about ${moduleMismatch.detectedModules.join(', ')} instead. `
                  : "We couldn't tell which module it's for. "}
                Add the {moduleMismatch.tasks.length} task{moduleMismatch.tasks.length === 1 ? '' : 's'} found anyway, or cancel.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModuleMismatch(null)}
                disabled={confirmingMismatchAdd}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMismatchAdd}
                disabled={confirmingMismatchAdd}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer font-medium"
              >
                {confirmingMismatchAdd ? 'Adding...' : 'Add anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Course