import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useServices } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, ActivitySquare, Database } from "lucide-react";
import type { ServiceCategory } from "@/lib/api";
import { useLocation } from "wouter";

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
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);
  const [, navigate] = useLocation();

  const { data, isLoading } = useServices({
    search: searchQuery,
    category: activeCategory ?? "",
  });
  const services = data?.results ?? [];

  const { data: allData } = useServices();
  const categories = useMemo(() => {
    const cats = new Set<ServiceCategory>();
    (allData?.results ?? []).forEach((s) => cats.add(s.category));
    return Array.from(cats);
  }, [allData]);

  return (
    <AppLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .reg-root { font-family: 'DM Sans', sans-serif; }

        .reg-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .reg-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .search-bar {
          background: #ffffff;
          border: 1px solid #e8edf5;
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
          box-shadow: 0 2px 12px rgba(37,99,235,0.05);
        }

        .search-input-wrap {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 380px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 9px 12px 9px 38px;
          border: 1px solid #e8edf5;
          border-radius: 9px;
          background: #f8fafc;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .search-input:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
          background: #fff;
        }

        .search-input::placeholder { color: #94a3b8; }

        .cat-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .cat-chip {
          padding: 5px 14px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .cat-chip:hover {
          border-color: #93c5fd;
          color: #2563eb;
          background: #eff6ff;
        }

        .cat-chip.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .service-card {
          background: #ffffff;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          overflow: hidden;
        }

        .service-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 8px 28px rgba(37,99,235,0.10);
          transform: translateY(-2px);
        }

        .service-card-header {
          padding: 20px 20px 14px;
        }

        .service-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .service-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e8edf5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
        }

        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          border: 1px solid #bfdbfe;
          letter-spacing: 0.02em;
        }

        .service-name {
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .service-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
          min-height: 40px;
        }

        .service-card-footer {
          margin-top: auto;
          padding: 12px 20px 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cat-tag {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 100px;
          border: 1.5px solid;
        }

        .pricing-info {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #64748b;
        }

        .pricing-count {
          font-weight: 700;
          color: #0f172a;
        }

        .ext-link {
          color: #94a3b8;
          transition: color 0.15s;
          display: flex;
          align-items: center;
        }

        .ext-link:hover { color: #2563eb; }

        .empty-state {
          grid-column: 1 / -1;
          background: #fff;
          border: 1.5px dashed #e2e8f0;
          border-radius: 16px;
          padding: 64px 24px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        .empty-icon {
          width: 52px;
          height: 52px;
          background: #eff6ff;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          color: #2563eb;
        }

        .loading-state {
          background: #fff;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          padding: 64px 24px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }
      `}</style>

      <div className="reg-root p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="reg-title">Service Registry</h1>
          <p className="reg-subtitle">
            Community-maintained database of AI agent infrastructure and their pricing models.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-registry-search"
            />
          </div>

          <div className="cat-chips">
            <button
              className={`cat-chip${activeCategory === null ? " active" : ""}`}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`cat-chip${activeCategory === cat ? " active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="loading-state">Loading registry…</div>
        ) : (
          <div className="service-grid">
            {services.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Database size={22} />
                </div>
                No services match your search.
              </div>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="service-card cursor-pointer"
                  data-testid={`card-service-${service.id}`}
                  onClick={() => navigate(`/registry/${service.id}`)}

                >
                  <div className="service-card-header">
                    <div className="service-card-top">
                      <div className="service-icon" style={{ color: service.icon_color }}>
                        {service.name.charAt(0)}
                      </div>
                      {service.is_official && (
                        <span className="verified-badge">✓ Verified</span>
                      )}
                    </div>
                    <p className="service-name">{service.name}</p>
                    <p className="service-desc">{service.description}</p>
                  </div>

                  <div className="service-card-footer">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        className="cat-tag"
                        style={{
                          color: service.icon_color,
                          borderColor: `${service.icon_color}50`,
                          background: `${service.icon_color}10`,
                        }}
                      >
                        {CATEGORY_LABELS[service.category] ?? service.category}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div className="pricing-info">
                        <ActivitySquare size={14} />
                        <span className="pricing-count">{service.variant_count}</span>
                        pricing models
                      </div>
                      {service.official_url && (
                        <a
                          href={service.official_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ext-link"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}