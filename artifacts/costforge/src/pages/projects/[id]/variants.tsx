import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingVariant, PricingModelType } from "@/lib/mock-data";

export default function ProjectVariants() {
  const [match, params] = useRoute("/projects/:id/variants");
  const projectId = params?.id || "";
  const { state, dispatch } = useAppStore();
  
  const project = state.projects.find(p => p.id === projectId);
  
  const [customVariantModalOpen, setCustomVariantModalOpen] = useState(false);
  const [activeServiceIdForCustom, setActiveServiceIdForCustom] = useState<string | null>(null);
  
  // Custom Variant Form State
  const [customModelType, setCustomModelType] = useState<PricingModelType>("per_token");
  const [customFields, setCustomFields] = useState<any>({});
  const [customName, setCustomName] = useState("");

  if (!project) return null;

  // Group variants by service
  const projectServices = project.services.map(ps => {
    const service = state.services.find(s => s.id === ps.serviceId);
    const serviceVariants = state.variants.filter(v => v.serviceId === ps.serviceId)
      .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      
    return { ...ps, service, availableVariants: serviceVariants };
  }).filter(ps => ps.service);

  const selectVariant = (serviceId: string, variantId: string) => {
    const updatedServices = project.services.map(ps => 
      ps.serviceId === serviceId ? { ...ps, variantId, customVariant: undefined } : ps
    );
    
    dispatch({
      type: "UPDATE_PROJECT",
      payload: { ...project, services: updatedServices }
    });
  };

  const handleVote = (variantId: string, vote: 1 | -1) => {
    dispatch({ type: "VOTE_VARIANT", payload: { variantId, vote } });
  };
  
  const openCustomVariantModal = (serviceId: string) => {
    setActiveServiceIdForCustom(serviceId);
    setCustomModelType("per_token");
    setCustomFields({});
    setCustomName("");
    setCustomVariantModalOpen(true);
  };

  const saveCustomVariant = () => {
    if (!activeServiceIdForCustom) return;
    
    const newVariant: PricingVariant = {
      id: crypto.randomUUID(),
      serviceId: activeServiceIdForCustom,
      name: customName || "Custom User Variant",
      modelType: customModelType,
      fields: customFields,
      createdBy: "You",
      createdAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      isOfficial: false
    };

    // First add to global variants
    dispatch({ type: "ADD_VARIANT", payload: newVariant });
    
    // Then select it for this project
    selectVariant(activeServiceIdForCustom, newVariant.id);
    
    setCustomVariantModalOpen(false);
  };

  const allServicesHaveVariant = project.services.every(ps => ps.variantId || ps.customVariant);

  return (
    <ProjectLayout projectId={projectId}>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Select Pricing Models</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose how each service charges to accurately predict costs.</p>
          </div>
          {allServicesHaveVariant && (
            <Link href={`/projects/${project.id}/usage`}>
              <Button className="group">
                Continue to Usage
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          )}
        </div>

        {projectServices.length === 0 ? (
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <p>No services selected yet.</p>
              <Link href={`/projects/${project.id}/services`}>
                <Button variant="link" className="mt-2 text-primary">Go back and add services</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {projectServices.map((ps, idx) => {
              if (!ps.service) return null;
              const isSelected = !!ps.variantId || !!ps.customVariant;
              
              return (
                <motion.div 
                  key={ps.service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`border-2 transition-colors ${isSelected ? 'border-primary/20 bg-card' : 'border-border bg-card/50'}`}>
                    <CardHeader className="pb-4 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-background border flex items-center justify-center font-bold text-lg shadow-sm" style={{ color: ps.service.iconColor, borderColor: `${ps.service.iconColor}40` }}>
                          {ps.service.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {ps.service.name}
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">{ps.service.category}</Badge>
                            <a href={ps.service.officialUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center">
                              Official Pricing <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 divide-y divide-border/50">
                        {ps.availableVariants.map(variant => {
                          const netVotes = variant.upvotes - variant.downvotes;
                          const isOld = new Date(variant.createdAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;
                          const isWarning = netVotes < 0 || (isOld && !variant.isOfficial);
                          const isActive = ps.variantId === variant.id;
                          const userVote = state.votes[variant.id] || 0;
                          
                          return (
                            <div 
                              key={variant.id} 
                              className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-muted/30 ${isActive ? 'bg-primary/5' : ''}`}
                              onClick={() => selectVariant(ps.serviceId, variant.id)}
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{variant.name}</span>
                                  {variant.isOfficial && (
                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Official</Badge>
                                  )}
                                  {isWarning && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Outdated / Unreliable
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">Model: {variant.modelType}</span>
                                  <span>Added by {variant.createdBy}</span>
                                  <span>{formatDistanceToNow(new Date(variant.createdAt))} ago</span>
                                </div>
                                
                                {/* Quick fields preview */}
                                <div className="mt-3 text-xs font-mono text-muted-foreground bg-background border border-border p-2 rounded-md inline-block">
                                  {Object.entries(variant.fields).map(([k, v]) => (
                                    <span key={k} className="mr-3">
                                      <span className="text-foreground/50">{k}:</span> <span className="text-foreground">{String(v)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-1 bg-background border border-border rounded-full p-1 shadow-sm">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={`h-7 w-7 rounded-full ${userVote === 1 ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:text-green-500'}`}
                                    onClick={() => handleVote(variant.id, userVote === 1 ? 0 : 1)}
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                  </Button>
                                  <span className="text-xs font-bold font-mono w-6 text-center">{netVotes}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={`h-7 w-7 rounded-full ${userVote === -1 ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-red-500'}`}
                                    onClick={() => handleVote(variant.id, userVote === -1 ? 0 : -1)}
                                  >
                                    <ThumbsDown className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                <Button 
                                  variant={isActive ? "default" : "outline"} 
                                  className={isActive ? "bg-primary text-primary-foreground pointer-events-none" : ""}
                                  onClick={() => selectVariant(ps.serviceId, variant.id)}
                                >
                                  {isActive ? "Selected" : "Select"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/10 p-4 border-t border-border/50 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Can't find the right pricing?</span>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => openCustomVariantModal(ps.serviceId)}>
                        + Create Custom Variant
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Variant Dialog */}
      <Dialog open={customVariantModalOpen} onOpenChange={setCustomVariantModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Custom Pricing Variant</DialogTitle>
            <DialogDescription>
              Define a pricing model for this service. You can choose from 6 different pricing paradigms.
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

            <Tabs value={customModelType} onValueChange={(v) => setCustomModelType(v as PricingModelType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                <TabsTrigger value="per_token" className="text-xs py-2">Per Token</TabsTrigger>
                <TabsTrigger value="per_seat" className="text-xs py-2">Per Seat</TabsTrigger>
                <TabsTrigger value="per_request" className="text-xs py-2">Per Request</TabsTrigger>
                <TabsTrigger value="flat_rate" className="text-xs py-2">Flat Rate</TabsTrigger>
                <TabsTrigger value="usage_based" className="text-xs py-2">Usage Based</TabsTrigger>
                <TabsTrigger value="tiered" className="text-xs py-2">Tiered</TabsTrigger>
              </TabsList>
              
              <div className="bg-muted/30 p-4 rounded-md border border-border">
                <TabsContent value="per_token" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Charges based on the number of tokens processed. Common for LLMs like GPT-4 or Claude.</p>
                  <div className="grid gap-2">
                    <Label>Input Price per 1k Tokens ($)</Label>
                    <Input type="number" step="0.0001" onChange={(e) => setCustomFields({...customFields, inputPricePer1k: Number(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Output Price per 1k Tokens ($)</Label>
                    <Input type="number" step="0.0001" onChange={(e) => setCustomFields({...customFields, outputPricePer1k: Number(e.target.value)})} />
                  </div>
                </TabsContent>
                
                <TabsContent value="per_seat" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Charges a fixed amount per active user/seat. Common for SaaS tools like GitHub or Vercel.</p>
                  <div className="grid gap-2">
                    <Label>Price per Seat ($/mo)</Label>
                    <Input type="number" step="1" onChange={(e) => setCustomFields({...customFields, pricePerSeat: Number(e.target.value)})} />
                  </div>
                </TabsContent>

                <TabsContent value="per_request" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Charges per API call or transaction. Common for payment gateways or search APIs.</p>
                  <div className="grid gap-2">
                    <Label>Price per Request ($)</Label>
                    <Input type="number" step="0.001" onChange={(e) => setCustomFields({...customFields, pricePerRequest: Number(e.target.value)})} />
                  </div>
                </TabsContent>

                <TabsContent value="flat_rate" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">A single fixed monthly fee regardless of usage. Common for basic hosting or fixed plans.</p>
                  <div className="grid gap-2">
                    <Label>Monthly Fee ($)</Label>
                    <Input type="number" step="1" onChange={(e) => setCustomFields({...customFields, monthlyFee: Number(e.target.value)})} />
                  </div>
                </TabsContent>

                <TabsContent value="usage_based" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Charges based on computing resources like Storage, Bandwidth, or Compute Hours. Common for AWS or Pinecone.</p>
                  <div className="grid gap-2">
                    <Label>Price per GB Storage ($)</Label>
                    <Input type="number" step="0.01" onChange={(e) => setCustomFields({...customFields, pricePerGbStorage: Number(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Price per GB Bandwidth ($)</Label>
                    <Input type="number" step="0.01" onChange={(e) => setCustomFields({...customFields, pricePerGbBandwidth: Number(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Price per Compute Hour ($)</Label>
                    <Input type="number" step="0.01" onChange={(e) => setCustomFields({...customFields, pricePerComputeHour: Number(e.target.value)})} />
                  </div>
                </TabsContent>

                <TabsContent value="tiered" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Includes a base number of requests for a fixed fee, then charges for overages. Common for API platforms.</p>
                  <div className="grid gap-2">
                    <Label>Base Monthly Fee ($)</Label>
                    <Input type="number" step="1" onChange={(e) => setCustomFields({...customFields, baseFee: Number(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Included Requests per Month</Label>
                    <Input type="number" step="1" onChange={(e) => setCustomFields({...customFields, includedRequests: Number(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Overage Price per Request ($)</Label>
                    <Input type="number" step="0.001" onChange={(e) => setCustomFields({...customFields, overagePricePerRequest: Number(e.target.value)})} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomVariantModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCustomVariant} disabled={!customName}>Save & Select Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectLayout>
  );
}
