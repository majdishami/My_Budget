import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Budget from "@/pages/Budget";
import MonthlyToDate from "@/pages/monthly-to-date";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Budget} />
      <Route path="/reports/monthly-to-date" component={MonthlyToDate} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;