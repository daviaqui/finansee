import axios from 'axios'
import { getToken, sessionSignal, SESSION_EXPIRED } from './session'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Capture credentials immediately so a queued request cannot adopt the next account's token.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.signal = config.signal
    ? AbortSignal.any([config.signal as AbortSignal, sessionSignal()])
    : sessionSignal()
  return config
}, undefined, { synchronous: true })

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = getToken()
    if (error.response?.status === 401 && token && !error.config?.signal?.aborted
      && error.config?.headers?.Authorization === `Bearer ${token}`) {
      window.dispatchEvent(new Event(SESSION_EXPIRED))
    }
    return Promise.reject(error)
  },
)

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail[0]?.msg ?? 'Verifique os campos informados.'
  }
  return 'Não foi possível concluir a operação. Tente novamente.'
}
