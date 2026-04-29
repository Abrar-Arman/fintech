/**
 * Client-side mirror of the backend cost engine in
 * `backend/api/calculator.py`. Used for the live cost preview on the
 * usage slider page (where re-hitting the backend on every drag would
 * be wasteful) and for the dashboard project cards.
 *
 * The authoritative number is always the response from POST
 * /api/projects/{id}/calculate/. This client estimator must stay in
 * sync with the Python implementation.
 */
import type {
  PricingVariant,
  Project,
  UsageInputs,
} from "./api";

export interface ServiceCostResult {
  serviceId: number;
  variantId: number | null;
  cost: number;
}

export interface CostCalculationResult {
  totalCost: number;
  serviceCosts: ServiceCostResult[];
}

const num = (raw: unknown, fallback = 0): number => {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const v = typeof raw === "string" ? Number(raw) : (raw as number);
  return Number.isFinite(v) ? (v as number) : fallback;
};

type Metric = "storage_gb" | "bandwidth_gb" | "compute_hours" | "requests";

interface Tier {
  threshold: number | null;
  price_per_unit: number | string;
}

function tieredCost(units: number, tiers: Tier[]): number {
  let cost = 0;
  let consumed = 0;
  for (const tier of tiers ?? []) {
    const price = num(tier.price_per_unit);
    if (tier.threshold === null || tier.threshold === undefined) {
      cost += Math.max(units - consumed, 0) * price;
      return cost;
    }
    const top = num(tier.threshold);
    const band = Math.max(Math.min(units, top) - consumed, 0);
    cost += band * price;
    consumed = top;
    if (units <= consumed) return cost;
  }
  return cost;
}

export function calculateVariantCost(
  variant: Pick<PricingVariant, "model_type" | "usage_inputs">,
  usage: UsageInputs,
): number {
  const fields = (variant.usage_inputs ?? {}) as Record<string, unknown>;
  const activeUsers = num(usage.active_users);
  const tokensPerRequest = num(usage.tokens_per_request);
  const requestsPerUser = num(usage.requests_per_user);
  const storageGb = num(usage.storage_gb);
  const bandwidthGb = num(usage.bandwidth_gb);
  const computeHours = num(usage.compute_hours);
  const totalRequests = activeUsers * requestsPerUser;
  const totalTokens = totalRequests * tokensPerRequest;

  const metricUnits = (m: string): number => {
    const map: Record<string, number> = {
      storage_gb: storageGb,
      bandwidth_gb: bandwidthGb,
      compute_hours: computeHours,
      requests: totalRequests,
    };
    return map[m] ?? 0;
  };

  switch (variant.model_type) {
    case "per_token": {
      const inRate = num(fields.price_per_1k_input_tokens);
      const outRate = num(fields.price_per_1k_output_tokens);
      const avg = (inRate + outRate) / 2;
      return (totalTokens / 1000) * avg;
    }
    case "per_seat": {
      const perSeat = num(fields.price_per_seat_monthly);
      const minSeats = num(fields.min_seats);
      const included = num(fields.included_seats);
      const billable = Math.max(activeUsers - included, minSeats);
      return billable * perSeat;
    }
    case "per_request": {
      const perReq = num(fields.price_per_request);
      const included = num(fields.included_requests_monthly);
      const billable = Math.max(totalRequests - included, 0);
      return billable * perReq;
    }
    case "flat_rate": {
      const fee = num(fields.monthly_fee);
      return fields.billing_cycle === "yearly" ? fee / 12 : fee;
    }
    case "usage_based": {
      const metric = (fields.metric as Metric) ?? "storage_gb";
      const unitPrice = num(fields.price_per_unit);
      const freeUnits = num(fields.free_tier_units);
      const billable = Math.max(metricUnits(metric) - freeUnits, 0);
      return billable * unitPrice;
    }
    case "tiered": {
      const metric = (fields.metric as Metric) ?? "requests";
      const tiers = (fields.tiers as Tier[]) ?? [];
      return tieredCost(metricUnits(metric), tiers);
    }
    default:
      return 0;
  }
}

export function calculateCost(project: Project): CostCalculationResult {
  const usage = project.usage_inputs ?? {};
  let totalCost = 0;
  const serviceCosts: ServiceCostResult[] = [];
  for (const ps of project.services ?? []) {
    if (!ps.variant) {
      const customType = (ps.custom_model_type ?? "") as PricingVariant["model_type"];
      const customInputs = (ps.custom_inputs ?? {}) as Record<string, unknown>;
      const cost = customType
        ? calculateVariantCost(
            { model_type: customType, usage_inputs: customInputs },
            usage,
          )
        : 0;
      totalCost += cost;
      serviceCosts.push({
        serviceId: ps.service.id,
        variantId: null,
        cost,
      });
      continue;
    }
    const cost = calculateVariantCost(ps.variant, usage);
    totalCost += cost;
    serviceCosts.push({
      serviceId: ps.service.id,
      variantId: ps.variant.id,
      cost,
    });
  }
  return { totalCost, serviceCosts };
}
