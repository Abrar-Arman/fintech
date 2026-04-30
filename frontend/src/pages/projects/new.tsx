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
import { ArrowRight, Sparkles, Target, Zap, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { mutateAsync: createProject, isPending } = useCreateProject();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetTarget, setBudgetTarget] = useState<number>(1000);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  // Add tech stack item
  const addTech = () => {
    if (!techInput.trim()) return;
    setTechStack((prev) => [...new Set([...prev, techInput.trim()])]);
    setTechInput("");
  };

  const removeTech = (tech: string) => {
    setTechStack((prev) => prev.filter((t) => t !== tech));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const project = await createProject({
        name,
        description,
        budget_target: budgetTarget,
        tech_stack: techStack,
      });

      // 👉 Next step: services suggestion page (LLM will run there)
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
            Describe your project and we’ll suggest the best tech services and
            cost structure.
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
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. E-commerce Platform, Booking System, SaaS Dashboard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-background/50 text-lg py-6"
                />
              </div>

              {/* Description (LLM input) */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Project Description (Important)
                </Label>

                <Textarea
                  id="description"
                  placeholder={`Describe your project clearly:

• What are you building?
• Who are the users?
• Key features (auth, payments, dashboard, real-time, etc.)
• Expected scale (100 users or 1M users?)
• Any integrations (Stripe, Firebase, APIs...)

Example:
"A SaaS platform for freelancers to manage clients, invoices, and payments. Includes authentication, dashboard, file uploads, and Stripe integration."`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-background/50 min-h-[160px] resize-none"
                />

                <p className="text-xs text-muted-foreground">
                  This will be used by AI to suggest services like hosting,
                  database, authentication, and APIs.
                </p>
              </div>

              {/* Budget + Tech */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Budget */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    Monthly Budget ($)
                  </Label>

                  <Input
                    type="number"
                    min="1"
                    value={budgetTarget}
                    onChange={(e) => setBudgetTarget(Number(e.target.value))}
                    required
                    className="bg-background/50 font-mono text-lg"
                  />
                </div>

                {/* Tech Stack */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    Tech Stack (Optional)
                  </Label>

                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. React"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      className="bg-background/50"
                    />
                    <Button type="button" onClick={addTech}>
                      Add
                    </Button>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {techStack.map((tech) => (
                      <span
                        key={tech}
                        onClick={() => removeTech(tech)}
                        className="px-3 py-1 text-sm bg-primary/10 rounded-full cursor-pointer hover:bg-primary/20"
                      >
                        {tech} ✕
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full mt-4 py-6 text-lg group"
                size="lg"
                disabled={isPending}
              >
                {isPending ? "Analyzing..." : "Continue to Service Suggestions"}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
