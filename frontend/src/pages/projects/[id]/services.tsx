import { useEffect, useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useAddServiceToProject,
  useCreateService,
  useFuzzy,
  useProject,
  useServices,
  useSuggest,
} from "@/lib/queries";
import type { ServiceCategory } from "@/lib/api";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Sparkles,
  Database,
  Plus,
  Trash2,
  ArrowRight,
  Check,
  Circle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_OPTIONS: ServiceCategory[] = [
  "llm",
  "vector_db",
  "hosting",
  "storage",
  "payments",
  "monitoring",
  "communication",
  "auth",
  "other",
];
const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  llm: "LLM",
  vector_db: "Vector DB",
  hosting: "Hosting",
  storage: "Storage",
  payments: "Payments",
  monitoring: "Monitoring",
  communication: "Communication",
  auth: "Auth",
  other: "Other",
};

// Step progress bar — shows where the user is in the project setup flow
const STEPS = [
  { label: "Project setup", step: 1 },
  { label: "Add services", step: 2 },
  { label: "Pricing variants", step: 3 },
  { label: "Cost model", step: 4 },
];

function StepProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center w-full mb-6 bg-muted/50 border border-border rounded-lg overflow-hidden">
      {STEPS.map((s, i) => {
        const done = s.step < currentStep;
        const active = s.step === currentStep;
        return (
          <div
            key={s.step}
            className={`flex-1 flex items-center justify-center gap-2 px-2 py-3 text-xs font-medium border-r last:border-r-0 border-border transition-colors
              ${active ? "bg-background text-foreground" : ""}
              ${done ? "text-green-600" : ""}
              ${!active && !done ? "text-muted-foreground" : ""}
            `}
          >
            <span
              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-semibold flex-shrink-0
                ${done ? "bg-green-500 border-green-500 text-white" : ""}
                ${active ? "border-primary text-primary" : ""}
                ${!active && !done ? "border-muted-foreground/40 text-muted-foreground" : ""}
              `}
            >
              {done ? <Check className="w-3 h-3" /> : s.step}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectServices() {
  const [, params] = useRoute("/projects/:id/services");
  const projectId = params?.id ? Number(params.id) : undefined;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: project } = useProject(projectId);
  const { data: servicesPage } = useServices();
  const allServices = servicesPage?.results ?? [];

  const addToProject = useAddServiceToProject(projectId);
  const createService = useCreateService();
  const suggest = useSuggest();

  const [activeTab, setActiveTab] = useState("suggested");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasRequestedSuggestions, setHasRequestedSuggestions] = useState(false);

  // Fuzzy lookup runs on every keystroke in the Search tab
  const { data: fuzzy } = useFuzzy(searchQuery);

  // New Service Modal
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] =
    useState<ServiceCategory>("llm");

  // Trigger LLM suggestion once we have a project + service list
  useEffect(() => {
    if (
      !project ||
      hasRequestedSuggestions ||
      suggest.isPending ||
      suggest.data
    ) {
      return;
    }
    setHasRequestedSuggestions(true);
    suggest.mutate({
      name: project.name,
      description: project.description,
      tech_stack: project.tech_stack ?? [],
    });
  }, [project, hasRequestedSuggestions, suggest]);

  const selectedServiceIds = useMemo(
    () => new Set((project?.services ?? []).map((s) => s.service.id)),
    [project],
  );

  const handleToggle = async (serviceId: number) => {
    if (!project) return;
    const isSelected = selectedServiceIds.has(serviceId);
    try {
      if (isSelected) {
        await fetch(`/api/projects/${project.id}/services/${serviceId}/`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pricepilot_jwt_access") ?? ""}`,
          },
        });
        qc.invalidateQueries({ queryKey: ["project", project.id] });
      } else {
        await addToProject.mutateAsync({ service_id: serviceId });
      }
    } catch (err) {
      toast({
        title: "Could not update project",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const handleCreateNewService = async () => {
    try {
      const created = await createService.mutateAsync({
        name: newServiceName,
        category: newServiceCategory,
        description: "User-submitted service awaiting community review.",
      });
      toast({
        title: "Service submitted",
        description: `"${created.name}" is now in the registry.`,
      });
      setIsNewServiceModalOpen(false);
      setNewServiceName("");
      // Auto-add to current project so the user can move on
      await addToProject.mutateAsync({ service_id: created.id });
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  if (!project) {
    return (
      <ProjectLayout projectId={params?.id ?? ""}>
        <div className="p-12 text-center text-muted-foreground">
          Loading project…
        </div>
      </ProjectLayout>
    );
  }

  const suggestedServiceIds = new Set<number>([
    ...(suggest.data?.matched ?? []).map((m) => m.service_id),
    ...(suggest.data?.suggestions ?? []).flatMap((s) =>
      s.options.map((o) => o.service_id),
    ),
  ]);
  const suggestedServices =
    suggestedServiceIds.size > 0
      ? allServices.filter((s) => suggestedServiceIds.has(s.id))
      : allServices.slice(0, 6);

  return (
    <ProjectLayout projectId={params?.id ?? ""}>
      {/* Step progress bar — always shown at the top of this page */}
      <StepProgressBar currentStep={2} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Add Services to Project</h2>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20"
            >
              {project.services.length} Selected
            </Badge>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 border border-border p-1 rounded-lg">
              <TabsTrigger
                value="suggested"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                AI Suggestions
              </TabsTrigger>
              <TabsTrigger
                value="registry"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Database className="w-4 h-4 mr-2 text-secondary-foreground" />
                Registry
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </TabsTrigger>
            </TabsList>

            {/* SUGGESTED */}
            <TabsContent value="suggested" className="mt-0">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  {suggest.isPending ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-muted-foreground animate-pulse">
                        Analyzing project architecture…
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/10">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {suggest.data
                          ? `Suggested from ${suggest.data.source === "anthropic" ? "Claude" : "the heuristic mock LLM"} based on your description.`
                          : `Based on "${project.description.substring(0, 30)}…", we recommend these foundational services.`}
                      </div>

                      <div className="grid gap-3">
                        {suggestedServices.map((service) => (
                          <div
                            key={service.id}
                            className={`flex items-center space-x-4 border p-4 rounded-lg cursor-pointer transition-colors ${
                              selectedServiceIds.has(service.id)
                                ? "bg-primary/5 border-primary/30"
                                : "bg-card hover:bg-muted/50 border-border"
                            }`}
                            onClick={() => handleToggle(service.id)}
                            data-testid={`suggestion-${service.id}`}
                          >
                            <Checkbox
                              checked={selectedServiceIds.has(service.id)}
                              onCheckedChange={() => handleToggle(service.id)}
                              className="w-5 h-5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium leading-none">
                                  {service.name}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5"
                                  style={{
                                    backgroundColor: `${service.icon_color}20`,
                                    color: service.icon_color,
                                  }}
                                >
                                  {CATEGORY_LABEL[service.category]}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {suggest.data?.unmatched &&
                        suggest.data.unmatched.length > 0 && (
                          <div className="mt-6 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed border-border">
                            <p className="font-medium text-foreground mb-1">
                              Unmatched suggestions
                            </p>
                            {suggest.data.unmatched.map((u) => (
                              <p key={u.name}>
                                • {u.name} — {u.reason}
                              </p>
                            ))}
                          </div>
                        )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* REGISTRY */}
            <TabsContent value="registry" className="mt-0">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Browse Registry</CardTitle>
                  <CardDescription>
                    Select from community-verified services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                    {allServices.map((service) => (
                      <div
                        key={service.id}
                        className={`flex flex-col space-y-3 border p-4 rounded-lg cursor-pointer transition-all ${
                          selectedServiceIds.has(service.id)
                            ? "bg-primary/5 border-primary/30"
                            : "bg-card hover:bg-muted/50 border-border"
                        }`}
                        onClick={() => handleToggle(service.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-xs"
                              style={{ color: service.icon_color }}
                            >
                              {service.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none">
                                {service.name}
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 mt-1"
                                style={{
                                  backgroundColor: `${service.icon_color}20`,
                                  color: service.icon_color,
                                }}
                              >
                                {CATEGORY_LABEL[service.category]}
                              </Badge>
                            </div>
                          </div>
                          <Checkbox
                            checked={selectedServiceIds.has(service.id)}
                            onCheckedChange={() => handleToggle(service.id)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEARCH — fuzzy search fires on every keystroke via useFuzzy(searchQuery) */}
            <TabsContent value="custom" className="mt-0">
              <Card className="bg-card border-border">
                <CardContent className="p-6 space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Type to find a service (e.g., 'openai', 'stripe')..."
                      className="pl-10 py-6 text-lg bg-background/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-fuzzy-search"
                    />
                  </div>

                  {/* Live search indicator */}
                  {searchQuery && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Live search — results update as you type
                    </div>
                  )}

                  {fuzzy?.matched && (
                    <div
                      className="flex items-center justify-between p-3 border border-green-500/30 bg-green-500/5 rounded-md cursor-pointer"
                      onClick={() => handleToggle(fuzzy.matched!.service_id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold"
                          style={{ color: fuzzy.matched.icon_color }}
                        >
                          {fuzzy.matched.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {fuzzy.matched.name}{" "}
                            <span className="text-xs text-green-500 font-normal">
                              · matched ({Math.round(fuzzy.matched.score)})
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {CATEGORY_LABEL[fuzzy.matched.category]}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={
                          selectedServiceIds.has(fuzzy.matched.service_id)
                            ? "secondary"
                            : "default"
                        }
                      >
                        {selectedServiceIds.has(fuzzy.matched.service_id)
                          ? "Added"
                          : "Add"}
                      </Button>
                    </div>
                  )}

                  {fuzzy && fuzzy.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground font-medium">
                        Did you mean…
                      </p>
                      <div className="grid gap-2">
                        {fuzzy.suggestions.map((s) => (
                          <div
                            key={s.service_id}
                            className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleToggle(s.service_id)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold"
                                style={{ color: s.icon_color }}
                              >
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {s.name}{" "}
                                  <span className="text-xs text-amber-500 font-normal">
                                    · {Math.round(s.score)}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {CATEGORY_LABEL[s.category]}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={
                                selectedServiceIds.has(s.service_id)
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {selectedServiceIds.has(s.service_id)
                                ? "Added"
                                : "Add"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchQuery &&
                    fuzzy &&
                    !fuzzy.matched &&
                    fuzzy.suggestions.length === 0 && (
                      <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-border">
                        <Database className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium">
                          Service not found in Registry
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          You can add it to the community registry.
                        </p>
                        <Button
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={() => {
                            setNewServiceName(searchQuery);
                            setIsNewServiceModalOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Service
                        </Button>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* CART / STACK PANEL */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-border shadow-lg shadow-black/5 flex flex-col h-[calc(100vh-200px)]">
            <CardHeader className="border-b border-border/50 pb-4 bg-muted/20">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Project Stack</span>
                <Badge variant="secondary">{project.services.length}</Badge>
              </CardTitle>
              <CardDescription>
                Services that will be modeled for costs.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto">
              {project.services.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                  <ServerIcon />
                  <p>Your stack is empty.</p>
                  <p className="text-sm mt-1">
                    Select services from the left to build your architecture.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {project.services.map((ps) => (
                      <motion.div
                        key={ps.service.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 flex items-center justify-between group hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded bg-background border flex items-center justify-center font-bold text-xs"
                            style={{
                              color: ps.service.icon_color,
                              borderColor: `${ps.service.icon_color}40`,
                            }}
                          >
                            {ps.service.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {ps.service.name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {CATEGORY_LABEL[ps.service.category]}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggle(ps.service.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>

            {/* Footer: always visible, shows hint when empty, activates when ≥1 service selected */}
            <div className="p-4 border-t border-border bg-card mt-auto space-y-2">
              {project.services.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Select at least 1 service to continue
                </p>
              )}
              <Link href={`/projects/${project.id}/variants`}>
                <Button
                  className="w-full py-6 group text-md font-medium"
                  disabled={project.services.length === 0}
                  data-testid="button-continue-variants"
                >
                  Continue to Pricing Variants
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* NEW SERVICE MODAL — unchanged */}
      <Dialog
        open={isNewServiceModalOpen}
        onOpenChange={setIsNewServiceModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suggest New Service</DialogTitle>
            <DialogDescription>
              This service isn't in our registry yet. Submit it for community
              review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g. Acme API"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newServiceCategory}
                onChange={(e) =>
                  setNewServiceCategory(e.target.value as ServiceCategory)
                }
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewServiceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewService}
              disabled={!newServiceName || createService.isPending}
            >
              {createService.isPending ? "Submitting…" : "Submit & Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectLayout>
  );
}

function ServerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mb-4 opacity-20"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}
