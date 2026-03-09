import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Caught:', error, info.componentStack)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary__card">
                        <AlertCircle size={48} className="error-boundary__icon" />
                        <h2 className="error-boundary__title">Something went wrong</h2>
                        <p className="error-boundary__message">
                            An unexpected error occurred. Please try again.
                        </p>
                        {this.state.error && (
                            <pre className="error-boundary__detail">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="error-boundary__actions">
                            <button className="btn btn--primary" onClick={this.handleReset}>
                                <RotateCcw size={16} /> Try Again
                            </button>
                            <button className="btn btn--secondary" onClick={() => window.location.href = '/'}>
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
