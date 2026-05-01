/**
 * Typed fetch client for the CostForge Django REST Framework backend.
 *
 * In development:
 *   - Vite proxies /api/* to the Django server on :8000 (see vite.config.ts).
 *
 * In production:
 *   - Django serves the React build AND the /api routes from the same
 *     origin, so /api/* hits Django directly with no proxy required.
 *
 * Auth: JWT access tokens are stored in localStorage and attached to
 * every request via the Authorization header. If a request returns 401
 * we transparently exchange the refresh token for a new access token
 * and retry once.
 */

// localStorage keys — kept short and namespaced so they don't clash
// with anything else on the same domain.
const TOKEN_KEY = "pricepilot_jwt_access";
const REFRESH_KEY = "pricepilot_jwt_refresh";
const USER_KEY = "pricepilot_user";

// All endpoints live under /api on the Django side. We never hard-code
// localhost:8000 — the Vite proxy / Django static serve handles routing.
export const API_BASE = "/api";

// ---- Domain types ----------------------------------------------------------

export type PricingModelType =
  | "per_token"
  | "per_seat"
  | "per_request"
  | "flat_rate"
  | "usage_based"
  | "tiered";

export type ServiceCategory =
  | "llm"
  | "vector_db"
  | "hosting"
  | "storage"
  | "payments"
  | "monitoring"
  | "communication"
  | "auth"
  | "other";

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  official_url: string;
  is_official: boolean;
  icon_color: string;
  status: "approved" | "pending";
  submitted_by: number | null;
  created_at: string;
  variant_count: number;
  project_count: number;
}

export interface PricingVariant {
  id: number;
  service: number;
  label: string;
  model_type: PricingModelType;
  usage_inputs: Record<string, unknown>;
  is_official: boolean;
  notes: string;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  net_score: number;
  is_outdated: boolean;
  user_vote: -1 | 0 | 1;
}

export interface ServiceDetail extends Service {
  variants: PricingVariant[];
}

export interface ProjectService {
  id: number;
  service: Service;
  variant: PricingVariant | null;
  custom_model_type: PricingModelType | "";
  custom_inputs: Record<string, unknown>;
  created_at: string;
}

export interface UsageInputs {
  active_users?: number;
  tokens_per_request?: number;
  requests_per_user?: number;
  storage_gb?: number;
  bandwidth_gb?: number;
  compute_hours?: number;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  budget_target: string;
  tech_stack: string[];
  usage_inputs: UsageInputs;
  owner: number;
  owner_username: string;
  services: ProjectService[];
  created_at: string;
  updated_at: string;
}

export interface PricingModelField {
  name: string;
  type: string;
  required?: boolean;
  help?: string;
  options?: string[];
}

export interface PricingModelDef {
  type: PricingModelType;
  label: string;
  description: string;
  when_to_use: string;
  fields: PricingModelField[];
  example: Record<string, unknown>;
}

export interface FuzzyResult {
  query: string;
  matched: {
    service_id: number;
    name: string;
    category: ServiceCategory;
    icon_color: string;
    score: number;
  } | null;
  suggestions: Array<{
    service_id: number;
    name: string;
    category: ServiceCategory;
    icon_color: string;
    score: number;
  }>;
  match_threshold: number;
}

export interface SuggestResult {
  matched: Array<{
    service_id: number;
    name: string;
    category: ServiceCategory;
    icon_color: string;
    score: number;
    reason: string;
  }>;
  suggestions: Array<{
    query: string;
    category: ServiceCategory;
    reason: string;
    options: FuzzyResult["suggestions"];
  }>;
  unmatched: Array<{
    name: string;
    category: ServiceCategory;
    reason: string;
  }>;
  source: "anthropic" | "heuristic";
}

export interface CalculateResult {
  total_monthly_cost: number;
  budget_target: number;
  headroom_usd: number;
  budget_used_pct: number;
  breakdown: Array<{
    service_id: number;
    service_name: string;
    category: ServiceCategory;
    variant_label: string;
    model_type: PricingModelType;
    monthly_cost: number;
  }>;
  scenarios: Record<
    "conservative" | "expected" | "aggressive",
    { factor: number; monthly_cost: number }
  >;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---- Token storage ---------------------------------------------------------

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  set: (auth: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, auth.access);
    localStorage.setItem(REFRESH_KEY, auth.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ---- Request helper --------------------------------------------------------

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access: string };
  localStorage.setItem(TOKEN_KEY, data.access);
  return data.access;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = opts;

  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const exec = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url.pathname + url.search, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = tokenStore.getAccess();
  let res = await exec(token);

