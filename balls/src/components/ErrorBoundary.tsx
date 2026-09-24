import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Last line of defence: if anything throws while rendering, show a friendly
 * screen with a way out instead of a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BALLS crashed', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  resetApp = () => {
    try {
      localStorage.removeItem('balls.state.v1');
    } catch {
      /* storage unavailable */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1 className="empty__title">Something went wrong.</h1>
        <p className="empty__body">Please try again. If it keeps happening, reset the app.</p>
        <div className="crash__actions">
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={this.reset}>
            Try again
          </button>
          <button type="button" className="btn btn--secondary btn--lg btn--block" onClick={this.resetApp}>
            Reset the app
          </button>
        </div>
        <p className="crash__detail">Error: {this.state.error.message}</p>
      </div>
    );
  }
}
