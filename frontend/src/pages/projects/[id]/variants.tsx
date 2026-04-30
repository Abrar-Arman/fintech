import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useAddServiceToProject,
  useCreateVariant,
  useProject,
  useVariants,
  useVote,
} from "@/lib/queries";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  PricingModelType,
  PricingVariant,
  ProjectService,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABEL: Record<string, string> = {
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

export default function ProjectVariants() {
  const [, params] = useRoute("/projects/:id/variants");
  const projectIdRaw = params?.id ?? "";
  const projectId = projectIdRaw ? Number(projectIdRaw) : undefined;
  const { toast } = useToast();

  const { data: project } = useProject(projectId);
  const addToProject = useAddServiceToProject(projectId);
  const vote = useVote();
  const createVariant = useCreateVariant();

  const [customVariantModalOpen, setCustomVariantModalOpen] = useState(false);
  const [activeServiceIdForCustom, setActiveServiceIdForCustom] = useState<
    number | null
  >(null);
  const [customModelType, setCustomModelType] =
    useState<PricingModelType>("per_token");
  const [customFields, setCustomFields] = useState<Record<string, number>>({});
  const [customName, setCustomName] = useState("");

  if (!project) {
    return (
      <ProjectLayout projectId={projectIdRaw}>
        <div className="p-12 text-center text-muted-foreground">
          Loading project…
        </div>
      </ProjectLayout>
    );
  }

  const selectVariant = async (serviceId: number, variantId: number) => {
    try {
      await addToProject.mutateAsync({
        service_id: serviceId,
        variant_id: variantId,
      });
    } catch (err) {
      toast({
        title: "Could not select variant",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const handleVote = async (variantId: number, value: -1 | 0 | 1) => {
    try {
      await vote.mutateAsync({ id: variantId, value });
    } catch (err) {
      toast({
        title: "Vote failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const openCustomVariantModal = (serviceId: number) => {
    setActiveServiceIdForCustom(serviceId);
    setCustomModelType("per_token");
    setCustomFields({});
    setCustomName("");
    setCustomVariantModalOpen(true);
  };

  const saveCustomVariant = async () => {
    if (!activeServiceIdForCustom) return;
    try {
      const created = await createVariant.mutateAsync({
        service: activeServiceIdForCustom,
        label: customName || "Custom variant",
        model_type: customModelType,
        usage_inputs: customFields,
        notes: "User-defined custom variant.",
      });
      await selectVariant(activeServiceIdForCustom, created.id);
      setCustomVariantModalOpen(false);
    } catch (err) {
      toast({
        title: "Could not save variant",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const allServicesHaveVariant = project.services.every((ps) => ps.variant);

  return (
    <ProjectLayout projectId={projectIdRaw}>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Select Pricing Models</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how each service charges to accurately predict costs.
            </p>
          </div>
          {allServicesHaveVariant && (
            <Link href={`/projects/${project.id}/usage`}>
              <Button className="group" data-testid="button-continue-usage">
                Continue to Usage
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          )}
        </div>

        {project.services.length === 0 ? (
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <p>No services selected yet.</p>
              <Link href={`/projects/${project.id}/services`}>
                <Button variant="link" className="mt-2 text-primary">
                  Go back and add services
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {project.services.map((ps, idx) => (
              <ServiceVariantsCard
                key={ps.service.id}
                ps={ps}
                index={idx}
                onSelect={selectVariant}
                onVote={handleVote}
                onAddCustom={openCustomVariantModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom Variant Dialog */}
      <Dialog
        open={customVariantModalOpen}
        onOpenChange={setCustomVariantModalOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Custom Pricing Variant</DialogTitle>
            <DialogDescription>
              Define a pricing model for this service.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="variantName">Variant Name</Label>
              <Input
                id="variantName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Enterprise Tier 2025"
              />
            </div>

            <Tabs
              value={customModelType}
              onValueChange={(v) =>
                setCustomModelType(v as PricingModelType)
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                <TabsTrigger value="per_token" className="text-xs py-2">
                  Per Token
                </TabsTrigger>
                <TabsTrigger value="per_seat" className="text-xs py-2">
                  Per Seat
                </TabsTrigger>
                <TabsTrigger value="per_request" className="text-xs py-2">
                  Per Request
                </TabsTrigger>
                <TabsTrigger value="flat_rate" className="text-xs py-2">
                  Flat Rate
                </TabsTrigger>
                <TabsTrigger value="usage_based" className="text-xs py-2">
                  Usage Based
                </TabsTrigger>
                <TabsTrigger value="tiered" className="text-xs py-2">
                  Tiered
                </TabsTrigger>
              </TabsList>

              <div className="bg-muted/30 p-4 rounded-md border border-border">
                <TabsContent value="per_token" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Charges based on tokens processed. Common for LLMs.
                  </p>
                  <NumField
                    label="Input Price per 1k Tokens ($)"
                    keyName="input_price_per_1k"
                    step={0.0001}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                  <NumField
                    label="Output Price per 1k Tokens ($)"
                    keyName="output_price_per_1k"
                    step={0.0001}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                </TabsContent>

                <TabsContent value="per_seat" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Charges per active user/seat. Common for SaaS tools.
                  </p>
                  <NumField
                    label="Price per Seat ($/mo)"
                    keyName="price_per_seat"
                    step={1}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                </TabsContent>

                <TabsContent value="per_request" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Charges per API call or transaction.
                  </p>
                  <NumField
                    label="Price per Request ($)"
                    keyName="price_per_request"
                    step={0.001}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                </TabsContent>

                <TabsContent value="flat_rate" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Single fixed monthly fee regardless of usage.
                  </p>
                  <NumField
                    label="Monthly Fee ($)"
                    keyName="monthly_fee"
                    step={1}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                </TabsContent>

                <TabsContent value="usage_based" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Charges based on storage, bandwidth, or compute.
                  </p>
                  <NumField
                    label="Price per GB Storage ($)"
                    keyName="price_per_gb_storage"
                    step={0.01}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                  <NumField
                    label="Price per GB Bandwidth ($)"
                    keyName="price_per_gb_bandwidth"
                    step={0.01}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                  <NumField
                    label="Price per Compute Hour ($)"
                    keyName="price_per_compute_hour"
                    step={0.01}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                </TabsContent>

                <TabsContent value="tiered" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Base fee with included requests, plus overage pricing.
                  </p>
                  <NumField
                    label="Base Monthly Fee ($)"
                    keyName="base_fee"
                    step={1}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                  <NumField
                    label="Included Requests per Month"
                    keyName="included_requests"
                    step={1}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                  <NumField
                    label="Overage Price per Request ($)"
                    keyName="overage_price_per_request"
                    step={0.001}
                    fields={customFields}
                    setFields={setCustomFields}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomVariantModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveCustomVariant}
              disabled={!customName || createVariant.isPending}
            >
              {createVariant.isPending ? "Saving…" : "Save & Select Variant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectLayout>
  );
}

function NumField({
  label,
  keyName,
  step,
  fields,
  setFields,
}: {
  label: string;
  keyName: string;
  step: number;
  fields: Record<string, number>;
  setFields: (f: Record<string, number>) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={fields[keyName] ?? ""}
        onChange={(e) =>
          setFields({ ...fields, [keyName]: Number(e.target.value) })
        }
      />
    </div>
  );
}

function ServiceVariantsCard({
  ps,
  index,
  onSelect,
  onVote,
  onAddCustom,
}: {
  ps: ProjectService;
  index: number;
  onSelect: (serviceId: number, variantId: number) => void | Promise<void>;
  onVote: (variantId: number, value: -1 | 0 | 1) => void | Promise<void>;
  onAddCustom: (serviceId: number) => void;
}) {
  const { data } = useVariants(ps.service.id);
  const variants = useMemo(
    () =>
      (data?.results ?? [])
        .slice()
        .sort((a, b) => b.net_score - a.net_score),
    [data],
  );
  const isSelected = !!ps.variant;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={`border-2 transition-colors ${isSelected ? "border-primary/20 bg-card" : "border-border bg-card/50"}`}
      >
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded bg-background border flex items-center justify-center font-bold text-lg shadow-sm"
              style={{
                color: ps.service.icon_color,
                borderColor: `${ps.service.icon_color}40`,
              }}
            >
              {ps.service.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {ps.service.name}
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono"
                >
                  {CATEGORY_LABEL[ps.service.category] ?? ps.service.category}
                </Badge>
                {ps.service.official_url && (
                  <a
                    href={ps.service.official_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center"
                  >
                    Official Pricing <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y divide-border/50">
            {variants.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No variants yet. Create the first one below.
              </div>
            )}
            {variants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                isActive={ps.variant?.id === variant.id}
                onSelect={() => onSelect(ps.service.id, variant.id)}
                onVote={(val) => onVote(variant.id, val)}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 p-4 border-t border-border/50 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Can't find the right pricing?
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => onAddCustom(ps.service.id)}
          >
            + Create Custom Variant
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function VariantRow({
  variant,
  isActive,
  onSelect,
  onVote,
}: {
  variant: PricingVariant;
  isActive: boolean;
  onSelect: () => void;
  onVote: (value: -1 | 0 | 1) => void;
}) {
  return (
    <div
      className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-muted/30 ${isActive ? "bg-primary/5" : ""}`}
      onClick={onSelect}
      data-testid={`variant-row-${variant.id}`}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{variant.label}</span>
          {variant.is_official && (
            <Badge
              variant="secondary"
              className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"
            >
              Official
            </Badge>
          )}
          {variant.is_outdated && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Outdated / Unreliable
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
            Model: {variant.model_type}
          </span>
          <span>Added by {variant.created_by_username || "system"}</span>
          <span>
            {formatDistanceToNow(new Date(variant.created_at))} ago
          </span>
        </div>

        <div className="mt-3 text-xs font-mono text-muted-foreground bg-background border border-border p-2 rounded-md inline-block max-w-full overflow-x-auto">
          {Object.entries(variant.usage_inputs ?? {}).map(([k, v]) => (
            <span key={k} className="mr-3 whitespace-nowrap">
              <span className="text-foreground/50">{k}:</span>{" "}
              <span className="text-foreground">{String(v)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 bg-background border border-border rounded-full p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-full ${variant.user_vote === 1 ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-green-500"}`}
            onClick={() => onVote(variant.user_vote === 1 ? 0 : 1)}
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <span className="text-xs font-bold font-mono w-6 text-center">
            {variant.net_score}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-full ${variant.user_vote === -1 ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-red-500"}`}
            onClick={() => onVote(variant.user_vote === -1 ? 0 : -1)}
          >
            <ThumbsDown className="w-3 h-3" />
          </Button>
        </div>

        <Button
          variant={isActive ? "default" : "outline"}
          className={
            isActive ? "bg-primary text-primary-foreground pointer-events-none" : ""
          }
          onClick={onSelect}
        >
          {isActive ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
}
