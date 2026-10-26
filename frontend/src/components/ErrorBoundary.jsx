import { Component } from "react";

// Safety net (v2.1d): if a page ever crashes, show a friendly message instead of
// a blank white screen. `resetKey` (the current address) clears the error when
// the person navigates somewhere else, so one broken page never traps them.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("A page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card crash-card" role="alert">
        <h2>Something went wrong on this page</h2>
        <p>The rest of RaktSetu still works. You can reload this page, or pick another page from the menu.</p>
        <div className="crash-actions">
          <button type="button" onClick={() => window.location.reload()}>Reload this page</button>
          <a className="btn-outline" href="/">Go to the home page</a>
        </div>
      </div>
    );
  }
}
