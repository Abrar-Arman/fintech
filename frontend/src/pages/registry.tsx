import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useServices } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, ActivitySquare } from "lucide-react";
import type { ServiceCategory } from "@/lib/api";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
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

export default function Registry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(
    null,
  );

  const { data, isLoading } = useServices({
    search: searchQuery,
    category: activeCategory ?? "",
  });
  const services = data?.results ?? [];

  // Use the unfiltered fetch only for category chips so they reflect every
  // category present in the registry, not just the currently filtered slice.
  const { data: allData } = useServices();
  const categories = useMemo(() => {
    const cats = new Set<ServiceCategory>();
    (allData?.results ?? []).forEach((s) => cats.add(s.category));
    return Array.from(cats);
  }, [allData]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Service Registry
          </h1>
          <p className="text-muted-foreground">
            Community-maintained database of AI agent infrastructure and their
            pricing models.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              className="pl-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-registry-search"
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
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-sm"
                onClick={() => setActiveCategory(cat)}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Card className="bg-muted/10">
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading registry…
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="border-border hover:border-primary/30 transition-colors flex flex-col"
                data-testid={`card-service-${service.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div
                      className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl font-bold border border-border"
                      style={{ color: service.icon_color }}
                    >
                      {service.name.charAt(0)}
                    </div>
                    {service.is_official && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        Verified
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription className="line-clamp-2 h-10">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0 pb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase"
                      style={{
                        color: service.icon_color,
                        borderColor: `${service.icon_color}40`,
                      }}
                    >
                      {CATEGORY_LABELS[service.category] ?? service.category}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ActivitySquare className="w-4 h-4" />
                      <span className="font-medium text-foreground">
                        {service.variant_count}
                      </span>{" "}
                      pricing models
                    </div>
                    {service.official_url && (
                      <a
                        href={service.official_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {services.length === 0 && (
              <div className="col-span-full">
                <Card className="bg-muted/10">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    No services match your search.
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
