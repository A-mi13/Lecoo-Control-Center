import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info);
    this.setState({ error, info });
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-bg-elev border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-warn mb-2">
            Something broke while rendering the GUI.
          </h2>
          <p className="text-sm text-text mb-3">
            Please paste this into a GitHub issue at{' '}
            <code className="text-accent">github.com/A-mi13/Lecoo-Control-Center/issues</code>.
          </p>

          <pre className="text-[11px] font-mono bg-bg border border-border rounded p-2 mb-3 whitespace-pre-wrap break-all max-h-64 overflow-auto">
            {this.state.error.name}: {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
            {this.state.info?.componentStack ? '\n\n' + this.state.info.componentStack : ''}
          </pre>

          <button
            type="button"
            onClick={this.reset}
            className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md bg-accent text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
