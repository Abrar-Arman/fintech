/**
 * Top-level React component.
 *
 *   - Wraps the app in a QueryClientProvider so any descendant can use
 *     React Query hooks from src/lib/queries.ts.
 *   - Bootstraps a demo user on first load (idempotent — safe to call
 *     repeatedly; see ensureDemoUser in lib/api.ts).
 *   - Defines client-side routes via wouter.
 */
import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ensureDemoUser } from "@/lib/api";

// One page module per route — keeping page-level code-splitting trivial.
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Registry from "@/pages/registry";
import  ServiceDetail  from "@/pages/ServiceDetail";
import PricingModels from "@/pages/PricingModels";

import NewProject from "@/pages/projects/new";
import ProjectServices from "@/pages/projects/[id]/services";
import ProjectVariants from "@/pages/projects/[id]/variants";
import ProjectUsage from "@/pages/projects/[id]/usage";
import ProjectCost from "@/pages/projects/[id]/cost";

// Single shared React Query client. We disable refetch-on-focus because
// the cost calculator is computed locally on every keystroke and we
// don't want the server numbers to flash in/out as the window focuses.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/registry" component={Registry} />
      <Route path="/registry/:id" component={ServiceDetail} />
      <Route path="/projects/new" component={NewProject} />
      <Route path="/pricing-models" component={PricingModels} />
      <Route path="/projects/:id/services" component={ProjectServices} />
      <Route path="/projects/:id/variants" component={ProjectVariants} />
      <Route path="/projects/:id/usage" component={ProjectUsage} />
      <Route path="/projects/:id/cost" component={ProjectCost} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Lightweight auth gate: on first load, ensure a demo user exists
 * (auto-register / auto-login). The hackathon flow is single-user, so
 * we never expose a real login screen — we just make sure there is a
 * valid JWT before rendering pages that hit protected endpoints.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureDemoUser()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.message ||
              "Could not reach the CostForge API. Make sure the Django server is running on port 8000.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Backend unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            Start the workflow named <code>CostForge Django API</code> and refresh.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Connecting to CostForge API…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* <AuthBootstrap> */}
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        {/* </AuthBootstrap> */}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
