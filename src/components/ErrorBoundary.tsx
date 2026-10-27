import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-fg">
          <div className="max-w-xl rounded-md border border-clay/40 bg-surface p-6">
            <h1 className="text-xl font-medium text-clay">Error en la aplicación</h1>
            <p className="mt-2 text-sm text-muted">{this.state.error.message}</p>
            <button
              className="mt-4 rounded bg-brass px-4 py-2 text-bg"
              onClick={() => window.location.reload()}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
