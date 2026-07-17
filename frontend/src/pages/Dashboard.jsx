import { useState } from 'react'
import { updateTask } from '../api/api'
import { useTasks } from '../hooks/useTasks.jsx'
import TaskModal from '../components/TaskModal'

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-2 flex items-center gap-3 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
      </div>
      <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
    </div>
  )
}

function Dashboard() {
  const { tasks, loading, updateTaskInState, deleteTaskFromState } = useTasks()
  const [selectedTask, setSelectedTask] = useState(null)

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

  const pastDueTasks = tasks.filter(task =>
    task.status === 'COMPLETED' && task.dueDate && new Date(task.dueDate) < today
  )

  const completedTasks = tasks.filter(task =>
    task.status === 'COMPLETED' && (!task.dueDate || new Date(task.dueDate) >= today)
  )

  const handleTaskUpdated = (updated) => {
    updateTaskInState(updated)
    setSelectedTask(null)
  }

  const handleTaskDeleted = (id) => {
    deleteTaskFromState(id)
    setSelectedTask(null)
  }

  const isPastDue = (task) => task.dueDate && new Date(task.dueDate) < today

  const handleToggleComplete = async (e, task) => {
    e.stopPropagation()
    if (isPastDue(task)) return
    const isCompleted = task.status === 'COMPLETED'
    const updated = { ...task, status: isCompleted ? 'CONFIRMED' : 'COMPLETED', user: { id: task.userId } }
    await updateTask(task.id, updated)
    updateTaskInState({ ...task, status: updated.status })
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

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Upcoming Deadlines</h1>
      </div>

      {/* Metric cards — show skeleton while loading */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {loading
          ? [0,1,2,3].map(i => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            ))
          : [
              { label: 'Total tasks', value: total, color: 'text-gray-900 dark:text-gray-100' },
              { label: 'Due this week', value: dueThisWeek, color: 'text-red-600 dark:text-red-400' },
              { label: 'Needs review', value: needsReview, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Completed', value: completed, color: 'text-green-600 dark:text-green-400' },
            ].map(card => (
              <div key={card.label} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
                <div className={`text-2xl font-medium ${card.color}`}>{card.value}</div>
              </div>
            ))
        }
      </div>

      {/* Loading skeletons for task list */}
      {loading && (
        <div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3 animate-pulse" />
          {[0,1,2].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* This week */}
      {!loading && thisWeekTasks.length > 0 && (
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
      {!loading && laterTasks.length > 0 && (
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
      {!loading && pastDueTasks.length > 0 && (
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
      {!loading && completedTasks.length > 0 && (
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
      {!loading && tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <div className="text-sm">No tasks yet — add your courses to get started</div>
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