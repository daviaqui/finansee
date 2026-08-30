import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowRight, Check, LockKeyhole } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { api, getApiError } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

interface RegisterForm { name: string; email: string; password: string }

export function RegisterPage() {
  const { user, authenticate } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>()

  if (user) return <Navigate to="/" replace />

  async function submit(values: RegisterForm) {
    setError('')
    try {
      const { data } = await api.post<{ access_token: string }>('/auth/register', values)
      await authenticate(data.access_token)
      navigate('/')
    } catch (requestError) {
      setError(getApiError(requestError))
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase register-showcase">
        <div className="auth-brand"><Logo /></div>
        <div className="showcase-copy">
          <span className="showcase-badge">COMECE EM POUCOS MINUTOS</span>
          <h1>Seu dinheiro merece<br /><em>um plano mais claro.</em></h1>
          <p>Crie seu espaço e acompanhe a história por trás de cada número.</p>
          <ul className="benefit-list">
            <li><Check size={17} /> Dashboard com visão mensal</li>
            <li><Check size={17} /> Categorias personalizáveis</li>
            <li><Check size={17} /> Dados privados por usuário</li>
          </ul>
        </div>
        <p className="showcase-footer">Simples para começar. Útil para continuar.</p>
      </section>
      <main className="auth-form-wrap">
        <div className="auth-form-card">
          <div className="auth-mobile-logo"><Logo /></div>
          <span className="eyebrow">PRIMEIROS PASSOS</span>
          <h2>Crie sua conta</h2>
          <p className="auth-subtitle">É grátis e leva menos de um minuto.</p>
          <form onSubmit={handleSubmit(submit)}>
            <div className="form-field full">
              <label htmlFor="name">Nome</label>
              <input id="name" placeholder="Como podemos chamar você?" {...register('name', { required: 'Informe seu nome', minLength: { value: 2, message: 'Use pelo menos 2 caracteres' } })} />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </div>
            <div className="form-field full">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" placeholder="voce@email.com" {...register('email', { required: 'Informe seu e-mail' })} />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </div>
            <div className="form-field full">
              <label htmlFor="password">Senha</label>
              <div className="password-input"><LockKeyhole size={17} /><input id="password" type="password" placeholder="Mínimo de 8 caracteres" {...register('password', { required: 'Crie uma senha', minLength: { value: 8, message: 'Use pelo menos 8 caracteres' } })} /></div>
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="button primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : <>Criar minha conta <ArrowRight size={18} /></>}
            </button>
          </form>
          <p className="auth-switch">Já tem uma conta? <Link to="/login">Entrar</Link></p>
        </div>
      </main>
    </div>
  )
}

