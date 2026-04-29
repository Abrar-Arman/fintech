import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { calculateVariantCost } from "@/lib/calculator";
import { ArrowRight, Users, MessageSquare, Database, HardDrive, Cpu, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

export default function ProjectUsage() {
  const [match, params] = useRoute("/projects/:id/usage");
  const projectId = params?.id || "";
  const { state, dispatch } = useAppStore();
  
  const project = state.projects.find(p => p.id === projectId);
  
  const [usage, setUsage] = useState(project?.usage || {
    activeUsers: 1000,
    tokensPerRequest: 1500,
    requestsPerUser: 20,
    storageGb: 50,
    bandwidthGb: 100,
    computeHours: 720
  });

  // Save to context on unmount or navigation
  useEffect(() => {
    if (project) {
      const timer = setTimeout(() => {
        dispatch({
          type: "UPDATE_PROJECT",
          payload: { ...project, usage }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [usage, project, dispatch]);

  if (!project) return null;

  // Calculate live preview
  const liveCosts = project.services.map(ps => {
    const service = state.services.find(s => s.id === ps.serviceId);
    const variant = ps.customVariant || state.variants.find(v => v.id === ps.variantId);
    if (!service || !variant) return null;
    
    return {
      service,
      variant,
      cost: calculateVariantCost(variant, usage)
    };
  }).filter(Boolean) as Array<{service: any, variant: any, cost: number}>;

  const totalCost = liveCosts.reduce((sum, item) => sum + item.cost, 0);

  const renderSliderInput = (
    label: string, 
    id: keyof typeof usage, 
    min: number, 
    max: number, 
    step: number, 
    icon: any, 
    desc: string,
    format: (val: number) => string = String
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
            onChange={(e) => setUsage({...usage, [id]: Number(e.target.value)})}
            className="w-24 text-right font-mono"
          />
        </div>
        <div className="pt-2">
          <Slider 
            value={[usage[id]]} 
            min={min} 
            max={max} 
            step={step}
            onValueChange={(val) => setUsage({...usage, [id]: val[0]})}
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
    <ProjectLayout projectId={projectId}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Estimate Operational Usage</h2>
            <p className="text-sm text-muted-foreground mt-1">Adjust the sliders to reflect your expected traffic and usage patterns.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSliderInput("Monthly Active Users", "activeUsers", 10, 100000, 10, Users, "Total users interacting per month", (v) => v >= 1000 ? `${v/1000}k` : String(v))}
            {renderSliderInput("Avg Tokens / Request", "tokensPerRequest", 100, 10000, 100, MessageSquare, "Context window + generation size", (v) => v >= 1000 ? `${v/1000}k` : String(v))}
            {renderSliderInput("Requests / User / Mo", "requestsPerUser", 1, 1000, 1, Activity, "How often each user interacts")}
            {renderSliderInput("Vector Storage (GB)", "storageGb", 1, 1000, 1, Database, "Embeddings and persistent storage")}
            {renderSliderInput("Bandwidth (GB)", "bandwidthGb", 1, 10000, 10, HardDrive, "Egress traffic per month")}
            {renderSliderInput("Compute Hours", "computeHours", 1, 730, 1, Cpu, "Always-on services (730h = 1 month)")}
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
                <span className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Estimated</span>
                <motion.div 
                  key={totalCost}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-primary font-mono tabular-nums"
                >
                  ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </motion.div>
                <span className="text-xs text-muted-foreground mt-1">per month</span>
              </div>
              
              <div className="p-4 max-h-[300px] overflow-y-auto space-y-3 bg-muted/10">
                {liveCosts.map((item) => (
                  <div key={item.service.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.service.iconColor }} />
                      <span className="text-sm font-medium text-foreground">{item.service.name}</span>
                    </div>
                    <span className="text-sm font-mono tabular-nums">${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t border-border bg-card">
              <Link href={`/projects/${project.id}/cost`}>
                <Button className="w-full py-6 text-md font-bold group" size="lg">
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
