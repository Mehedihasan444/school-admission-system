import { Component, type ErrorInfo, type ReactNode } from "react"
import { messages } from "@/shared/i18n/messages.bn.ts"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      "ErrorBoundary caught an unexpected render error",
      error,
      errorInfo.componentStack
    )
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" aria-live="assertive">
            {messages.unknownError}
          </div>
        )
      )
    }
    return this.props.children
  }
}
