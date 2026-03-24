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

export const extractCourseInfo = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/courses/extract`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuth().token}` },
    body: formData
  })
  return res.json()
}
export const uploadCourseFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/upload/course`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuth().token}` },
    body: formData
  })
  return res.json() // { course, tasks }
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