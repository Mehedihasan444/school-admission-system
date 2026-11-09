import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { messages } from "@/shared/i18n/messages.bn"

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
          <div className="mx-auto max-w-xl p-6">
            <Alert variant="destructive" aria-live="assertive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{messages.errors.unknown}</AlertDescription>
            </Alert>
          </div>
        )
      )
    }
    return this.props.children
  }
}
