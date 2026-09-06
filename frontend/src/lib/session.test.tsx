import { StrictMode } from 'react'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CategoriesPage } from '../pages/CategoriesPage'
import { AuthProvider, useAuth } from './AuthContext'
import { api } from './api'
import { queryKeys } from './queryKeys'
import { cancelSessionRequests, getToken, SESSION_EXPIRED, TOKEN_KEY } from './session'

const originalAdapter = api.defaults.adapter

afterEach(() => { api.defaults.adapter = originalAdapter; cancelSessionRequests() })

function Harness({ categories = false }: { categories?: boolean }) {
  const auth = useAuth()
  return <>
    <button onClick={() => void auth.authenticate('A')}>Entrar A</button>
    <button onClick={() => void auth.authenticate('B')}>Entrar B</button>
    <button onClick={auth.logout}>Sair</button>
    <output>{auth.loading ? 'Carregando' : auth.user?.id ?? 'Sem sessão'}</output>
    {auth.user && !auth.loading && categories && <CategoriesPage />}
  </>
}

function setup(categories = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } })
  render(<StrictMode><QueryClientProvider client={client}>
    <AuthProvider><Harness categories={categories} /></AuthProvider>
  </QueryClientProvider></StrictMode>)
  return client
}

function mockAccounts() {
  return vi.spyOn(api, 'get').mockImplementation(async (url) => {
    const user = getToken()
    return { data: url === '/auth/me'
      ? { id: user, name: user }
      : [{ id: `category-${user}`, name: `Categoria da conta ${user}`, color: '#123456' }] }
  })
}

describe('isolamento de sessão', () => {
  it('limpa o cache e busca as categorias da segunda conta na mesma tela', async () => {
    const request = mockAccounts()
    const client = setup(true)
    fireEvent.click(screen.getByText('Entrar A'))
    await screen.findByText('Categoria da conta A')
    client.setQueryData([...queryKeys.dashboard('A'), '2026-09'], { balance: '100.00' })
    client.setQueryData([...queryKeys.transactions('A'), { page: 1 }], ['dados de A'])
    fireEvent.click(screen.getByText('Sair'))
    expect(screen.queryByText('Categoria da conta A')).toBeNull()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    request.mockClear()
    fireEvent.click(screen.getByText('Entrar B'))
    await screen.findByText('Categoria da conta B')
    expect(screen.queryByText('Categoria da conta A')).toBeNull()
    expect(client.getQueryData(queryKeys.categories('A'))).toBeUndefined()
    expect(request).toHaveBeenCalledWith('/categories', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(client.getQueryData(queryKeys.categories('B'))).toEqual([
      { id: 'category-B', name: 'Categoria da conta B', color: '#123456' },
    ])
  })

  it('isola uma troca direta de conta, mesmo com cache ainda recente', async () => {
    mockAccounts()
    const client = setup(true)
    fireEvent.click(screen.getByText('Entrar A'))
    await screen.findByText('Categoria da conta A')
    fireEvent.click(screen.getByText('Entrar B'))
    await screen.findByText('Categoria da conta B')
    expect(client.getQueryData(queryKeys.categories('A'))).toBeUndefined()
    expect(screen.queryByText('Categoria da conta A')).toBeNull()
  })

  it('aborta consultas pendentes e descarta respostas que chegarem depois do logout', async () => {
    mockAccounts()
    const client = setup()
    fireEvent.click(screen.getByText('Entrar A'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('A'))
    let finish!: (value: string) => void
    let signal!: AbortSignal
    const pending = client.fetchQuery({ queryKey: queryKeys.transactions('A'), queryFn: (context) => {
      signal = context.signal
      return new Promise<string>((resolve) => { finish = resolve })
    } }).catch(() => undefined)
    fireEvent.click(screen.getByText('Sair'))
    expect(signal.aborted).toBe(true)
    finish('resposta antiga')
    await pending
    expect(client.getQueryData(queryKeys.transactions('A'))).toBeUndefined()
  })

  it('impede que uma resposta antiga de /auth/me substitua a nova conta', async () => {
    let finishA!: (value: { data: { id: string } }) => void
    vi.spyOn(api, 'get').mockImplementation(() => getToken() === 'A'
      ? new Promise((resolve) => { finishA = resolve })
      : Promise.resolve({ data: { id: 'B' } }))
    setup()
    fireEvent.click(screen.getByText('Entrar A'))
    fireEvent.click(screen.getByText('Entrar B'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('B'))
    await act(async () => { finishA({ data: { id: 'A' } }) })
    expect(screen.getByRole('status').textContent).toBe('B')
    expect(getToken()).toBe('B')
  })

  it('sincroniza a troca de conta e o logout feitos em outra aba', async () => {
    mockAccounts()
    const client = setup(true)
    fireEvent.click(screen.getByText('Entrar A'))
    await screen.findByText('Categoria da conta A')
    act(() => {
      localStorage.setItem(TOKEN_KEY, 'B')
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, newValue: 'B' }))
    })
    await screen.findByText('Categoria da conta B')
    expect(client.getQueryData(queryKeys.categories('A'))).toBeUndefined()
    act(() => {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, newValue: null }))
    })
    expect(screen.queryByText('Categoria da conta B')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Sem sessão')
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('limpa também o cache de mutações quando a sessão expira', async () => {
    mockAccounts()
    const client = setup(true)
    fireEvent.click(screen.getByText('Entrar A'))
    await screen.findByText('Categoria da conta A')
    client.getMutationCache().build(client, { mutationKey: ['private'], mutationFn: async () => 'A' })
    act(() => { window.dispatchEvent(new Event(SESSION_EXPIRED)) })
    expect(getToken()).toBeNull()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(screen.getByRole('status').textContent).toBe('Sem sessão')
  })
})

