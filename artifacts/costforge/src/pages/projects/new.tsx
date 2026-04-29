import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateProject } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { mutateAsync: createProject, isPending } = useCreateProject();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetTarget, setBudgetTarget] = useState<number>(1000);
  const [techStack, setTechStack] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const project = await createProject({
        name,
        description,
        budget_target: budgetTarget,
        tech_stack: techStack
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setLocation(`/projects/${project.id}/services`);
    } catch (err) {
      toast({
        title: "Could not create project",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-4 text-muted-foreground"
            >
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Create New Project
          </h1>
          <p className="text-muted-foreground text-lg">
            Define your agent's purpose to start predicting costs.
          </p>
        </div>

        <Card className="border-primary/20 shadow-xl shadow-primary/5">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Customer Support Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-background/50 text-lg py-6"
                  data-testid="input-project-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">What does this agent do?</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the agent's responsibilities, integrations, and capabilities... This helps our AI suggest the right services."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-background/50 min-h-[120px] resize-none"
                  data-testid="input-project-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="budget" className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    Monthly Budget Target ($)
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    min="1"
                    value={budgetTarget}
                    onChange={(e) => setBudgetTarget(Number(e.target.value))}
                    required
                    className="bg-background/50 font-mono text-lg"
                    data-testid="input-project-budget"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stack" className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    Tech Stack (Optional)
                  </Label>
                  <Input
                    id="stack"
                    placeholder="React, Python, AWS..."
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma separated
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-4 py-6 text-lg group"
                size="lg"
                disabled={isPending}
                data-testid="button-create-project"
              >
                {isPending ? "Creating…" : "Continue to Service Selection"}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
