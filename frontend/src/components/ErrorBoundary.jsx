import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Keep this for debugging production crashes (e.g., rendering non-strings).
        console.error('[ErrorBoundary] Uncaught error', error, info);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const message = this.state.error?.message || 'The app crashed while rendering this page.';
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-6">
                <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 break-words">{message}</p>
                    <div className="mt-5 flex gap-3">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Reload
                        </button>
                        <button
                            type="button"
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            Try Again
                        </button>
                    </div>
                    {import.meta?.env?.DEV && this.state.error?.stack && (
                        <pre className="mt-4 text-xs overflow-auto whitespace-pre-wrap text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                            {this.state.error.stack}
                        </pre>
                    )}
                </div>
            </div>
        );
    }
}

