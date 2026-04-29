import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { calculateCost } from "@/lib/calculator";
import { useDashboardStats, useProjects } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Database,
  Activity,
  Target,
  Clock,
  ArrowRight,
  Users,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: projectsPage, isLoading: projectsLoading } = useProjects();
  const { stats } = useDashboardStats();
  const projects = projectsPage?.results ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-sidebar via-background to-primary/10 shadow-2xl p-8 md:p-12"
        >
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 mb-6">
              v1.0.0-beta
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
              Predict the real cost of AI before you ship.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Model your agent architecture, apply community-verified pricing
              variants, and run operational simulations to find your true
              budget requirements.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/projects/new">
                <Button
                  size="lg"
                  className="font-bold text-md px-8 py-6 h-auto shadow-lg shadow-primary/25"
                  data-testid="button-new-project"
                >
                  <Plus className="w-5 h-5 mr-2" /> New Project
                </Button>
              </Link>
              <Link href="/registry">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold text-md px-8 py-6 h-auto bg-background/50 backdrop-blur-sm border-border"
                >
                  <Database className="w-5 h-5 mr-2" /> Browse Registry
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={stats.projects}
            icon={Target}
            color="text-primary"
          />
          <StatCard
            title="Services Indexed"
            value={stats.services}
            icon={Database}
            color="text-blue-500"
          />
          <StatCard
            title="Pricing Variants"
            value={stats.variants}
            icon={Activity}
            color="text-amber-500"
          />
          <StatCard
            title="Top Service Adoptions"
            value={stats.topServices.reduce(
              (sum, s) => sum + s.project_count,
              0,
            )}
            icon={Users}
            color="text-green-500"
          />
        </div>

        {/* TWO COLUMN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PROJECTS LIST */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Your Projects
              </h2>
              <Link href="/projects/new">
                <Button variant="ghost" size="sm" className="text-primary">
                  <Plus className="w-4 h-4 mr-1" /> New
                </Button>
              </Link>
            </div>

            {projectsLoading ? (
              <Card className="bg-muted/10">
                <CardContent className="p-12 text-center text-muted-foreground">
                  Loading projects…
                </CardContent>
              </Card>
            ) : projects.length === 0 ? (
              <Card className="bg-muted/10 border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Target className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-foreground">
                    No projects yet
                  </p>
                  <p className="text-sm mt-1 mb-6">
                    Create a project to start predicting costs.
                  </p>
                  <Link href="/projects/new">
                    <Button>Create Project</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {projects.map((project, idx) => {
                  const { totalCost } = calculateCost(project);
                  const target = Number(project.budget_target);
                  const isOver = totalCost > target;
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Link href={`/projects/${project.id}/services`}>
                        <Card
                          className="hover:border-primary/50 transition-all cursor-pointer group hover:shadow-md"
                          data-testid={`card-project-${project.id}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                                  {project.name}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {project.description}
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
                                  <span className="flex items-center gap-1">
                                    <Database className="w-3 h-3" />{" "}
                                    {project.services.length} services
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />{" "}
                                    {formatDistanceToNow(
                                      new Date(project.created_at),
                                    )}{" "}
                                    ago
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-6 md:border-l border-border md:pl-6">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                                    Est. Cost
                                  </p>
                                  <p
                                    className={`text-xl font-black tabular-nums ${
                                      isOver
                                        ? "text-destructive"
                                        : "text-foreground"
                                    }`}
                                  >
                                    $
                                    {totalCost.toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Target: ${target.toLocaleString()}
                                  </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TOP SERVICES */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Top Services
            </h2>
            <Card className="border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {stats.topServices.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      No services in the registry yet.
                    </div>
                  ) : (
                    stats.topServices.map(({ service, project_count }, idx) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs"
                            style={{
                              backgroundColor: `${service.icon_color}20`,
                              color: service.icon_color,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {service.name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {service.category.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {project_count} {project_count === 1 ? "use" : "uses"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-muted/10 border-t border-border text-center">
                  <Link href="/registry">
                    <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                      View full registry →
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="border-border bg-card overflow-hidden relative">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-md bg-muted/50 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-3xl font-black tracking-tight tabular-nums">
          {value.toLocaleString()}
        </p>
        <div className="absolute bottom-0 left-0 w-full h-1 flex">
          <div className={`h-full w-2/3 ${color} opacity-20`} />
          <div className={`h-full w-1/3 ${color} opacity-40`} />
        </div>
      </CardContent>
    </Card>
  );
}
