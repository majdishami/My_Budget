import { Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Directly render the route and component without auth checks
  return <Route path={path} component={Component} />;
}