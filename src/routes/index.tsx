import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LogoMark } from '@/components/brand/Logo'
import { useAuth } from '@/hooks/useAuth'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Signup })))
const Home = lazy(() => import('@/pages/Home'))
const Trips = lazy(() => import('@/pages/Trips'))
const TripDetail = lazy(() => import('@/pages/TripDetail'))
const Settings = lazy(() => import('@/pages/Settings'))
const Profile = lazy(() => import('@/pages/Profile'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg" role="status" aria-label="Loading">
      <LogoMark className="size-11 animate-pulse-soft" />
    </div>
  )
}

function PageLoader() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-label="Loading">
      <LogoMark className="size-9 animate-pulse-soft opacity-60" />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.hash }} />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            }
          />
          <Route
            path="trips"
            element={
              <Suspense fallback={<PageLoader />}>
                <Trips />
              </Suspense>
            }
          />
          <Route
            path="trip/:tripId"
            element={
              <Suspense fallback={<PageLoader />}>
                <TripDetail />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
