import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  Activity,
  DollarSign,
  Tag,
  Info,
  Package,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
interface UsageInputs {
  [key: string]: number | string;
}

interface PricingVariant {
  id: number;
  service: number;
  label: string;
  model_type: string;
  usage_inputs: UsageInputs;
  is_official: boolean;
  notes: string;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
}

interface ServiceDetail {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  official_url: string;
  is_official: boolean;
  icon_color: string;
  status: string;
  submitted_by: number | null;
  created_at: string;
  variant_count: number;
  project_count: number;
  variants: PricingVariant[];
}

const CATEGORY_LABELS: Record<string, string> = {
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

// ── fetcher — plain fetch, no queryClient dependency ─────────────────────────
async function fetchServiceDetail(id: string): Promise<ServiceDetail> {
  const res = await fetch(`/api/services/${id}/`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch service: ${res.status}`);
  }
  return res.json();
}

function useServiceDetail(id: string) {
  return useQuery<ServiceDetail>({
    queryKey: ["service", id],
    queryFn: () => fetchServiceDetail(id),
    enabled: !!id,
  });
}

// ── component ─────────────────────────────────────────────────────────────────
export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: service, isLoading, isError } = useServiceDetail(id);

  return (
    <AppLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .sd-root { font-family: 'DM Sans', sans-serif; background: #f8fafc; min-height: 100%; }

        .sd-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #64748b;
          cursor: pointer; border: none; background: none; padding: 0;
          transition: color 0.15s;
        }
        .sd-back:hover { color: #2563eb; }

        .sd-hero {
          background: #fff; border: 1px solid #e8edf5; border-radius: 18px;
          padding: 28px 32px; display: flex; align-items: flex-start; gap: 20px;
          box-shadow: 0 2px 16px rgba(37,99,235,0.05);
        }

        .sd-hero-icon {
          width: 60px; height: 60px; border-radius: 16px; border: 1px solid #e8edf5;
          background: #f8fafc; display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; flex-shrink: 0;
        }

        .sd-hero-body { flex: 1; min-width: 0; }

        .sd-hero-title {
          font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800;
          color: #0f172a; margin: 0 0 6px;
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }

        .sd-hero-desc { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 16px; }
        .sd-hero-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

        .sd-badge-verified {
          display: inline-flex; align-items: center; gap: 4px; background: #eff6ff;
          color: #2563eb; font-size: 11px; font-weight: 700; padding: 4px 10px;
          border-radius: 100px; border: 1px solid #bfdbfe;
        }

        .sd-badge-cat {
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 4px 12px; border-radius: 100px; border: 1.5px solid;
        }

        .sd-stat-pill {
          display: inline-flex; align-items: center; gap: 5px; background: #f8fafc;
          border: 1px solid #e8edf5; border-radius: 100px; padding: 4px 12px;
          font-size: 12px; color: #64748b; font-weight: 500;
        }

        .sd-ext-btn {
          display: inline-flex; align-items: center; gap: 6px; background: #2563eb;
          color: #fff; font-size: 13px; font-weight: 600; padding: 8px 16px;
          border-radius: 9px; border: none; cursor: pointer; text-decoration: none;
          transition: background 0.15s; margin-left: auto;
        }
        .sd-ext-btn:hover { background: #1d4ed8; }

        .sd-section-title {
          font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700;
          color: #0f172a; display: flex; align-items: center; gap: 8px; margin: 0 0 16px;
        }

        .variant-card {
          background: #fff; border: 1px solid #e8edf5; border-radius: 14px;
          overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s;
        }
        .variant-card:hover { border-color: #93c5fd; box-shadow: 0 6px 24px rgba(37,99,235,0.09); }

        .variant-header {
          padding: 16px 20px; display: flex; align-items: center;
          justify-content: space-between; border-bottom: 1px solid #f1f5f9; gap: 12px;
        }

        .variant-label { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a; }

        .variant-type-badge {
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
          padding: 3px 10px; border-radius: 100px; background: #f0f9ff;
          color: #0284c7; border: 1px solid #bae6fd;
        }

        .variant-official-badge {
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px;
          background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
          display: inline-flex; align-items: center; gap: 4px;
        }

        .variant-body { padding: 16px 20px; }

        .usage-table { width: 100%; border-collapse: collapse; }
        .usage-table th {
          text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #94a3b8; padding: 0 0 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .usage-table td {
          padding: 9px 0; font-size: 13px; color: #0f172a;
          border-bottom: 1px solid #f8fafc; vertical-align: middle;
        }
        .usage-table tr:last-child td { border-bottom: none; }

        .usage-key {
          font-family: 'DM Mono', monospace; font-size: 12px; color: #475569;
          background: #f8fafc; border: 1px solid #e8edf5; border-radius: 6px;
          padding: 2px 8px; display: inline-block;
        }

        .usage-value {
          font-family: 'DM Mono', monospace; font-size: 13px;
          font-weight: 600; color: #2563eb; text-align: right;
        }

        .variant-footer {
          padding: 10px 20px; background: #fafbfd; border-top: 1px solid #f1f5f9;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 6px;
        }

        .variant-meta-text { font-size: 11px; color: #94a3b8; }

        .variant-notes {
          margin-top: 12px; padding: 10px 14px; background: #fffbeb;
          border: 1px solid #fde68a; border-radius: 8px; font-size: 12px;
          color: #92400e; display: flex; align-items: flex-start; gap: 6px;
        }

        .sd-state {
          background: #fff; border: 1px solid #e8edf5; border-radius: 16px;
          padding: 64px 24px; text-align: center; color: #94a3b8; font-size: 14px;
        }
      `}</style>

      <div className="sd-root p-6 max-w-5xl mx-auto space-y-6">

        <button className="sd-back" onClick={() => navigate("/registry")}>
          <ArrowLeft size={14} /> Back to Registry
        </button>

        {isLoading && <div className="sd-state">Loading service details…</div>}
        {isError && (
          <div className="sd-state" style={{ color: "#ef4444" }}>
            Failed to load service. Please try again.
          </div>
        )}

        {service && (
          <>
            {/* Hero */}
            <div className="sd-hero">
              <div className="sd-hero-icon" style={{ color: service.icon_color }}>
                {service.name.charAt(0)}
              </div>
              <div className="sd-hero-body">
                <h1 className="sd-hero-title">
                  {service.name}
                  {service.is_official && (
                    <span className="sd-badge-verified">
                      <CheckCircle size={11} /> Verified
                    </span>
                  )}
                </h1>
                <p className="sd-hero-desc">{service.description}</p>
                <div className="sd-hero-meta">
                  <span
                    className="sd-badge-cat"
                    style={{
                      color: service.icon_color,
                      borderColor: `${service.icon_color}50`,
                      background: `${service.icon_color}10`,
                    }}
                  >
                    {CATEGORY_LABELS[service.category] ?? service.category}
                  </span>
                  <span className="sd-stat-pill">
                    <Activity size={12} /> {service.variant_count} pricing models
                  </span>
                  <span className="sd-stat-pill">
                    <Package size={12} /> {service.project_count} projects using this
                  </span>
                  {service.official_url && (
                    <a href={service.official_url} target="_blank" rel="noreferrer" className="sd-ext-btn">
                      <ExternalLink size={13} /> Official Pricing Page
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Variants */}
            <div>
              <p className="sd-section-title">
                <DollarSign size={18} color="#2563eb" /> Pricing Variants
              </p>

              {service.variants.length === 0 ? (
                <div className="sd-state">No pricing variants available yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {service.variants.map((variant) => (
                    <div key={variant.id} className="variant-card">

                      <div className="variant-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span className="variant-label">{variant.label}</span>
                          <span className="variant-type-badge">{variant.model_type.replace(/_/g, " ")}</span>
                          {variant.is_official && (
                            <span className="variant-official-badge">
                              <CheckCircle size={10} /> Official
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>#{variant.id}</span>
                      </div>

                      <div className="variant-body">
                        {Object.keys(variant.usage_inputs).length > 0 ? (
                          <>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                              <Tag size={12} /> Usage Inputs
                            </p>
                            <table className="usage-table">
                              <thead>
                                <tr>
                                  <th>Parameter</th>
                                  <th style={{ textAlign: "right" }}>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(variant.usage_inputs).map(([key, val]) => (
                                  <tr key={key}>
                                    <td>
                                      <span className="usage-key">{key.replace(/_/g, " ")}</span>
                                    </td>
                                    <td className="usage-value">
                                      {typeof val === "number" ? val.toLocaleString() : String(val)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        ) : (
                          <p style={{ fontSize: 13, color: "#94a3b8" }}>No usage inputs defined.</p>
                        )}

                        {variant.notes && (
                          <div className="variant-notes">
                            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                            {variant.notes}
                          </div>
                        )}
                      </div>

                      <div className="variant-footer">
                        <span className="variant-meta-text">
                          By <strong style={{ color: "#475569" }}>{variant.created_by_username || "community"}</strong>
                        </span>
                        <span className="variant-meta-text">
                          {new Date(variant.created_at).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}