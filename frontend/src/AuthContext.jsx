import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRedirectResult(auth).catch(console.error)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken()
        setUser(firebaseUser)
        setToken(idToken)
        localStorage.setItem('firebase_token', idToken)
        localStorage.setItem('firebase_uid', firebaseUser.uid)
      } else {
        setUser(null)
        setToken(null)
        localStorage.removeItem('firebase_token')
        localStorage.removeItem('firebase_uid')
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const refreshToken = async () => {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true)
      setToken(idToken)
      localStorage.setItem('firebase_token', idToken)
      return idToken
    }
    return null
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshToken }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)