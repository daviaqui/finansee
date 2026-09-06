import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { cancelSessionRequests, getToken, SESSION_EXPIRED, TOKEN_KEY } from './session'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  authenticate: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const generation = useRef(0)

  const clearSession = useCallback(() => {
    generation.current += 1
    cancelSessionRequests()
    void queryClient.cancelQueries()
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  const logout = useCallback(() => {
    clearSession()
    localStorage.removeItem(TOKEN_KEY)
    setLoading(false)
  }, [clearSession])

  const loadUser = useCallback(async () => {
    const current = ++generation.current
    const token = getToken()
    if (!token) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await api.get<User>('/auth/me')
      if (generation.current === current && token === getToken()) setUser(data)
    } catch {
      if (generation.current === current && token === getToken()) logout()
    } finally {
      if (generation.current === current) setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    void loadUser()
    function syncSession(event: StorageEvent) {
      if (event.key !== TOKEN_KEY && event.key !== null) return
      clearSession()
      void loadUser()
    }
    window.addEventListener(SESSION_EXPIRED, logout)
    window.addEventListener('storage', syncSession)
    return () => {
      generation.current += 1
      cancelSessionRequests()
      void queryClient.cancelQueries()
      queryClient.clear()
      window.removeEventListener(SESSION_EXPIRED, logout)
      window.removeEventListener('storage', syncSession)
    }
  }, [clearSession, loadUser, logout, queryClient])

  async function authenticate(token: string) {
    clearSession()
    localStorage.setItem(TOKEN_KEY, token)
    await loadUser()
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