  // One automatic retry after refreshing the access token.
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await exec(newToken);
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : null) || `${method} ${path} failed with ${res.status}`;
    throw new ApiError(res.status, parsed, message);
  }

  return parsed as T;
}

// ---- Auth ------------------------------------------------------------------

export const authApi = {
  register: (username: string, password: string, email = "") =>
    request<AuthResponse>("/auth/register/", {
      method: "POST",
      auth: false,
      body: { username, password, email },
    }),
  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login/", {
      method: "POST",
      auth: false,
      body: { username, password },
    }),
  me: () => request<User>("/auth/me/"),
};

/**
 * Demo-mode bootstrap: ensure there is an authenticated user so the
 * single-user hackathon flow always works without a login screen. If no
 * token exists, register a deterministic local user. If the token has
 * been invalidated server-side (e.g. the SQLite DB was reset), fall back
 * to login, then register.
 */
export async function ensureDemoUser(): Promise<User> {
  const cached = tokenStore.getUser();
  if (cached && tokenStore.getAccess()) {
    try {
      const me = await authApi.me();
      return me;
    } catch {
      // Token expired / DB reset — fall through to (re)register.
    }
  }
  const username = "demo";
  const password = "pricepilot-demo-2026";
  try {
    const auth = await authApi.register(
      username,
      password,
      "demo@pricepilot.ai",
    );
    tokenStore.set(auth);
    return auth.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      const auth = await authApi.login(username, password);
      tokenStore.set(auth);
      return auth.user;
    }
    throw err;
  }
}

// ---- Pricing models --------------------------------------------------------

export const pricingModelsApi = {
  list: () =>
    request<{ models: PricingModelDef[] }>("/pricing-models/", { auth: false }),
};

// ---- Services --------------------------------------------------------------

export const servicesApi = {
  list: (params?: { category?: string; search?: string; status?: string }) =>
    request<PaginatedResponse<Service>>("/services/", {
      auth: false,
      query: params,
    }),
  detail: (id: number) =>
    request<ServiceDetail>(`/services/${id}/`, { auth: false }),
  create: (data: {
    name: string;
    category: ServiceCategory;
    description?: string;
    official_url?: string;
    icon_color?: string;
  }) => request<Service>("/services/", { method: "POST", body: data }),
  fuzzy: (q: string) =>
    request<FuzzyResult>("/services/fuzzy/", { auth: false, query: { q } }),
  suggest: (payload: {
    name: string;
    description: string;
    tech_stack: string[];
  }) =>
    request<SuggestResult>("/services/suggest/", {
      method: "POST",
      auth: false,
      body: payload,
    }),
};

// ---- Variants --------------------------------------------------------------

export const variantsApi = {
  list: (serviceId?: number) =>
    request<PaginatedResponse<PricingVariant>>("/variants/", {
      auth: false,
      query: { service: serviceId },
    }),
  create: (data: {
    service: number;
    label: string;
    model_type: PricingModelType;
    usage_inputs: Record<string, unknown>;
    notes?: string;
  }) => request<PricingVariant>("/variants/", { method: "POST", body: data }),
  vote: (id: number, value: -1 | 0 | 1) =>
    request<PricingVariant>(`/variants/${id}/vote/`, {
      method: "POST",
      body: { value },
    }),
};

// ---- Projects --------------------------------------------------------------

export const projectsApi = {
  list: () => request<PaginatedResponse<Project>>("/projects/"),
  detail: (id: number) => request<Project>(`/projects/${id}/`),
  create: (data: {
    name: string;
    description?: string;
    budget_target: number | string;
    tech_stack?: string[];
  }) => request<Project>("/projects/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Project>) =>
    request<Project>(`/projects/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/projects/${id}/`, { method: "DELETE" }),
  addService: (
    projectId: number,
    payload: {
      service_id: number;
      variant_id?: number | null;
      custom_model_type?: PricingModelType | "";
      custom_inputs?: Record<string, unknown>;
    },
  ) =>
    request<ProjectService>(`/projects/${projectId}/add_service/`, {
      method: "POST",
      body: payload,
    }),
  removeService: (projectId: number, serviceId: number) =>
    request<void>(`/projects/${projectId}/services/${serviceId}/`, {
      method: "DELETE",
    }),
  calculate: (projectId: number, usage: UsageInputs) =>
    request<CalculateResult>(`/projects/${projectId}/calculate/`, {
      method: "POST",
      body: { usage },
    }),
};
