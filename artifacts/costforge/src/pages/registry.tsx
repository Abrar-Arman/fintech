import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Database, ExternalLink, ActivitySquare } from "lucide-react";
import Fuse from "fuse.js";
import { formatDistanceToNow } from "date-fns";

export default function Registry() {
  const { state } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(state.services.map(s => s.category));
    return Array.from(cats);
  }, [state.services]);

  const fuse = useMemo(() => new Fuse(state.services, {
    keys: ["name", "description", "category"],
    threshold: 0.3
  }), [state.services]);

  let filteredServices = state.services;
  
  if (searchQuery) {
    filteredServices = fuse.search(searchQuery).map(r => r.item);
  }
  
  if (activeCategory) {
    filteredServices = filteredServices.filter(s => s.category === activeCategory);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Service Registry</h1>
          <p className="text-muted-foreground">Community-maintained database of AI agent infrastructure and their pricing models.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search services..." 
              className="pl-10 bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Badge 
              variant={activeCategory === null ? "default" : "outline"} 
              className="cursor-pointer px-3 py-1 text-sm"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Badge>
            {categories.map(cat => (
              <Badge 
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"} 
                className="cursor-pointer px-3 py-1 text-sm"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => {
            const serviceVariants = state.variants.filter(v => v.serviceId === service.id);
            
            return (
              <Card key={service.id} className="border-border hover:border-primary/30 transition-colors flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl font-bold border border-border" style={{ color: service.iconColor }}>
                      {service.name.charAt(0)}
                    </div>
                    {service.isOfficial && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Verified</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription className="line-clamp-2 h-10">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0 pb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-[10px] uppercase" style={{ color: service.iconColor, borderColor: `${service.iconColor}40` }}>
                      {service.category}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ActivitySquare className="w-4 h-4" />
                      <span className="font-medium text-foreground">{serviceVariants.length}</span> pricing models
                    </div>
                    <a href={service.officialUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
