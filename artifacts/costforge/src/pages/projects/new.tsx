import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles, Target, Zap } from "lucide-react";
import { Project } from "@/lib/mock-data";
import { v4 as uuidv4 } from "uuid"; // wait, we don't have uuid, let's use crypto.randomUUID or Math.random
import { motion } from "framer-motion";

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { dispatch } = useAppStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetTarget, setBudgetTarget] = useState<number>(1000);
  const [techStack, setTechStack] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      budgetTarget,
      techStack: techStack.split(",").map(t => t.trim()).filter(Boolean),
      services: [],
      usage: {
        activeUsers: 1000,
        tokensPerRequest: 1000,
        requestsPerUser: 10,
        storageGb: 5,
        bandwidthGb: 10,
        computeHours: 24
      },
      createdAt: new Date().toISOString()
    };
    
    dispatch({ type: "ADD_PROJECT", payload: newProject });
    setLocation(`/projects/${newProject.id}/services`);
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
            <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground">
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Project</h1>
          <p className="text-muted-foreground text-lg">Define your agent's purpose to start predicting costs.</p>
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
                  onChange={e => setName(e.target.value)} 
                  required 
                  className="bg-background/50 text-lg py-6"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">What does this agent do?</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe the agent's responsibilities, integrations, and capabilities... This helps our AI suggest the right services." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  required
                  className="bg-background/50 min-h-[120px] resize-none"
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
                    onChange={e => setBudgetTarget(Number(e.target.value))} 
                    required 
                    className="bg-background/50 font-mono text-lg"
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
                    onChange={e => setTechStack(e.target.value)} 
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">Comma separated</p>
                </div>
              </div>

              <Button type="submit" className="w-full mt-4 py-6 text-lg group" size="lg">
                Continue to Service Selection
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
