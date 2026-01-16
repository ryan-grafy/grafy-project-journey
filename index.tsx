import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ClientShareView from './components/ClientShareView.tsx';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          <h1>Critial Error: Application Crashed</h1>
          <h3 style={{ color: 'black' }}>{this.state.error?.message}</h3>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
} else {
  const root = ReactDOM.createRoot(rootElement);
  const isShareView = window.location.pathname.startsWith('/share/');

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {isShareView ? <ClientShareView /> : <App />}
      </ErrorBoundary>
    </React.StrictMode>
  );
}