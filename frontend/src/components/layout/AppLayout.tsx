import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Database, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar shrink-0 hidden md:block">
        <div className="p-6">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">CostForge</span>
            </div>
          </Link>
        </div>
        
        <div className="px-4 py-2">
          <nav className="space-y-1">
            <Link href="/">
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </div>
            </Link>
            <Link href="/registry">
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location === "/registry" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <Database className="w-4 h-4" />
                Service Registry
              </div>
            </Link>
          </nav>
        </div>
        
        <div className="absolute bottom-6 px-6 w-full">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent/30 border border-sidebar-border">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
              CF
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Demo User</span>
              <span className="text-xs text-muted-foreground">Free Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 md:hidden bg-background">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Database className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">CostForge</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
