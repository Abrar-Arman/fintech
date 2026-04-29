import { useState, useMemo, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Sparkles, Database, Plus, Trash2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { useToast } from "@/hooks/use-toast";

export default function ProjectServices() {
  const [match, params] = useRoute("/projects/:id/services");
  const projectId = params?.id || "";
  const { state, dispatch } = useAppStore();
  const { toast } = useToast();
  
  const project = state.projects.find(p => p.id === projectId);
  
  const [activeTab, setActiveTab] = useState("suggested");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  
  // New Service Modal state
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("LLM");
  
  useEffect(() => {
    // Simulate AI analysis delay
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const fuse = useMemo(() => new Fuse(state.services, {
    keys: ["name", "description", "category"],
    threshold: 0.4
  }), [state.services]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return fuse.search(searchQuery).map(r => ({ item: r.item, score: r.score }));
  }, [searchQuery, fuse]);

  if (!project) return null;

  const selectedServiceIds = new Set(project.services.map(s => s.serviceId));

  const toggleService = (serviceId: string) => {
    const isSelected = selectedServiceIds.has(serviceId);
    let newServices;
    
    if (isSelected) {
      newServices = project.services.filter(s => s.serviceId !== serviceId);
    } else {
      newServices = [...project.services, { serviceId, variantId: null }];
    }
    
    dispatch({
      type: "UPDATE_PROJECT",
      payload: { ...project, services: newServices }
    });
  };

  const handleCreateNewService = () => {
    toast({
      title: "Service Submitted for Review",
      description: "Your service has been submitted. The community will vote on its addition to the registry.",
    });
    setIsNewServiceModalOpen(false);
    setNewServiceName("");
  };

  // Mock AI Suggestions based on project description
  const suggestedServices = state.services.filter(s => {
    const text = (project.name + " " + project.description).toLowerCase();
    if (text.includes("agent") || text.includes("ai")) return s.category === "LLM" || s.category === "Vector DB";
    if (text.includes("support")) return s.category === "LLM" || s.category === "Communication";
    return s.isOfficial;
  }).slice(0, 4);

  return (
    <ProjectLayout projectId={projectId}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left side: Service Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Add Services to Project</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {project.services.length} Selected
            </Badge>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 border border-border p-1 rounded-lg">
              <TabsTrigger value="suggested" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                AI Suggestions
              </TabsTrigger>
              <TabsTrigger value="registry" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Database className="w-4 h-4 mr-2 text-secondary-foreground" />
                Registry
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Search className="w-4 h-4 mr-2" />
                Search
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="suggested" className="mt-0">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-muted-foreground animate-pulse">Analyzing project architecture...</p>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/10">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Based on "{project.description.substring(0, 30)}...", we recommend these foundational services.
                      </div>
                      
                      <div className="grid gap-3">
                        {suggestedServices.map(service => (
                          <div 
                            key={service.id}
                            className={`flex items-center space-x-4 border p-4 rounded-lg cursor-pointer transition-colors ${
                              selectedServiceIds.has(service.id) ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50 border-border"
                            }`}
                            onClick={() => toggleService(service.id)}
                          >
                            <Checkbox 
                              checked={selectedServiceIds.has(service.id)} 
                              onCheckedChange={() => toggleService(service.id)}
                              className="w-5 h-5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium leading-none">{service.name}</p>
                                <Badge variant="secondary" className="text-[10px] h-5" style={{ backgroundColor: `${service.iconColor}20`, color: service.iconColor }}>
                                  {service.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="registry" className="mt-0">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Browse Registry</CardTitle>
                  <CardDescription>Select from community-verified services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                    {state.services.map(service => (
                       <div 
                        key={service.id}
                        className={`flex flex-col space-y-3 border p-4 rounded-lg cursor-pointer transition-all ${
                          selectedServiceIds.has(service.id) ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50 border-border"
                        }`}
                        onClick={() => toggleService(service.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-xs" style={{ color: service.iconColor }}>
                               {service.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none">{service.name}</p>
                              <Badge variant="secondary" className="text-[10px] h-4 mt-1" style={{ backgroundColor: `${service.iconColor}20`, color: service.iconColor }}>
                                {service.category}
                              </Badge>
                            </div>
                          </div>
                          <Checkbox 
                            checked={selectedServiceIds.has(service.id)} 
                            onCheckedChange={() => toggleService(service.id)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="custom" className="mt-0">
              <Card className="bg-card border-border">
                <CardContent className="p-6 space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input 
                      placeholder="Type to find a service (e.g., 'openai', 'stripe')..." 
                      className="pl-10 py-6 text-lg bg-background/50"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {searchQuery && searchResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground font-medium">Search Results</p>
                      <div className="grid gap-2">
                        {searchResults.slice(0, 5).map(({ item, score }) => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleService(item.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold" style={{ color: item.iconColor }}>
                                {item.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm flex items-center gap-2">
                                  {item.name}
                                  {score && score > 0.4 && (
                                    <span className="text-xs text-amber-500 font-normal">Did you mean this?</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                              </div>
                            </div>
                            <Button size="sm" variant={selectedServiceIds.has(item.id) ? "secondary" : "default"}>
                              {selectedServiceIds.has(item.id) ? "Added" : "Add"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-border">
                      <Database className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-foreground font-medium">Service not found in Registry</p>
                      <p className="text-sm text-muted-foreground mb-4">You can add it to the community registry.</p>
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => setIsNewServiceModalOpen(true)}>
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

        {/* Right side: Selected Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-border shadow-lg shadow-black/5 flex flex-col h-[calc(100vh-200px)]">
            <CardHeader className="border-b border-border/50 pb-4 bg-muted/20">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Project Stack</span>
                <Badge variant="secondary">{project.services.length}</Badge>
              </CardTitle>
              <CardDescription>Services that will be modeled for costs.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {project.services.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                  <Server className="w-12 h-12 mb-4 opacity-20" />
                  <p>Your stack is empty.</p>
                  <p className="text-sm mt-1">Select services from the left to build your architecture.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {project.services.map((ps) => {
                      const service = state.services.find(s => s.id === ps.serviceId);
                      if (!service) return null;
                      
                      return (
                        <motion.div 
                          key={ps.serviceId}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 flex items-center justify-between group hover:bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-background border flex items-center justify-center font-bold text-xs" style={{ color: service.iconColor, borderColor: `${service.iconColor}40` }}>
                              {service.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{service.name}</p>
                              <p className="text-xs text-muted-foreground">{service.category}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => toggleService(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-border bg-card mt-auto">
              <Link href={`/projects/${project.id}/variants`}>
                <Button 
                  className="w-full py-6 group text-md font-medium" 
                  disabled={project.services.length === 0}
                >
                  Continue to Pricing Models
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Create New Service Dialog */}
      <Dialog open={isNewServiceModalOpen} onOpenChange={setIsNewServiceModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suggest New Service</DialogTitle>
            <DialogDescription>
              This service isn't in our registry yet. Submit it for community review. Other users will vote on its addition.
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
                onChange={(e) => setNewServiceCategory(e.target.value)}
              >
                <option value="LLM">LLM</option>
                <option value="Vector DB">Vector DB</option>
                <option value="Hosting">Hosting</option>
                <option value="Storage">Storage</option>
                <option value="Payments">Payments</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Communication">Communication</option>
                <option value="Auth">Auth</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewServiceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateNewService} disabled={!newServiceName}>Submit for Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ProjectLayout>
  );
}

// Ensure lucide icon is defined, using generic Server icon
function Server(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>;
}