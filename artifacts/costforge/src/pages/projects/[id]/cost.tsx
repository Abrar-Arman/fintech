import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { ProjectLayout } from "@/components/layout/ProjectLayout";
import { calculateCost, CostCalculationResult } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Download, Share2, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { motion } from "framer-motion";
// Simplified Lottie approach without direct component if lottie-react is tricky with URLs
// Instead we'll use framer-motion for the big reveal.

export default function ProjectCost() {
  const [match, params] = useRoute("/projects/:id/cost");
  const projectId = params?.id || "";
  const { state } = useAppStore();
  
  const project = state.projects.find(p => p.id === projectId);
  const [showReveal, setShowReveal] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowReveal(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!project) return null;

  const costResult = calculateCost(project, state.variants);
  const totalCost = costResult.totalCost;
  
  const budgetPercentage = (totalCost / project.budgetTarget) * 100;
  const isOverBudget = totalCost > project.budgetTarget;
  const statusColor = isOverBudget ? "text-destructive" : budgetPercentage > 80 ? "text-amber-500" : "text-green-500";
  
  // Prepare chart data
  const chartData = costResult.serviceCosts.map(sc => {
    const service = state.services.find(s => s.id === sc.serviceId);
    return {
      name: service?.name || "Unknown",
      cost: sc.cost,
      fill: service?.iconColor || "#ccc",
      category: service?.category
    };
  }).sort((a, b) => b.cost - a.cost);

  // Scenarios
  const scenarioConservative = totalCost * 0.5; // 50% usage
  const scenarioAggressive = totalCost * 2.5; // 250% usage

  if (!showReveal) {
    return (
      <ProjectLayout projectId={projectId}>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"
          />
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold font-mono text-primary"
          >
            Running Monte Carlo Simulation...
          </motion.h2>
          <p className="text-muted-foreground text-sm">Applying pricing variants across operational axes</p>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout projectId={projectId}>
      <div className="space-y-8 pb-20 max-w-5xl mx-auto">
        
        {/* BIG HERO REVEAL */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="bg-card border border-border shadow-2xl rounded-2xl overflow-hidden relative"
        >
          <div className={`absolute top-0 left-0 w-full h-2 ${isOverBudget ? 'bg-destructive' : 'bg-primary'}`} />
          
          <div className="p-8 md:p-12 text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Estimated Monthly Burn</h2>
            <div className="flex justify-center items-end gap-2 mb-2">
              <span className={`text-6xl md:text-8xl font-black tabular-nums tracking-tighter ${statusColor}`}>
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xl md:text-2xl text-muted-foreground font-medium mb-2">/mo</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              {isOverBudget ? (
                <Badge variant="destructive" className="px-3 py-1 text-sm"><AlertTriangle className="w-4 h-4 mr-2"/> Over Budget</Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1 text-sm bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-4 h-4 mr-2"/> Within Target</Badge>
              )}
              <span className="text-sm font-medium text-muted-foreground">
                Target: ${project.budgetTarget.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="bg-muted/30 border-t border-border p-6 md:px-12 flex flex-col gap-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Budget Headroom</span>
              <span className={statusColor}>
                {isOverBudget ? 'Deficit: ' : 'Remaining: '}
                ${Math.abs(project.budgetTarget - totalCost).toLocaleString()}
              </span>
            </div>
            <Progress 
              value={Math.min(100, budgetPercentage)} 
              className="h-3"
              indicatorClassName={isOverBudget ? 'bg-destructive' : budgetPercentage > 80 ? 'bg-amber-500' : 'bg-primary'}
            />
          </div>
        </motion.div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-border shadow-md">
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Where your budget is going</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'var(--color-muted)'}}
                      contentStyle={{backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px'}}
                      formatter={(value: number) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Cost']}
                    />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Risk Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Conservative</span>
                    <span className="text-sm font-mono">${scenarioConservative.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">50% projected usage</p>
                </div>
                
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-primary uppercase">Expected</span>
                    <span className="text-sm font-mono font-bold">${totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Based on inputs</p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-destructive uppercase flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Aggressive</span>
                    <span className="text-sm font-mono text-destructive">${scenarioAggressive.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">250% projected usage</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full bg-card">
                <Share2 className="w-4 h-4 mr-2" /> Share Report
              </Button>
              <Button className="w-full">
                <Download className="w-4 h-4 mr-2" /> Export to CSV
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
