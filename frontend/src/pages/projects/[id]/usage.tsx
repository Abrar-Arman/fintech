import { useEffect, useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { useProject } from "@/lib/queries";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { calculateVariantCost } from "@/lib/calculator";
import {
  ArrowRight,
  Users,
  MessageSquare,
  Database,
  HardDrive,
  Cpu,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import type { UsageInputs } from "@/lib/api";
import { projectsApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface ClientUsage {
  active_users: number;
  tokens_per_request: number;
  requests_per_user: number;
  storage_gb: number;
  bandwidth_gb: number;
  compute_hours: number;
}

const DEFAULT_USAGE: ClientUsage = {
  active_users: 1000,
  tokens_per_request: 1500,
  requests_per_user: 20,
  storage_gb: 50,
  bandwidth_gb: 100,
  compute_hours: 720,
};

export default function ProjectUsage() {
  const [, params] = useRoute("/projects/:id/usage");
  const projectIdRaw = params?.id ?? "";
  const projectId = projectIdRaw ? Number(projectIdRaw) : undefined;

  const { data: project } = useProject(projectId);
  const qc = useQueryClient();

  const initialUsage = useMemo<ClientUsage>(() => {
    if (!project) return DEFAULT_USAGE;
    return {
      active_users: numberOr(project.usage_inputs?.active_users, DEFAULT_USAGE.active_users),
      tokens_per_request: numberOr(
        project.usage_inputs?.tokens_per_request,
        DEFAULT_USAGE.tokens_per_request,
      ),
      requests_per_user: numberOr(
        project.usage_inputs?.requests_per_user,
        DEFAULT_USAGE.requests_per_user,
      ),
      storage_gb: numberOr(project.usage_inputs?.storage_gb, DEFAULT_USAGE.storage_gb),
      bandwidth_gb: numberOr(project.usage_inputs?.bandwidth_gb, DEFAULT_USAGE.bandwidth_gb),
      compute_hours: numberOr(
        project.usage_inputs?.compute_hours,
        DEFAULT_USAGE.compute_hours,
      ),
    };
  }, [project]);

  const [usage, setUsage] = useState<ClientUsage>(initialUsage);

  // Re-sync when the project loads / changes.
  useEffect(() => {
    setUsage(initialUsage);
  }, [initialUsage]);

  // Debounced persist of usage to backend.
  useEffect(() => {
    if (!project) return;
    const timer = setTimeout(() => {
      projectsApi
        .update(project.id, {
          usage_inputs: usage as unknown as UsageInputs,
        })
        .then(() => {
          qc.invalidateQueries({ queryKey: ["project", project.id] });
        })
        .catch(() => {
          // Best-effort persist; silent on failure.
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [usage, project, qc]);

  if (!project) {
    return (
      <ProjectLayout projectId={projectIdRaw}>
        <div className="p-12 text-center text-muted-foreground">
          Loading project…
        </div>
      </ProjectLayout>
    );
  }

  const liveCosts = project.services
    .map((ps) => {
      if (!ps.variant) return null;
      return {
        service: ps.service,
        variant: ps.variant,
        cost: calculateVariantCost(ps.variant, usage),
      };
    })
    .filter(Boolean) as Array<{
    service: typeof project.services[number]["service"];
    variant: NonNullable<typeof project.services[number]["variant"]>;
    cost: number;
  }>;
  const totalCost = liveCosts.reduce((sum, item) => sum + item.cost, 0);

  const renderSliderInput = (
    label: string,
    id: keyof ClientUsage,
    min: number,
    max: number,
    step: number,
    icon: React.ComponentType<{ className?: string }>,
    desc: string,
    format: (val: number) => string = String,
  ) => {
    const Icon = icon;
    return (
      <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-md">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <Label className="text-base">{label}</Label>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
          <Input
            type="number"
            value={usage[id]}
            onChange={(e) =>
              setUsage({ ...usage, [id]: Number(e.target.value) })
            }
            className="w-24 text-right font-mono"
          />
        </div>
        <div className="pt-2">
          <Slider
            value={[usage[id]]}
            min={min}
            max={max}
            step={step}
            onValueChange={(val) => setUsage({ ...usage, [id]: val[0] })}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
            <span>{format(min)}</span>
            <span>{format(max)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProjectLayout projectId={projectIdRaw}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Estimate Operational Usage</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Adjust the sliders to reflect your expected traffic and usage
              patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSliderInput(
              "Monthly Active Users",
              "active_users",
              10,
              100000,
              10,
              Users,
              "Total users interacting per month",
              (v) => (v >= 1000 ? `${v / 1000}k` : String(v)),
            )}
            {renderSliderInput(
              "Avg Tokens / Request",
              "tokens_per_request",
              100,
              10000,
              100,
              MessageSquare,
              "Context window + generation size",
              (v) => (v >= 1000 ? `${v / 1000}k` : String(v)),
            )}
            {renderSliderInput(
              "Requests / User / Mo",
              "requests_per_user",
              1,
              1000,
              1,
              Activity,
              "How often each user interacts",
            )}
            {renderSliderInput(
              "Vector Storage (GB)",
              "storage_gb",
              1,
              1000,
              1,
              Database,
              "Embeddings and persistent storage",
            )}
            {renderSliderInput(
              "Bandwidth (GB)",
              "bandwidth_gb",
              1,
              10000,
              10,
              HardDrive,
              "Egress traffic per month",
            )}
            {renderSliderInput(
              "Compute Hours",
              "compute_hours",
              1,
              730,
              1,
              Cpu,
              "Always-on services (730h = 1 month)",
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
              <CardTitle className="text-lg">Live Cost Preview</CardTitle>
              <CardDescription>Based on selected models</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 bg-card flex flex-col items-center justify-center border-b border-border">
                <span className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                  Total Estimated
                </span>
                <motion.div
                  key={totalCost}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-primary font-mono tabular-nums"
                >
                  $
                  {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </motion.div>
                <span className="text-xs text-muted-foreground mt-1">
                  per month
                </span>
              </div>

              <div className="p-4 max-h-[300px] overflow-y-auto space-y-3 bg-muted/10">
                {liveCosts.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Pick a pricing variant on the previous step to preview
                    costs.
                  </div>
                )}
                {liveCosts.map((item) => (
                  <div
                    key={item.service.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.service.icon_color }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {item.service.name}
                      </span>
                    </div>
                    <span className="text-sm font-mono tabular-nums">
                      $
                      {item.cost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t border-border bg-card">
              <Link href={`/projects/${project.id}/cost`}>
                <Button
                  className="w-full py-6 text-md font-bold group"
                  size="lg"
                  data-testid="button-generate-prediction"
                >
                  Generate Prediction
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
}

function numberOr(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}
