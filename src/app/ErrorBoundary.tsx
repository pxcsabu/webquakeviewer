import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error ? error.message : '不明なエラーが発生しました。',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('EarthScope render error', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="fatal-error">
          <h1>表示エラー</h1>
          <p>
            アプリケーションの表示中にエラーが発生しました。再読み込みしてください。
          </p>
          {this.state.message ? (
            <pre className="fatal-error-detail">{this.state.message}</pre>
          ) : null}
          <button type="button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
