import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTasks, updateTask } from '../api/api'
import { useAuth } from '../AuthContext'

// This file is to solve the problem of:
// Single fetch instead of per-page fetches. Previously, Dashboard, Navbar, and other pages each fetched tasks independently when they mounted. 
// useTasks fetches once when the user logs in and holds the result in memory. Every page that needs tasks reads from that shared state instantly — no waiting for a network call.
// Reactive Navbar badge
// The Navbar needs to know the review count. Before, it had its own getTasks() fetch, meaning it could be stale. 
// Now reviewCount is just a derived value computed from the shared task list — when any page calls updateTaskInState or deleteTaskFromState, the list updates and the badge recalculates immediately everywhere.

const TasksContext = createContext(null)

export function TasksProvider({ children }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(async () => {
    if (!user) return
    try {
      const data = await getTasks()
      const today = new Date()

      // Auto-complete past due tasks
      const toComplete = data.filter(t =>
        t.dueDate && t.status === 'CONFIRMED' && new Date(t.dueDate) < today
      )
      let finalTasks = data
      if (toComplete.length > 0) {
        await Promise.all(
          toComplete.map(t =>
            updateTask(t.id, { ...t, status: 'COMPLETED', user: { id: t.userId } })
          )
        )
        finalTasks = data.map(t =>
          toComplete.find(c => c.id === t.id) ? { ...t, status: 'COMPLETED' } : t
        )
      }
      setTasks(finalTasks)
    } catch (err) {
      console.error('Failed to load tasks', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      setLoading(true)
      loadTasks()
    } else {
      setTasks([])
      setLoading(false)
    }
  }, [user])

  const updateTaskInState = useCallback((updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }, [])

  const deleteTaskFromState = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const addTaskToState = useCallback((task) => {
    setTasks(prev => {
      if (prev.find(t => t.id === task.id)) return prev
      return [...prev, task]
    })
  }, [])

  const addTasksToState = useCallback((newTasks) => {
    const today = new Date()
    const toComplete = newTasks.filter(t =>
      t.dueDate && t.status === 'CONFIRMED' && new Date(t.dueDate) < today
    )
    if (toComplete.length > 0) {
      Promise.all(
        toComplete.map(t =>
          updateTask(t.id, { ...t, status: 'COMPLETED', user: { id: t.userId } })
        )
      ).catch(err => console.error('Failed to auto-complete past-due uploaded tasks', err))
    }
    const completedIds = new Set(toComplete.map(t => t.id))
    const resolvedTasks = newTasks.map(t =>
      completedIds.has(t.id) ? { ...t, status: 'COMPLETED' } : t
    )

    setTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id))
      return [...prev, ...resolvedTasks.filter(t => !existingIds.has(t.id))]
    })
  }, [])

  const reviewCount = tasks.filter(
    t => t.status === 'NEEDS_REVIEW' || t.status === 'PENDING_DATE'
  ).length

  return (
    <TasksContext.Provider value={{
      tasks, loading, reviewCount,
      loadTasks,
      updateTaskInState,
      deleteTaskFromState,
      addTaskToState,
      addTasksToState,
      setTasks,
    }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used within TasksProvider')
  return ctx
}