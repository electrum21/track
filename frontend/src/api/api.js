const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const getAuth = () => ({
  userId: localStorage.getItem('firebase_uid'),
  token: localStorage.getItem('firebase_token'),
})

// Always read token fresh from localStorage — set by AuthContext on every auth state change
const authHeaders = () => {
  const token = localStorage.getItem('firebase_token')
  if (!token) console.warn('No firebase_token in localStorage — API call may fail')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export const getTasks = async () => {
  const res = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders() })
  return res.json()
}

export const getTaskById = async (id) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { headers: authHeaders() })
  return res.json()
}

export const createTask = async (task) => {
  const { userId } = getAuth()
  const res = await fetch(`${BASE_URL}/tasks?userId=${userId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(task)
  })
  return res.json()
}

export const updateTask = async (id, task) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(task)
  })
  return res.json()
}

export const deleteTask = async (id) => {
  await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

export const getCourses = async () => {
  const { userId } = getAuth()
  const res = await fetch(`${BASE_URL}/courses`, { headers: authHeaders() })
  return res.json()
}

export const createCourse = async (course) => {
  const { userId } = getAuth()
  const res = await fetch(`${BASE_URL}/courses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(course)
  })
  return res.json()
}

export const updateCourse = async (id, course) => {
  const res = await fetch(`${BASE_URL}/courses/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(course)
  })
  return res.json()
}

export const deleteCourse = async (id) => {
  await fetch(`${BASE_URL}/courses/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

export const getCourseCatalog = async () => {
  const res = await fetch(`${BASE_URL}/courses/catalog`, { headers: authHeaders() })
  return res.json()
}

export const uploadCourseFile = async (file, moduleCode) => {
  const formData = new FormData()
  formData.append('file', file)
  if (moduleCode) formData.append('moduleCode', moduleCode)
  const res = await fetch(`${BASE_URL}/upload/course`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuth().token}` },
    body: formData
  })
  // Success shapes:
  //  - saved immediately:  { courses, tasks }
  //  - needs confirmation: { needsConfirmation: true, missingModules, courses, tasks } (nothing saved yet)
  //  - module mismatch:    { moduleMismatch: true, expectedModule, detectedModules, courses, tasks } (nothing saved yet,
  //                          only returned when a moduleCode was passed and the file doesn't seem to reference it)
  // Failure shape: { error, message, invalidModules? }
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || 'Upload failed')
    err.code = data.error
    err.invalidModules = data.invalidModules
    throw err
  }
  return data
}

export const confirmCourseUpload = async (courses, tasks) => {
  const res = await fetch(`${BASE_URL}/upload/course/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuth().token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ courses, tasks })
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to add course')
    err.code = data.error
    throw err
  }
  return data // { courses, tasks }
}

export const getAcademicWeeks = async () => {
  const res = await fetch(`${BASE_URL}/calendar/weeks`, { headers: authHeaders() })
  return res.json()
}

export const uploadAcademicCalendar = async (file, semester = '1') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('semester', semester)
  const res = await fetch(`${BASE_URL}/calendar/weeks/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuth().token}` },
    body: formData
  })
  return res.json()
}

export const setupAcademicCalendar = async (form) => {
  const res = await fetch(`${BASE_URL}/calendar/weeks/manual`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      semesterStart: form.semesterStart || null,
      recessStart: form.recessStart || null,
      examStart: form.examStart || null,
      teachingWeeks: form.teachingWeeks || '13',
      examWeeks: form.examWeeks || '3'
    })
  })
  return res.json()
}

export const clearAcademicCalendar = async () => {
  await fetch(`${BASE_URL}/calendar/weeks`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

export const deleteAccount = async () => {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return res.ok
}

export const agentChat = async (message, history) => {
  const res = await fetch(`${BASE_URL}/agent/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, history })
  })
  return res.json()
}

export const getTelegramStatus = async () => {
  const res = await fetch(`${BASE_URL}/telegram/status`, { headers: authHeaders() })
  return res.json()
}

export const generateTelegramLinkCode = async () => {
  const res = await fetch(`${BASE_URL}/telegram/link-code`, {
    method: 'POST',
    headers: authHeaders()
  })
  return res.json()
}

export const unlinkTelegram = async () => {
  await fetch(`${BASE_URL}/telegram/link`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}