import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useCalculateProject, useProject } from "@/lib/queries";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Download,
  Share2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { CalculateResult } from "@/lib/api";

export default function ProjectCost() {
  const [, params] = useRoute("/projects/:id/cost");
  const projectIdRaw = params?.id ?? "";
  const projectId = projectIdRaw ? Number(projectIdRaw) : undefined;

  const { data: project } = useProject(projectId);
  const calculate = useCalculateProject(projectId);
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  // Run the calculation as soon as we have a project + usage.
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    setShowReveal(false);
    setResult(null);
    // Minimum reveal delay so the spinner feels intentional but the page
    // is never stuck if the network resolves first.
    const minDelay = setTimeout(() => {
      if (!cancelled) setShowReveal(true);
    }, 400);
    calculate
      .mutateAsync(project.usage_inputs ?? {})
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setShowReveal(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(minDelay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  if (!project) {
    return (
      <ProjectLayout projectId={projectIdRaw}>
        <div className="p-12 text-center text-muted-foreground">
          Loading project…
        </div>
      </ProjectLayout>
    );
  }

  if (!showReveal || !result) {
    return (
      <ProjectLayout projectId={projectIdRaw}>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"
          />
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold font-mono text-primary"
          >
            Running Monte Carlo Simulation…
          </motion.h2>
          <p className="text-muted-foreground text-sm">
            Applying pricing variants across operational axes
          </p>
        </div>
      </ProjectLayout>
    );
  }

  const totalCost = result.total_monthly_cost;
  const target = result.budget_target;
  const isOverBudget = totalCost > target;
  const budgetPercentage = target > 0 ? (totalCost / target) * 100 : 0;
  const statusColor = isOverBudget
    ? "text-destructive"
    : budgetPercentage > 80
      ? "text-amber-500"
      : "text-green-500";

  const chartData = result.breakdown
    .map((sc) => {
      const matched = project.services.find(
        (ps) => ps.service.id === sc.service_id,
      );
      return {
        name: sc.service_name,
        cost: sc.monthly_cost,
        fill: matched?.service.icon_color || "#8884d8",
        category: sc.category,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const conservative = result.scenarios.conservative.monthly_cost;
  const aggressive = result.scenarios.aggressive.monthly_cost;

  const handleExportCsv = () => {
    const rows = [
      ["service", "category", "model_type", "monthly_cost"],
      ...result.breakdown.map((b) => [
        b.service_name,
        b.category,
        b.model_type,
        b.monthly_cost.toFixed(2),
      ]),
      [],
      ["total", "", "", totalCost.toFixed(2)],
      ["budget_target", "", "", target.toFixed(2)],
      ["headroom", "", "", result.headroom_usd.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-")}-cost.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProjectLayout projectId={projectIdRaw}>
      <div className="space-y-8 pb-20 max-w-5xl mx-auto">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="bg-card border border-border shadow-2xl rounded-2xl overflow-hidden relative"
        >
          <div
            className={`absolute top-0 left-0 w-full h-2 ${isOverBudget ? "bg-destructive" : "bg-primary"}`}
          />
          <div className="p-8 md:p-12 text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Estimated Monthly Burn
            </h2>
            <div className="flex justify-center items-end gap-2 mb-2">
              <span
                className={`text-6xl md:text-8xl font-black tabular-nums tracking-tighter ${statusColor}`}
                data-testid="text-total-cost"
              >
                $
                {totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
              <span className="text-xl md:text-2xl text-muted-foreground font-medium mb-2">
                /mo
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              {isOverBudget ? (
                <PillBadge className="bg-destructive/10 text-destructive border border-destructive/30">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Over Budget
                </PillBadge>
              ) : (
                <PillBadge className="bg-green-500/10 text-green-500 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Within Target
                </PillBadge>
              )}
              <span className="text-sm font-medium text-muted-foreground">
                Target: ${target.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-muted/30 border-t border-border p-6 md:px-12 flex flex-col gap-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Budget Headroom</span>
              <span className={statusColor}>
                {isOverBudget ? "Deficit: " : "Remaining: "}$
                {Math.abs(result.headroom_usd).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <Progress
              value={Math.min(100, budgetPercentage)}
              className="h-3"
              indicatorClassName={
                isOverBudget
                  ? "bg-destructive"
                  : budgetPercentage > 80
                    ? "bg-amber-500"
                    : "bg-primary"
              }
            />
          </div>
        </motion.div>

        {/* DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-border shadow-md">
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Where your budget is going</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)" }}
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor: "var(--color-border)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [
                        `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                        "Cost",
                      ]}
                    />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Risk Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> Conservative
                    </span>
                    <span className="text-sm font-mono">
                      $
                      {conservative.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(result.scenarios.conservative.factor * 100)}%
                    projected usage
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-primary uppercase">
                      Expected
                    </span>
                    <span className="text-sm font-mono font-bold">
                      $
                      {totalCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Based on inputs
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-destructive uppercase flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Aggressive
                    </span>
                    <span className="text-sm font-mono text-destructive">
                      $
                      {aggressive.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(result.scenarios.aggressive.factor * 100)}%
                    projected usage
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full bg-card">
                <Share2 className="w-4 h-4 mr-2" /> Share Report
              </Button>
              <Button className="w-full" onClick={handleExportCsv}>
                <Download className="w-4 h-4 mr-2" /> Export to CSV
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}

function PillBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${className}`}
    >
      {children}
    </span>
  );
}
