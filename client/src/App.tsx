import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import GoalInput from "@/pages/goal-input";
import PromptFlow from "@/pages/prompt-flow";
import Roadmap from "@/pages/roadmap";
import ProgressPage from "@/pages/progress";
import Subscription from "@/pages/subscription";
import DailyCheckIn from "@/pages/daily-checkin";
import Header from "@/components/header";
import Navigation from "@/components/navigation";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="min-h-screen bg-background">
            <Header />
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/new-goal" component={GoalInput} />
              <Route path="/goals/:id/plan" component={PromptFlow} />
              <Route path="/goals/:id" component={Roadmap} />
              <Route path="/progress" component={ProgressPage} />
              <Route path="/daily-checkin" component={DailyCheckIn} />
              <Route path="/subscription" component={Subscription} />
              <Route component={NotFound} />
            </Switch>
            <Navigation />
          </div>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
