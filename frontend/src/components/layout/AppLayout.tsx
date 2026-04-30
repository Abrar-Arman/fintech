import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Database } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex text-foreground" style={{ background: "#f8fafc" }}>
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 hidden md:flex flex-col"
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e8edf5",
          boxShadow: "4px 0 24px rgba(37, 99, 235, 0.07)",
        }}
      >
        {/* Logo */}
        <div className="px-6 py-5" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#2563eb" }}
              >
                <Database className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-lg tracking-tight"
                style={{ color: "#0f172a", fontFamily: "'Syne', sans-serif" }}
              >
                CostForge
              </span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem
            href="/"
            active={location === "/"}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
          />
          <NavItem
            href="/registry"
            active={location === "/registry"}
            icon={<Database className="w-4 h-4" />}
            label="Service Registry"
          />
           <NavItem
            href="/pricing-models"
            active={location === "/pricing-models"}
            icon={<Database className="w-4 h-4" />}
            label="PricingModels"
          />
        </nav>

        {/* User footer — pinned at bottom via flex-col */}
        <div className="px-4 pb-5 pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{
              background: "#f8fafc",
              border: "1px solid #e8edf5",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "#2563eb" }}
            >
              CF
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate" style={{ color: "#0f172a" }}>
                Demo User
              </span>
              <span className="text-xs" style={{ color: "#94a3b8" }}>
                Free Plan
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header
          className="h-14 flex items-center px-4 shrink-0 md:hidden"
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e8edf5",
            boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "#2563eb" }}
            >
              <Database className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: "#0f172a" }}>
              CostForge
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto" style={{ background: "#f8fafc" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link href={href}>
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all"
        style={{
          background: active ? "#eff6ff" : "transparent",
          color: active ? "#2563eb" : "#64748b",
          borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLDivElement).style.background = "#f8fafc";
            (e.currentTarget as HTMLDivElement).style.color = "#0f172a";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
            (e.currentTarget as HTMLDivElement).style.color = "#64748b";
          }
        }}
      >
        {icon}
        {label}
      </div>
    </Link>
  );
}
