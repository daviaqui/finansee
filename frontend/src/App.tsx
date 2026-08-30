import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './lib/AuthContext'

const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((module) => ({ default: module.CategoriesPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })))

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loader"><span className="loader" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

export function App() {
  return (
    <Suspense fallback={<div className="app-loader"><span className="loader" /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route index element={<DashboardPage />} />
          <Route path="/lancamentos" element={<TransactionsPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
