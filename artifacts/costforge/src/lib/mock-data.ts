import { z } from "zod";

export type ServiceCategory = "LLM" | "Vector DB" | "Hosting" | "Storage" | "Payments" | "Monitoring" | "Communication" | "Auth";

export type PricingModelType = "per_token" | "per_seat" | "per_request" | "flat_rate" | "usage_based" | "tiered";

export interface PricingVariant {
  id: string;
  serviceId: string;
  name: string;
  modelType: PricingModelType;
  fields: any; // specific to modelType
  createdBy: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  isOfficial: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  officialUrl: string;
  isOfficial: boolean;
  iconColor: string;
}

export interface ProjectService {
  serviceId: string;
  variantId: string | null;
  customVariant?: PricingVariant;
}

export interface UsageInputs {
  activeUsers: number;
  tokensPerRequest: number;
  requestsPerUser: number;
  storageGb: number;
  bandwidthGb: number;
  computeHours: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  budgetTarget: number;
  techStack: string[];
  services: ProjectService[];
  usage: UsageInputs;
  createdAt: string;
}

export const INITIAL_SERVICES: Service[] = [
  { id: "s1", name: "OpenAI GPT-4o", category: "LLM", description: "Flagship multimodal model", officialUrl: "https://openai.com", isOfficial: true, iconColor: "#10a37f" },
  { id: "s2", name: "Anthropic Claude 3.5 Sonnet", category: "LLM", description: "Fast, capable model for everyday tasks", officialUrl: "https://anthropic.com", isOfficial: true, iconColor: "#d97757" },
  { id: "s3", name: "Pinecone", category: "Vector DB", description: "Managed vector database", officialUrl: "https://pinecone.io", isOfficial: true, iconColor: "#000000" },
  { id: "s4", name: "Vercel", category: "Hosting", description: "Frontend cloud and serverless functions", officialUrl: "https://vercel.com", isOfficial: true, iconColor: "#000000" },
  { id: "s5", name: "Stripe", category: "Payments", description: "Financial infrastructure for the internet", officialUrl: "https://stripe.com", isOfficial: true, iconColor: "#635bff" },
  { id: "s6", name: "Datadog", category: "Monitoring", description: "Cloud monitoring as a service", officialUrl: "https://datadoghq.com", isOfficial: true, iconColor: "#632ca6" },
  { id: "s7", name: "AWS Lambda", category: "Hosting", description: "Event-driven, serverless computing", officialUrl: "https://aws.amazon.com/lambda/", isOfficial: true, iconColor: "#ff9900" },
  { id: "s8", name: "Google Gemini 1.5 Pro", category: "LLM", description: "Google's most capable AI model", officialUrl: "https://deepmind.google", isOfficial: true, iconColor: "#4285f4" },
  { id: "s9", name: "Weaviate", category: "Vector DB", description: "Open source vector search engine", officialUrl: "https://weaviate.io", isOfficial: true, iconColor: "#130c49" },
  { id: "s10", name: "Cloudflare Workers", category: "Hosting", description: "Edge computing platform", officialUrl: "https://workers.cloudflare.com", isOfficial: true, iconColor: "#f38020" },
  { id: "s11", name: "Supabase", category: "Auth", description: "Open source Firebase alternative", officialUrl: "https://supabase.com", isOfficial: true, iconColor: "#3ecf8e" },
  { id: "s12", name: "Twilio", category: "Communication", description: "Customer engagement platform", officialUrl: "https://twilio.com", isOfficial: true, iconColor: "#f22f46" },
  { id: "s13", name: "SendGrid", category: "Communication", description: "Email delivery service", officialUrl: "https://sendgrid.com", isOfficial: true, iconColor: "#1a82e2" },
];

export const INITIAL_VARIANTS: PricingVariant[] = [
  { id: "v1", serviceId: "s1", name: "Official GPT-4o Pricing", modelType: "per_token", fields: { inputPricePer1k: 0.005, outputPricePer1k: 0.015 }, createdBy: "OpenAI", createdAt: new Date().toISOString(), upvotes: 1205, downvotes: 12, isOfficial: true },
  { id: "v2", serviceId: "s2", name: "Sonnet Pay-as-you-go", modelType: "per_token", fields: { inputPricePer1k: 0.003, outputPricePer1k: 0.015 }, createdBy: "Anthropic", createdAt: new Date().toISOString(), upvotes: 840, downvotes: 5, isOfficial: true },
  { id: "v3", serviceId: "s3", name: "Pinecone Serverless Standard", modelType: "usage_based", fields: { pricePerGbStorage: 0.33, pricePerGbBandwidth: 0.0, pricePerComputeHour: 0.0 }, createdBy: "Pinecone", createdAt: new Date().toISOString(), upvotes: 432, downvotes: 18, isOfficial: true },
  { id: "v4", serviceId: "s4", name: "Vercel Pro", modelType: "per_seat", fields: { pricePerSeat: 20 }, createdBy: "Vercel", createdAt: new Date().toISOString(), upvotes: 2100, downvotes: 50, isOfficial: true },
  { id: "v5", serviceId: "s5", name: "Stripe Standard", modelType: "flat_rate", fields: { monthlyFee: 0 }, createdBy: "Stripe", createdAt: new Date().toISOString(), upvotes: 560, downvotes: 10, isOfficial: true }, // Simplified
  { id: "v6", serviceId: "s6", name: "Datadog Pro", modelType: "per_seat", fields: { pricePerSeat: 15 }, createdBy: "Datadog", createdAt: new Date().toISOString(), upvotes: 300, downvotes: 25, isOfficial: true },
  { id: "v7", serviceId: "s11", name: "Supabase Pro", modelType: "flat_rate", fields: { monthlyFee: 25 }, createdBy: "Supabase", createdAt: new Date().toISOString(), upvotes: 950, downvotes: 8, isOfficial: true },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Customer Support Agent",
    description: "An AI agent to handle tier 1 customer support queries using historical ticket data.",
    budgetTarget: 500,
    techStack: ["React", "Python", "GPT-4o"],
    services: [
      { serviceId: "s1", variantId: "v1" },
      { serviceId: "s3", variantId: "v3" },
      { serviceId: "s4", variantId: "v4" }
    ],
    usage: {
      activeUsers: 1000,
      tokensPerRequest: 2000,
      requestsPerUser: 15,
      storageGb: 10,
      bandwidthGb: 50,
      computeHours: 720
    },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];
