import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] unhandled error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Something went off course.</h1>
          <p className="mt-2 text-[15px] text-muted">An unexpected error occurred. Reloading usually fixes it.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-ink"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
