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
      localStorage.removeItem('balls.state.v2');
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

/**
 * Wraps each screen, so one broken page shows a way back instead of taking
 * the whole app down.
 */
export class ScreenBoundary extends Component<{ children: ReactNode; onBack: () => void }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BALLS screen crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1 className="empty__title">This page couldn’t load.</h1>
        <p className="empty__body">It may have been removed. Go back and try something else.</p>
        <div className="crash__actions">
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={this.props.onBack}>
            Go back
          </button>
        </div>
      </div>
    );
  }
}
