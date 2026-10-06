import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { queryClient } from '@/lib/queryClient'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AppRoutes } from '@/routes'

function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border-line !bg-surface !text-ink !shadow-lift !font-sans',
          description: '!text-muted',
        },
      }}
    />
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </MotionConfig>
          <ThemedToaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
