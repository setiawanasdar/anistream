'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary – catches client-side render errors and shows a readable message
 * instead of the generic "Application error" page.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-white text-xl font-bold mb-2">Terjadi Kesalahan</h1>
          <p className="text-gray-400 text-sm mb-4 max-w-md">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <pre className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-4 max-w-xl overflow-auto text-left mb-6">
            {this.state.error?.stack?.slice(0, 600)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-700 hover:bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
