import { Component, type ErrorInfo, type ReactNode } from 'react'
import CheckInAlertCard from './CheckInAlertCard'

type ScanErrorBoundaryProps = {
  children: ReactNode
  onFailure?: () => void
  fallback?: (retry: () => void) => ReactNode
}

type ScanErrorBoundaryState = {
  error: Error | null
}

export default class ScanErrorBoundary extends Component<
  ScanErrorBoundaryProps,
  ScanErrorBoundaryState
> {
  state: ScanErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ScanErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QrScanner crashed:', error, info.componentStack)
    this.props.onFailure?.()
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleRetry)
      }

      return (
        <CheckInAlertCard
          title="Camera unavailable"
          message="The scanner stopped unexpectedly. Use manual search below or try again."
          tone="warning"
          actionLabel="Try camera again"
          onAction={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}
