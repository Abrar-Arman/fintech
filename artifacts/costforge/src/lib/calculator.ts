import { Project, PricingVariant, UsageInputs } from "./mock-data";

export interface ServiceCostResult {
  serviceId: string;
  variantId: string | null;
  cost: number;
}

export interface CostCalculationResult {
  totalCost: number;
  serviceCosts: ServiceCostResult[];
}

export function calculateCost(project: Project, variants: PricingVariant[]): CostCalculationResult {
  let totalCost = 0;
  const serviceCosts: ServiceCostResult[] = [];

  for (const ps of project.services) {
    if (!ps.variantId && !ps.customVariant) {
      serviceCosts.push({ serviceId: ps.serviceId, variantId: null, cost: 0 });
      continue;
    }

    const variant = ps.customVariant || variants.find(v => v.id === ps.variantId);
    if (!variant) {
      serviceCosts.push({ serviceId: ps.serviceId, variantId: ps.variantId, cost: 0 });
      continue;
    }

    const cost = calculateVariantCost(variant, project.usage);
    totalCost += cost;
    serviceCosts.push({ serviceId: ps.serviceId, variantId: variant.id, cost });
  }

  return { totalCost, serviceCosts };
}

export function calculateVariantCost(variant: PricingVariant, usage: UsageInputs): number {
  const { modelType, fields } = variant;
  
  switch (modelType) {
    case "per_token": {
      // Assuming avg tokens per request is split 30% input, 70% output for a typical AI app
      const inputTokens = usage.tokensPerRequest * 0.3;
      const outputTokens = usage.tokensPerRequest * 0.7;
      const totalRequests = usage.activeUsers * usage.requestsPerUser;
      
      const inputCost = (inputTokens / 1000) * (fields.inputPricePer1k || 0) * totalRequests;
      const outputCost = (outputTokens / 1000) * (fields.outputPricePer1k || 0) * totalRequests;
      
      return inputCost + outputCost;
    }
    
    case "per_seat": {
      return usage.activeUsers * (fields.pricePerSeat || 0);
    }
    
    case "per_request": {
      const totalRequests = usage.activeUsers * usage.requestsPerUser;
      return totalRequests * (fields.pricePerRequest || 0);
    }
    
    case "flat_rate": {
      return fields.monthlyFee || 0;
    }
    
    case "usage_based": {
      const storageCost = usage.storageGb * (fields.pricePerGbStorage || 0);
      const bandwidthCost = usage.bandwidthGb * (fields.pricePerGbBandwidth || 0);
      const computeCost = usage.computeHours * (fields.pricePerComputeHour || 0);
      
      return storageCost + bandwidthCost + computeCost;
    }
    
    case "tiered": {
      // Simplified tiered logic for demo
      const baseFee = fields.baseFee || 0;
      const totalRequests = usage.activeUsers * usage.requestsPerUser;
      const overageCost = Math.max(0, totalRequests - (fields.includedRequests || 0)) * (fields.overagePricePerRequest || 0);
      return baseFee + overageCost;
    }
    
    default:
      return 0;
  }
}
