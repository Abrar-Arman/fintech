import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, BarChart2, TrendingUp, Layers, Zap, Users, DollarSign } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
  PieChart, Pie,
} from "recharts";

// ── types ─────────────────────────────────────────────────────────────────────
interface PricingField {
  name: string;
  type: string;
  required: boolean;
  help?: string;
  options?: string[];
}

interface PricingModel {
  type: string;
  label: string;
  description: string;
  when_to_use: string;
  fields: PricingField[];
  example: Record<string, unknown>;
}

async function fetchPricingModels(): Promise<PricingModel[]> {
  const res = await fetch("/api/pricing-models/", {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const data = await res.json();
  if (data?.models) return data.models;
  throw new Error("Invalid response shape");
}

function usePricingModels() {
  return useQuery<PricingModel[]>({
    queryKey: ["pricing-models"],
    queryFn: fetchPricingModels,
  });
}

// ── constants ─────────────────────────────────────────────────────────────────
const MODEL_META: Record<string, {
  color: string;
  light: string;
  icon: React.ElementType;
  complexity: number;
  scalability: number;
  predictability: number;
  flexibility: number;
  setup: number;
  costCurve: { units: number; cost: number }[];
}> = {
  per_token: {
    color: "#3b82f6", light: "#eff6ff", icon: Zap,
    complexity: 3, scalability: 9, predictability: 5, flexibility: 8, setup: 4,
    costCurve: [
      { units: 0, cost: 0 }, { units: 10, cost: 12 }, { units: 20, cost: 24 },
      { units: 30, cost: 36 }, { units: 40, cost: 48 }, { units: 50, cost: 60 },
    ],
  },
  per_seat: {
    color: "#22c55e", light: "#f0fdf4", icon: Users,
    complexity: 2, scalability: 6, predictability: 9, flexibility: 4, setup: 7,
    costCurve: [
      { units: 0, cost: 0 }, { units: 10, cost: 50 }, { units: 20, cost: 100 },
      { units: 30, cost: 150 }, { units: 40, cost: 200 }, { units: 50, cost: 250 },
    ],
  },
  per_request: {
    color: "#a855f7", light: "#fdf4ff", icon: BarChart2,
    complexity: 2, scalability: 8, predictability: 6, flexibility: 7, setup: 5,
    costCurve: [
      { units: 0, cost: 0 }, { units: 10, cost: 8 }, { units: 20, cost: 16 },
      { units: 30, cost: 24 }, { units: 40, cost: 32 }, { units: 50, cost: 40 },
    ],
  },
  flat_rate: {
    color: "#f59e0b", light: "#fffbeb", icon: DollarSign,
    complexity: 1, scalability: 5, predictability: 10, flexibility: 2, setup: 9,
    costCurve: [
      { units: 0, cost: 99 }, { units: 10, cost: 99 }, { units: 20, cost: 99 },
      { units: 30, cost: 99 }, { units: 40, cost: 99 }, { units: 50, cost: 99 },
    ],
  },
  usage_based: {
    color: "#f43f5e", light: "#fff1f2", icon: TrendingUp,
    complexity: 4, scalability: 10, predictability: 3, flexibility: 10, setup: 3,
    costCurve: [
      { units: 0, cost: 0 }, { units: 10, cost: 5 }, { units: 20, cost: 18 },
      { units: 30, cost: 35 }, { units: 40, cost: 60 }, { units: 50, cost: 95 },
    ],
  },
  tiered: {
    color: "#0ea5e9", light: "#f0f9ff", icon: Layers,
    complexity: 3, scalability: 8, predictability: 7, flexibility: 8, setup: 6,
    costCurve: [
      { units: 0, cost: 0 }, { units: 10, cost: 20 }, { units: 20, cost: 35 },
      { units: 30, cost: 60 }, { units: 40, cost: 75 }, { units: 50, cost: 90 },
    ],
  },
};

const FALLBACK_META = {
  color: "#94a3b8", light: "#f8fafc", icon: BarChart2,
  complexity: 5, scalability: 5, predictability: 5, flexibility: 5, setup: 5,
  costCurve: [] as { units: number; cost: number }[],
};

function getMeta(type: string) {
  return MODEL_META[type] ?? FALLBACK_META;
}

// ── custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "8px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }}>
      <p style={{ color: "#64748b", margin: "0 0 4px" }}>{label} units</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, margin: 0, fontWeight: 600 }}>
          {p.name}: ${p.value}
        </p>
      ))}
    </div>
  );
}

