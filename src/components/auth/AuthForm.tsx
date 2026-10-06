import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { isDemoMode } from '@/lib/env'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'
  const signup = mode === 'signup'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  function validate() {
    const next: typeof errors = {}
    if (signup && !name.trim()) next.name = 'Tell us what to call you.'
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address.'
    if (signup ? password.length < 8 : password.length === 0) {
      next.password = signup ? 'Use at least 8 characters.' : 'Enter your password.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      if (signup) {
        const { needsConfirmation } = await signUp(name.trim(), email.trim(), password)
        if (needsConfirmation) {
          setConfirmSent(true)
          return
        }
      } else {
        await signIn(email.trim(), password)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (confirmSent) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface-2">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-[15px] text-muted">
          We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Open it to finish creating your account.
        </p>
        <Button variant="secondary" className="mt-7 w-full" onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">{signup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        {signup ? 'Start organising your journeys in seconds.' : 'Sign in to see your trips.'}
      </p>

      {isDemoMode ? (
        <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <span className="font-semibold">Demo mode</span> — Supabase isn’t configured, so any email and password will work and data stays in this
          browser.
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
        {signup ? (
          <Field label="Name" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </Field>
        ) : null}

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus={!signup}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password} hint={signup ? 'At least 8 characters.' : undefined}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </Field>

        {errors.form ? (
          <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">
            {errors.form}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Continue
          {!loading ? <ArrowRight aria-hidden /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {signup ? 'Already have an account?' : 'New here?'}{' '}
        <Link to={signup ? '/login' : '/signup'} state={location.state} className="font-semibold text-ink underline-offset-4 hover:underline">
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </>
  )
}
