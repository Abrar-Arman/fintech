import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { calculateCost } from "@/lib/calculator";
import { useDashboardStats, useProjects } from "@/lib/queries";
import {
  Plus,
  Database,
  Activity,
  Target,
  Clock,
  ArrowRight,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: projectsPage, isLoading: projectsLoading } = useProjects();
  const { stats } = useDashboardStats();
  const projects = projectsPage?.results ?? [];

  return (
    <AppLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .dash-root {
          font-family: 'DM Sans', sans-serif;
          --blue-50: #eff6ff;
          --blue-100: #dbeafe;
          --blue-200: #bfdbfe;
          --blue-400: #60a5fa;
          --blue-500: #3b82f6;
          --blue-600: #2563eb;
          --blue-700: #1d4ed8;
          --blue-900: #1e3a8a;
          --ink: #0f172a;
          --ink-soft: #475569;
          --ink-muted: #94a3b8;
          --surface: #ffffff;
          --surface-2: #f8fafc;
          --border: #e2e8f0;
        }

        .hero-banner {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #3b82f6 70%, #60a5fa 100%);
          border-radius: 20px;
          padding: 56px 60px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(37, 99, 235, 0.35);
        }

        .hero-banner::before {
          content: '';
          position: absolute;
          top: -80px;
          right: -80px;
          width: 320px;
          height: 320px;
          background: rgba(255,255,255,0.08);
          border-radius: 50%;
        }

        .hero-banner::after {
          content: '';
          position: absolute;
          bottom: -60px;
          right: 120px;
          width: 200px;
          height: 200px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: 42px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.15;
          margin: 0 0 12px;
          max-width: 560px;
        }

        .hero-sub {
          font-size: 16px;
          color: rgba(255,255,255,0.8);
          line-height: 1.6;
          margin: 0 0 32px;
          max-width: 480px;
        }

        .btn-primary-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          color: #1d4ed8;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 24px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          transition: transform 0.15s, box-shadow 0.15s;
          text-decoration: none;
        }

        .btn-primary-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }

        .btn-outline-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.12);
          color: #ffffff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          padding: 13px 24px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.3);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.15s, transform 0.15s;
          text-decoration: none;
        }

        .btn-outline-hero:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        /* ── stats grid ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 22px 24px;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
        }

        .stat-card:hover {
          box-shadow: 0 8px 24px rgba(37,99,235,0.10);
          transform: translateY(-2px);
        }

        .stat-card-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }

        .stat-card-value {
          font-family: 'Syne', sans-serif;
          font-size: 34px;
          font-weight: 800;
          color: var(--ink);
          line-height: 1;
        }

        .stat-card-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 0 0 16px 16px;
          opacity: 0.5;
        }

        .stat-icon-wrap {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── two-column layout ── */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .two-col {
            grid-template-columns: 1fr;
          }
        }

        /* ── projects col ── */
        .projects-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .projects-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .project-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 22px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          text-decoration: none;
          display: block;
        }

        .project-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 6px 24px rgba(37,99,235,0.12);
          transform: translateY(-2px);
        }

        .project-card-name {
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
          transition: color 0.2s;
        }

        .project-card:hover .project-card-name {
          color: #2563eb;
        }

        .project-meta {
          font-size: 12px;
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 10px;
          font-family: 'DM Mono', monospace;
        }

        .project-cost {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--ink);
        }

        .project-cost.over {
          color: #ef4444;
        }

        .project-cost-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ── services col ── */
        .services-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .service-list-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }

        .service-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }

        .service-item:last-child {
          border-bottom: none;
        }

        .service-item:hover {
          background: #f0f7ff;
        }

        .service-rank {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          background: #eff6ff;
          color: #2563eb;
          flex-shrink: 0;
        }

        .service-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
        }

        .service-cat {
          font-size: 11px;
          color: var(--ink-muted);
          text-transform: capitalize;
        }

        .uses-badge {
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
        }

        .view-all-footer {
          padding: 14px 18px;
          background: #f8fafc;
          text-align: center;
          border-top: 1px solid var(--border);
        }

        /* ── misc ── */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--ink-muted);
          background: #f8fafc;
          border-radius: 16px;
          border: 1.5px dashed #e2e8f0;
        }

        .empty-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
          background: #eff6ff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }

        .btn-create {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2563eb;
          color: white;
          font-weight: 600;
          font-size: 13px;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-create:hover {
          background: #1d4ed8;
        }

        .section-link {
          font-size: 13px;
          font-weight: 600;
          color: #2563eb;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s;
        }

        .section-link:hover {
          color: #1d4ed8;
        }
      `}</style>

      <div className="dash-root" style={{ padding: 24, maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hero-banner"
        >
          <h1 className="hero-title">Welcome back to CostForge</h1>
          <p className="hero-sub">
            Predict the real operational cost of every project before you ship.
            Compare pricing models, run scenarios, and stay under budget.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/projects/new">
              <a className="btn-primary-hero" data-testid="button-new-project">
                <Plus size={16} /> New Project
              </a>
            </Link>
            <Link href="/registry">
              <a className="btn-outline-hero">
                <Database size={16} /> Browse Registry
              </a>
            </Link>
          </div>
        </motion.div>

        {/* STATS */}
        <div>
          <p className="section-title" style={{ marginBottom: 16 }}>
            <TrendingUp size={18} color="#2563eb" /> Statistical Overview
          </p>
          <div className="stats-grid">
            {[
              { label: "Projects", value: stats.projects, icon: Target, bg: "#eff6ff", color: "#2563eb" },
              { label: "Services", sublabel: "Registry", value: stats.services, icon: Database, bg: "#f0fdf4", color: "#16a34a" },
              { label: "Pricing Variants", sublabel: "Tracked", value: stats.variants, icon: Activity, bg: "#fefce8", color: "#ca8a04" },
              {
                label: "Community Votes",
                sublabel: "Trust",
                value: stats.topServices.reduce((s: number, x: any) => s + x.project_count, 0),
                icon: Users,
                bg: "#fdf4ff",
                color: "#9333ea",
              },
            ].map(({ label, sublabel, value, icon: Icon, bg, color }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
                className="stat-card"
              >
                <div className="stat-icon-wrap" style={{ background: bg }}>
                  <Icon size={16} color={color} />
                </div>
                <div className="stat-card-value">{value.toLocaleString()}</div>
                <div className="stat-card-label" style={{ marginTop: 6 }}>{label}</div>
                {sublabel && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sublabel}</div>
                )}
                <div className="stat-card-bar" style={{ background: `linear-gradient(90deg, ${color}88, ${color}33)` }} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* TWO-COLUMN: Projects + Services */}
        <div className="two-col">

          {/* LEFT — Projects */}
          <div className="projects-col">
            <div className="projects-col-header">
              <p className="section-title">
                <Target size={18} color="#2563eb" /> Your Projects
              </p>
              <Link href="/projects/new">
                <a className="section-link"><Plus size={14} /> New</a>
              </Link>
            </div>

            {projectsLoading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                Loading projects…
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Target size={24} /></div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>
                  No projects yet
                </p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
                  Create a project to start predicting costs.
                </p>
                <Link href="/projects/new"><a className="btn-create">Create Project</a></Link>
              </div>
            ) : (
              projects.map((project, idx) => {
                const { totalCost } = calculateCost(project);
                const target = Number(project.budget_target);
                const isOver = totalCost > target;
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <Link href={`/projects/${project.id}/services`}>
                      <a className="project-card" data-testid={`card-project-${project.id}`}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="project-card-name">{project.name}</div>
                            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {project.description || <span style={{ color: "#cbd5e1" }}>No description</span>}
                            </div>
                            <div className="project-meta">
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Database size={11} /> {project.services.length} services
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={11} /> {formatDistanceToNow(new Date(project.created_at))} ago
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 20, borderLeft: "1px solid #e2e8f0", paddingLeft: 20, flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                              <div className="project-cost-label">Est. Cost</div>
                              <div className={`project-cost${isOver ? " over" : ""}`}>
                                ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                Target: ${target.toLocaleString()}
                              </div>
                            </div>
                            <ArrowRight size={18} color="#94a3b8" />
                          </div>
                        </div>
                      </a>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* RIGHT — Most-used Services */}
          <div className="services-col">
            <p className="section-title">
              <Zap size={18} color="#f59e0b" /> Most-used Services
            </p>
            <div className="service-list-card">
              {stats.topServices.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
                  No services in the registry yet.
                </div>
              ) : (
                stats.topServices.map(({ service, project_count }: any, idx: number) => (
                  <div key={service.id} className="service-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        className="service-rank"
                        style={{ background: `${service.icon_color}18`, color: service.icon_color }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="service-name">{service.name}</div>
                        <div className="service-cat">{service.category.replace("_", " ")}</div>
                      </div>
                    </div>
                    <span className="uses-badge">
                      {project_count} {project_count === 1 ? "use" : "uses"}
                    </span>
                  </div>
                ))
              )}
              <div className="view-all-footer">
                <Link href="/registry">
                  <a className="section-link" style={{ justifyContent: "center" }}>
                    View full registry <ArrowRight size={13} />
                  </a>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
