import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../lib/reportError'
import { btnPrimary, surfacePage } from '../ui/classes'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  message: string | null
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { message: error.message || 'Something went wrong.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, info.componentStack ?? 'AppErrorBoundary')
  }

  render() {
    if (!this.state.message) {
      return this.props.children
    }

    return (
      <div className={`${surfacePage} flex min-h-dvh items-center justify-center px-4`}>
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-slate-900">This screen hit a snag</p>
          <p className="mt-2 text-sm text-slate-600">{this.state.message}</p>
          <button
            type="button"
            className={`${btnPrimary} mt-6`}
            onClick={() => {
              this.setState({ message: null })
              window.location.reload()
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
