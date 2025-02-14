import { Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If no user and not loading, redirect to auth page
  if (!user) {
    return (
      <Route path={path}>
        {() => {
          setLocation("/auth");
          return null;
        }}
      </Route>
    );
  }

  // User is authenticated, render the protected component
  return <Route path={path} component={Component} />;
}