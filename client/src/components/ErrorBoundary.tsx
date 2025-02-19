import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCcw, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorCount: 0
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.state.hasError) {
      this.handleReset();
    }
  };

  public componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCount: 1 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Enhanced error logging with more context
    logger.error('Uncaught error in component:', {
      error,
      componentStack: errorInfo.componentStack,
      componentName: this.props.name || 'Unknown',
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount + 1,
      userAgent: navigator.userAgent,
      location: window.location.href
    });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reset error state
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorCount: 0 
    });

    // Force reload the current route
    window.location.reload();
  };

  private handleDownloadLogs = () => {
    logger.downloadLogs();
  };

  private getErrorSeverity(): 'low' | 'medium' | 'high' {
    const count = this.state.errorCount;
    if (count <= 1) return 'low';
    if (count <= 3) return 'medium';
    return 'high';
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const severityColor = {
        low: 'bg-yellow-500',
        medium: 'bg-orange-500',
        high: 'bg-red-500'
      }[severity];

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-6">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-xl mb-2 flex items-center gap-2">
                Something went wrong
                <Badge variant="outline" className={severityColor}>
                  Severity: {severity}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    An unexpected error occurred in {this.props.name || 'the application'}. 
                    Press ESC or click Try Again to return to the application.
                  </p>

                  {/* Error details (only in development) */}
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

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={this.handleReset}
                      className="flex items-center gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Try Again
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={this.handleDownloadLogs}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Logs
                    </Button>
                  </div>

                  {/* Additional help text for repeated errors */}
                  {this.state.errorCount > 1 && (
                    <p className="text-sm text-muted-foreground mt-4">
                      This error has occurred {this.state.errorCount} times. 
                      If the problem persists, try clearing your browser cache or contact support.
                    </p>
                  )}
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