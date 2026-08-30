import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  authenticate: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    try {
      const { data } = await api.get<User>('/auth/me')
      setUser(data)
    } catch {
      localStorage.removeItem('finansee_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (localStorage.getItem('finansee_token')) loadUser()
    else setLoading(false)
  }, [])

  async function authenticate(token: string) {
    localStorage.setItem('finansee_token', token)
    setLoading(true)
    await loadUser()
  }

  function logout() {
    localStorage.removeItem('finansee_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
