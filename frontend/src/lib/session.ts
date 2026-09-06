export const TOKEN_KEY = 'finansee_token'
export const SESSION_EXPIRED = 'finansee:session-expired'

let requests = new AbortController()

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function sessionSignal() {
  return requests.signal
}

export function cancelSessionRequests() {
  requests.abort()
  requests = new AbortController()
}
