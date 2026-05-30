import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg)',
          color: 'var(--text)',
          padding: '24px',
          textAlign: 'center'
        }}>
          <section style={{ maxWidth: '600px' }}>
            <h1>⚠️ Something went wrong</h1>
            <p>{this.state.error?.message}</p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                marginTop: '16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Go Home
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
