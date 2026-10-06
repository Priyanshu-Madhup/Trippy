import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { backend, type AuthSession, type AuthUser } from '@/services/backend'
import { qk, queryClient } from '@/lib/queryClient'

interface AuthContextValue {
  session: AuthSession | null
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    backend
      .getSession()
      .then((s) => active && setSession(s))
      .finally(() => active && setLoading(false))
    const unsubscribe = backend.onAuthChange((s) => {
      setSession((prev) => {
        // Different user (or signed out) → drop every cached query.
        if (prev?.user.id !== s?.user.id) queryClient.clear()
        return s
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await backend.signIn(email, password))
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await backend.signUp(name, email, password)
    if (res.session) setSession(res.session)
    return { needsConfirmation: res.needsConfirmation }
  }, [])

  const signOut = useCallback(async () => {
    await backend.signOut()
    setSession(null)
    queryClient.clear()
  }, [])

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signOut }),
    [session, loading, signIn, signUp, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function useProfile() {
  const { user } = useAuth()
  return useQuery({ queryKey: qk.profile, queryFn: () => backend.getProfile(), enabled: !!user, staleTime: 5 * 60_000 })
}

/** Best display name: profile → auth metadata → email local part. */
export function useDisplayName(): string {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  return profile?.name || user?.name || user?.email?.split('@')[0] || 'Traveller'
}
