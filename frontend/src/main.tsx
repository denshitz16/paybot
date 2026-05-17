import { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary">
          <h1 className="app-error-boundary-heading">Application Error</h1>
          <pre className="app-error-boundary-stack">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Dismiss the pre-React HTML loader once React has painted its first frame.
const htmlLoader = document.getElementById('html-loader');
if (htmlLoader) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      htmlLoader.style.transition = 'opacity 0.25s ease';
      htmlLoader.style.opacity = '0';
      setTimeout(() => htmlLoader.remove(), 280);
    });
  });
}
