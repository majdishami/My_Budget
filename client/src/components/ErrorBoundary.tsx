import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('Uncaught error in component:', {
      error,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleDownloadLogs = () => {
    logger.downloadLogs();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl p-6">
            <Alert variant="destructive" className="mb-6">
              <AlertTitle className="text-xl mb-2">Something went wrong</AlertTitle>
              <AlertDescription>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    An unexpected error occurred. Our team has been notified and is working to fix the issue.
                  </p>
                  {import.meta.env.DEV && this.state.error && (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Error Details:</p>
                        <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Component Stack:</p>
                          <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={this.handleReset}>Try Again</Button>
                    <Button variant="outline" onClick={this.handleDownloadLogs}>
                      Download Logs
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}