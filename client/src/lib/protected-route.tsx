import { Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Simply render the component without any auth checks
  return <Route path={path} component={Component} />;
}