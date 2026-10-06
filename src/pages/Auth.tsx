import { Navigate } from 'react-router-dom'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/hooks/useAuth'

export function Login() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/app" replace />
  return (
    <AuthLayout>
      <AuthForm mode="login" />
    </AuthLayout>
  )
}

export function Signup() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/app" replace />
  return (
    <AuthLayout>
      <AuthForm mode="signup" />
    </AuthLayout>
  )
}
