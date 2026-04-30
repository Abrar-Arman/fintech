import { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { useProject } from "@/lib/queries";
import { calculateCost } from "@/lib/calculator";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Server,
  SlidersHorizontal,
  Calculator,
  ActivitySquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: "services", label: "Services", icon: Server },
  { id: "variants", label: "Pricing Models", icon: SlidersHorizontal },
  { id: "usage", label: "Usage Inputs", icon: ActivitySquare },
  { id: "cost", label: "Cost Prediction", icon: Calculator },
];

export function ProjectLayout({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId: string;
}) {
  const numericId = projectId ? Number(projectId) : undefined;
  const { data: project, isLoading } = useProject(numericId);

  const [, params] = useRoute("/projects/:id/:step");
  const currentStep = params?.step || "services";

  if (!project) {
    if (isLoading) {
      return (
        <AppLayout>
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <p className="text-muted-foreground">Loading project…</p>
          </div>
        </AppLayout>
      );
    }
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <p className="text-muted-foreground">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { totalCost } = calculateCost(project);
  const target = Number(project.budget_target);
  const budgetPercentage =
    target > 0 ? Math.min(100, (totalCost / target) * 100) : 0;
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Project Header */}
        <div className="bg-card border-b border-border px-6 py-4 shrink-0 z-10 sticky top-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span>Projects</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
            </div>

            <div className="flex flex-col items-end gap-2 w-full md:w-64">
              <div className="flex justify-between w-full text-sm font-medium">
                <span className="text-muted-foreground">Current Est.</span>
                <span
                  className={
                    totalCost > target
                      ? "text-destructive font-bold"
                      : "text-primary font-bold"
                  }
                >
                  $
                  {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-muted-foreground text-xs font-normal ml-1">
                    / mo
                  </span>
                </span>
              </div>
              <Progress
                value={budgetPercentage}
                className="h-2"
                indicatorClassName={
                  budgetPercentage > 95
                    ? "bg-destructive"
                    : budgetPercentage > 75
                      ? "bg-amber-500"
                      : "bg-green-500"
                }
              />
              <div className="flex justify-between w-full text-xs text-muted-foreground">
                <span>$0</span>
                <span>Target: ${target.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Steps */}
        <div className="border-b border-border bg-card/50 shrink-0">
          <div className="max-w-7xl mx-auto w-full px-6">
            <div className="flex overflow-x-auto hide-scrollbar">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isPast = idx < stepIndex;

                return (
                  <Link
                    key={step.id}
                    href={`/projects/${project.id}/${step.id}`}
                  >
                    <div
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                        isActive
                          ? "border-primary text-primary font-medium bg-primary/5"
                          : isPast
                            ? "border-transparent text-foreground/80 hover:text-foreground hover:bg-muted/50"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-primary/20 text-primary" : isPast ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {idx + 1}
                      </div>
                      <Icon className="w-4 h-4 hidden sm:block" />
                      <span>{step.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background/50">
          <div className="max-w-7xl mx-auto w-full p-4 md:p-6 h-full">
            {children}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