// ── radar attributes chart ─────────────────────────────────────────────────────
function ModelRadarCard({ model }: { model: PricingModel }) {
  const meta = getMeta(model.type);
  const Icon = meta.icon;
  const radarData = [
    { attr: "Scalability",     value: meta.scalability },
    { attr: "Predictability",  value: meta.predictability },
    { attr: "Flexibility",     value: meta.flexibility },
    { attr: "Easy Setup",      value: meta.setup },
    { attr: "Simplicity",      value: 10 - meta.complexity },
  ];

  return (
    <div className="pv-card" style={{ borderTop: `3px solid ${meta.color}` }}>
      {/* header */}
      <div className="pv-card-header">
        <div className="pv-icon-wrap" style={{ background: meta.light, border: `1.5px solid ${meta.color}30` }}>
          <Icon size={16} style={{ color: meta.color }} />
        </div>
        <div>
          <div className="pv-card-title">{model.label}</div>
          <div className="pv-card-sub">{model.type}</div>
        </div>
      </div>

      {/* radar */}
      <ResponsiveContainer width="100%" height={210}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#e8edf5" />
          <PolarAngleAxis
            dataKey="attr"
            tick={{ fontSize: 10, fill: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
          />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name={model.label}
            dataKey="value"
            stroke={meta.color}
            fill={meta.color}
            fillOpacity={0.18}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* score pills */}
      <div className="pv-pills">
        {radarData.map((d) => (
          <div key={d.attr} className="pv-pill">
            <span className="pv-pill-label">{d.attr}</span>
            <div className="pv-pill-bar-wrap">
              <div
                className="pv-pill-bar"
                style={{ width: `${d.value * 10}%`, background: meta.color }}
              />
            </div>
            <span className="pv-pill-val" style={{ color: meta.color }}>{d.value}/10</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── cost curve card ────────────────────────────────────────────────────────────
function CostCurveCard({ model }: { model: PricingModel }) {
  const meta = getMeta(model.type);
  return (
    <div className="pv-card">
      <div className="pv-section-label">Cost vs. Usage</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={meta.costCurve} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="units"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            label={{ value: "units", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cost"
            name={model.label}
            stroke={meta.color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: meta.color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="pv-curve-note">{model.when_to_use}</p>
    </div>
  );
}

// ── field composition donut ────────────────────────────────────────────────────
function FieldDonutCard({ model }: { model: PricingModel }) {
  const meta = getMeta(model.type);
  const required = model.fields.filter((f) => f.required).length;
  const optional = model.fields.length - required;
  const pieData = [
    { name: "Required", value: required },
    { name: "Optional", value: optional },
  ];
  const COLORS = [meta.color, `${meta.color}40`];

  return (
    <div className="pv-card">
      <div className="pv-section-label">Field Composition</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <PieChart width={110} height={110}>
          <Pie
            data={pieData}
            cx={50}
            cy={50}
            innerRadius={32}
            outerRadius={50}
            dataKey="value"
            strokeWidth={0}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
        </PieChart>
        <div style={{ flex: 1 }}>
          <div className="pv-donut-legend">
            {pieData.map((d, i) => (
              <div key={d.name} className="pv-legend-row">
                <div className="pv-legend-dot" style={{ background: COLORS[i] }} />
                <span className="pv-legend-name">{d.name}</span>
                <span className="pv-legend-val" style={{ color: COLORS[i] }}>{d.value}</span>
              </div>
            ))}
            <div className="pv-legend-row" style={{ marginTop: 8, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
              <span className="pv-legend-name" style={{ color: "#94a3b8" }}>Total fields</span>
              <span className="pv-legend-val" style={{ color: "#0f172a" }}>{model.fields.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── comparison bar chart (all models) ─────────────────────────────────────────
function ComparisonChart({ models }: { models: PricingModel[] }) {
  const attrs = ["scalability", "predictability", "flexibility", "setup"] as const;
  const data = models.map((m) => {
    const meta = getMeta(m.type);
    return {
      name: m.label,
      scalability: meta.scalability,
      predictability: meta.predictability,
      flexibility: meta.flexibility,
      setup: meta.setup,
    };
  });

  const attrColors: Record<string, string> = {
    scalability: "#3b82f6",
    predictability: "#22c55e",
    flexibility: "#a855f7",
    setup: "#f59e0b",
  };

  return (
    <div className="pv-compare-card">
      <div className="pv-compare-header">
        <BarChart2 size={16} style={{ color: "#64748b" }} />
        <span>Model Comparison — All Attributes</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
            cursor={{ fill: "#f8fafc" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", paddingTop: 8 }}
          />
          {attrs.map((attr) => (
            <Bar key={attr} dataKey={attr} name={attr.charAt(0).toUpperCase() + attr.slice(1)}
              fill={attrColors[attr]} radius={[4, 4, 0, 0]} maxBarSize={22} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── cost overlay chart (all models) ───────────────────────────────────────────
function CostOverlayChart({ models }: { models: PricingModel[] }) {
  // Merge all cost curves on same units axis
  const allUnits = [0, 10, 20, 30, 40, 50];
  const data = allUnits.map((u, i) => {
    const row: Record<string, number> = { units: u };
    models.forEach((m) => {
      const meta = getMeta(m.type);
      row[m.label] = meta.costCurve[i]?.cost ?? 0;
    });
    return row;
  });

  return (
    <div className="pv-compare-card">
      <div className="pv-compare-header">
        <TrendingUp size={16} style={{ color: "#64748b" }} />
        <span>Cost Curves — All Models at a Glance</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="units"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            label={{ value: "units of usage", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {models.map((m) => {
            const meta = getMeta(m.type);
            return (
              <Line
                key={m.type}
                type="monotone"
                dataKey={m.label}
                stroke={meta.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function PricingModelsVisual() {
  const [, navigate] = useLocation();
  const { data: models, isLoading, isError } = usePricingModels();

  return (
    <AppLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .pv-root {
          font-family: 'DM Sans', sans-serif;
          background: #f8fafc;
          min-height: 100%;
        }

        .pv-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #64748b;
          cursor: pointer; border: none; background: none; padding: 0;
          transition: color 0.15s;
        }
        .pv-back:hover { color: #2563eb; }

        .pv-page-title {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: #0f172a; margin: 0 0 4px;
        }
        .pv-page-sub { font-size: 13px; color: #64748b; margin: 0; }

        /* tab bar */
        .pv-tabs {
          display: flex; gap: 6px; background: #fff;
          border: 1px solid #e8edf5; border-radius: 12px;
          padding: 5px; width: fit-content;
        }
        .pv-tab {
          padding: 7px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: none; background: none; color: #64748b;
          transition: all 0.15s;
        }
        .pv-tab:hover { color: #2563eb; }
        .pv-tab.active { background: #2563eb; color: #fff; }

        /* model grid (per card) */
        .pv-model-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        /* card base */
        .pv-card {
          background: #fff;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          padding: 18px 18px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .pv-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.07);
          transform: translateY(-2px);
        }

        .pv-card-header {
          display: flex; align-items: center; gap: 12px;
        }

        .pv-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .pv-card-title {
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #0f172a;
        }

        .pv-card-sub {
          font-family: 'DM Mono', monospace; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;
        }

        .pv-section-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: #94a3b8;
        }

        /* bar pills */
        .pv-pills { display: flex; flex-direction: column; gap: 6px; }
        .pv-pill { display: flex; align-items: center; gap: 8px; }
        .pv-pill-label { font-size: 11px; color: #64748b; width: 90px; flex-shrink: 0; }
        .pv-pill-bar-wrap { flex: 1; background: #f1f5f9; border-radius: 100px; height: 5px; overflow: hidden; }
        .pv-pill-bar { height: 100%; border-radius: 100px; transition: width 0.4s; }
        .pv-pill-val { font-size: 10px; font-weight: 700; font-family: 'DM Mono', monospace; width: 32px; text-align: right; flex-shrink: 0; }

        /* cost note */
        .pv-curve-note {
          font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;
          padding: 8px 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e8edf5;
        }

        /* donut legend */
        .pv-donut-legend { display: flex; flex-direction: column; gap: 8px; }
        .pv-legend-row { display: flex; align-items: center; gap: 8px; }
        .pv-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pv-legend-name { font-size: 12px; color: #64748b; flex: 1; }
        .pv-legend-val { font-size: 13px; font-weight: 700; font-family: 'DM Mono', monospace; }

        /* compare card */
        .pv-compare-card {
          background: #fff; border: 1px solid #e8edf5; border-radius: 16px;
          padding: 20px 20px 16px;
        }
        .pv-compare-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 700; color: #0f172a;
          font-family: 'Syne', sans-serif; margin-bottom: 16px;
        }

        /* state */
        .pv-state {
          background: #fff; border: 1px solid #e8edf5; border-radius: 16px;
          padding: 64px 24px; text-align: center; color: #94a3b8; font-size: 14px;
        }
      `}</style>

      <div className="pv-root p-6 max-w-7xl mx-auto space-y-6">
        {/* Back */}
        <button className="pv-back" onClick={() => navigate("/registry")}>
          <ArrowLeft size={14} /> Back to Registry
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="pv-page-title">Pricing Models — Visual View</h1>
            <p className="pv-page-sub">Charts and comparisons to understand each billing strategy at a glance.</p>
          </div>
          <button className="pv-back" onClick={() => navigate("/pricing-models")} style={{ fontSize: 13 }}>
            Switch to Detail View →
          </button>
        </div>

        {isLoading && <div className="pv-state">Loading pricing models…</div>}
        {isError && <div className="pv-state" style={{ color: "#ef4444" }}>Failed to load. Please try again.</div>}

        {models && (
          <>
            {/* ── Section 1: All-model comparisons ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ComparisonChart models={models} />
              <CostOverlayChart models={models} />
            </div>

            {/* ── Section 2: Per-model radar + cost + fields ── */}
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 14 }}>
                Per-Model Breakdown
              </p>
              <div className="pv-model-grid">
                {models.map((model) => (
                  <div key={model.type} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <ModelRadarCard model={model} />
                    <CostCurveCard model={model} />
                    <FieldDonutCard model={model} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}