describe('requisições de uma sessão encerrada', () => {
  it('preserva o token capturado e cancela a requisição antiga', async () => {
    localStorage.setItem(TOKEN_KEY, 'A')
    let finish!: (response: AxiosResponse) => void
    let response!: AxiosResponse
    api.defaults.adapter = (config) => {
      response = { config, data: 'dados de A', status: 200, statusText: 'OK', headers: {} }
      return new Promise((resolve) => { finish = resolve })
    }
    const pending = api.get('/private').catch((error: unknown) => error)
    cancelSessionRequests()
    localStorage.setItem(TOKEN_KEY, 'B')
    expect(response.config.headers.Authorization).toBe('Bearer A')
    expect(response.config.signal?.aborted).toBe(true)
    finish(response)
    expect(axios.isCancel(await pending)).toBe(true)
    expect(getToken()).toBe('B')
  })

  it.each([
    { cancel: true, next: 'B' },
    { cancel: false, next: 'B' },
    { cancel: true, next: 'A' },
  ])('ignora 401 antigo com cancelamento=$cancel e token atual=$next', async ({ cancel, next }) => {
    localStorage.setItem(TOKEN_KEY, 'A')
    let reject!: (error: AxiosError) => void
    let response!: AxiosResponse
    const expired = vi.fn()
    window.addEventListener(SESSION_EXPIRED, expired)
    api.defaults.adapter = (config) => {
      response = { config, data: {}, status: 401, statusText: 'Unauthorized', headers: {} }
      return new Promise((_, fail) => { reject = fail })
    }
    const pending = api.get('/private').catch(() => undefined)
    if (cancel) cancelSessionRequests()
    localStorage.setItem(TOKEN_KEY, next)
    reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', response.config, undefined, response))
    await pending
    expect(expired).not.toHaveBeenCalled()
    expect(getToken()).toBe(next)
    window.removeEventListener(SESSION_EXPIRED, expired)
  })

  it('notifica o encerramento quando o 401 pertence à sessão atual', async () => {
    localStorage.setItem(TOKEN_KEY, 'A')
    const expired = vi.fn()
    window.addEventListener(SESSION_EXPIRED, expired)
    api.defaults.adapter = async (config) => {
      const response = { config, data: {}, status: 401, statusText: 'Unauthorized', headers: {} }
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response)
    }
    await expect(api.get('/private')).rejects.toBeInstanceOf(AxiosError)
    expect(expired).toHaveBeenCalledOnce()
    window.removeEventListener(SESSION_EXPIRED, expired)
  })

  it('propaga o cancelamento do TanStack Query até o transporte HTTP', async () => {
    const client = new QueryClient()
    let finish!: (response: AxiosResponse) => void
    let response!: AxiosResponse
    api.defaults.adapter = (config) => {
      response = { config, data: [], status: 200, statusText: 'OK', headers: {} }
      return new Promise((resolve) => { finish = resolve })
    }
    const pending = client.fetchQuery({ queryKey: queryKeys.categories('A'),
      queryFn: ({ signal }) => api.get('/categories', { signal }) }).catch(() => undefined)
    await client.cancelQueries()
    expect(response.config.signal?.aborted).toBe(true)
    finish(response)
    await pending
    client.clear()
  })
})
