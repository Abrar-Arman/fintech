import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/store";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Registry from "@/pages/registry";
import NewProject from "@/pages/projects/new";
import ProjectServices from "@/pages/projects/[id]/services";
import ProjectVariants from "@/pages/projects/[id]/variants";
import ProjectUsage from "@/pages/projects/[id]/usage";
import ProjectCost from "@/pages/projects/[id]/cost";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/registry" component={Registry} />
      <Route path="/projects/new" component={NewProject} />
      <Route path="/projects/:id/services" component={ProjectServices} />
      <Route path="/projects/:id/variants" component={ProjectVariants} />
      <Route path="/projects/:id/usage" component={ProjectUsage} />
      <Route path="/projects/:id/cost" component={ProjectCost} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
