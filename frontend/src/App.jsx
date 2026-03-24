import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { SettingsProvider } from './hooks/useSettings.jsx'
import { TasksProvider } from './hooks/useTasks.jsx'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import ReviewQueue from './pages/ReviewQueue'
import Course from './pages/Course'
import Agent from './pages/Agent'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth()
  if (loading) return null
  if (!user || !token) return <Navigate to="/login" replace />
  return children
}

function AppLayout() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user && <Navbar />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
          <Route path="/course" element={<ProtectedRoute><Course /></ProtectedRoute>} />
          <Route path="/agent" element={<ProtectedRoute><Agent /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <TasksProvider>
            <AppLayout />
          </TasksProvider>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App