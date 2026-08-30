import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowRight, BarChart3, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { api, getApiError } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

interface LoginForm { email: string; password: string }

export function LoginPage() {
  const { user, authenticate } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>()

  if (user) return <Navigate to="/" replace />

  async function submit(values: LoginForm) {
    setError('')
    try {
      const { data } = await api.post<{ access_token: string }>('/auth/login', values)
      await authenticate(data.access_token)
      navigate('/')
    } catch (requestError) {
      setError(getApiError(requestError))
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-brand"><Logo /></div>
        <div className="showcase-copy">
          <span className="showcase-badge"><ShieldCheck size={16} /> SUAS FINANÇAS, SOB CONTROLE</span>
          <h1>Clareza para decidir.<br /><em>Liberdade para viver.</em></h1>
          <p>Reúna receitas, despesas e metas em um espaço simples, visual e feito para o seu dia a dia.</p>
          <div className="showcase-stats">
            <div><strong>100%</strong><span>dos dados sob seu controle</span></div>
            <div><BarChart3 size={28} /><span>Visão clara da sua evolução</span></div>
          </div>
        </div>
        <p className="showcase-footer">Finanças pessoais sem complicação.</p>
      </section>
      <main className="auth-form-wrap">
        <div className="auth-form-card">
          <div className="auth-mobile-logo"><Logo /></div>
          <span className="eyebrow">BEM-VINDO DE VOLTA</span>
          <h2>Acesse sua conta</h2>
          <p className="auth-subtitle">Continue construindo uma vida financeira mais tranquila.</p>
          <form onSubmit={handleSubmit(submit)}>
            <div className="form-field full">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" placeholder="voce@email.com" {...register('email', { required: 'Informe seu e-mail' })} />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </div>
            <div className="form-field full">
              <label htmlFor="password">Senha</label>
              <div className="password-input"><LockKeyhole size={17} /><input id="password" type="password" placeholder="Sua senha" {...register('password', { required: 'Informe sua senha' })} /></div>
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="button primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : <>Entrar <ArrowRight size={18} /></>}
            </button>
          </form>
          <p className="auth-switch">Ainda não tem uma conta? <Link to="/cadastro">Criar conta grátis</Link></p>
        </div>
      </main>
    </div>
  )
}

