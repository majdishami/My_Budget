import React, { Component, ErrorInfo, ReactNode } from 'react';

// Define the props interface for the ErrorBoundary component
interface Props {
  children: ReactNode; // The children components to be rendered
  fallback?: ReactNode; // Optional fallback UI to be rendered in case of an error
}

// Define the state interface for the ErrorBoundary component
interface State {
  hasError: boolean; // Indicates whether an error has occurred
  error: Error | null; // The error object if an error has occurred
}

// ErrorBoundary class component
class ErrorBoundary extends Component<Props, State> {
  // Initialize the state in the constructor
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Static method to update state when an error occurs
  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  // Method to log the error and error info
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Uncaught error in component:', error, errorInfo);
  }

  // Method to reset the error boundary state
  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  // Render method to display the fallback UI or the children components
  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="p-6 mx-auto my-8 max-w-md border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.resetErrorBoundary}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export the ErrorBoundary component
export default ErrorBoundary;