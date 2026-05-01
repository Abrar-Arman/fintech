/**
 * React Query hooks for the PricePilot Ai backend.
 *
 * Components must NEVER call the api.ts functions directly — go through
 * these hooks so cache invalidation stays consistent.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  authApi,
  pricingModelsApi,
  projectsApi,
  servicesApi,
  variantsApi,
  type CalculateResult,
  type PricingModelDef,
  type PricingModelType,
  type Project,
  type ServiceCategory,
  type ServiceDetail,
  type Service,
  type FuzzyResult,
  type SuggestResult,
  type UsageInputs,
  type User,
} from "./api";

// ---- Auth ------------------------------------------------------------------

export function useCurrentUser(options?: UseQueryOptions<User>) {
  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    staleTime: Infinity,
    retry: false,
    ...options,
  });
}

// ---- Pricing models --------------------------------------------------------

export function usePricingModels() {
  return useQuery<{ models: PricingModelDef[] }>({
    queryKey: ["pricing-models"],
    queryFn: pricingModelsApi.list,
    staleTime: Infinity,
  });
}

// ---- Services --------------------------------------------------------------

export function useServices(params?: {
  category?: ServiceCategory | "";
  search?: string;
}) {
  return useQuery({
    queryKey: ["services", params ?? {}],
    queryFn: () =>
      servicesApi.list({
        category: params?.category || undefined,
        search: params?.search || undefined,
      }),
  });
}

export function useService(id: number | undefined) {
  return useQuery<ServiceDetail>({
    queryKey: ["service", id],
    queryFn: () => servicesApi.detail(id as number),
    enabled: !!id,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: servicesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useFuzzy(q: string) {
  return useQuery<FuzzyResult>({
    queryKey: ["fuzzy", q],
    queryFn: () => servicesApi.fuzzy(q),
    enabled: q.trim().length > 1,
    staleTime: 60_000,
  });
}

export function useSuggest() {
  return useMutation<
    SuggestResult,
    Error,
    { name: string; description: string; tech_stack: string[] }
  >({
    mutationFn: servicesApi.suggest,
  });
}

// ---- Variants --------------------------------------------------------------

export function useVariants(serviceId?: number) {
  return useQuery({
    queryKey: ["variants", serviceId],
    queryFn: () => variantsApi.list(serviceId),
    enabled: serviceId !== undefined,
  });
}

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: variantsApi.create,
    onSuccess: (variant) => {
      qc.invalidateQueries({ queryKey: ["variants", variant.service] });
      qc.invalidateQueries({ queryKey: ["service", variant.service] });
    },
  });
}

export function useVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: number; value: -1 | 0 | 1 }) =>
      variantsApi.vote(id, value),
    onSuccess: (variant) => {
      qc.invalidateQueries({ queryKey: ["variants", variant.service] });
      qc.invalidateQueries({ queryKey: ["service", variant.service] });
    },
  });
}

// ---- Projects --------------------------------------------------------------

export function useProjects(enabled = true) {
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
    enabled,
  });
}

export function useProject(id: number | undefined) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => projectsApi.detail(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useAddServiceToProject(projectId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      service_id: number;
      variant_id?: number | null;
      custom_model_type?: PricingModelType | "";
      custom_inputs?: Record<string, unknown>;
    }) => projectsApi.addService(projectId as number, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveServiceFromProject(projectId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: number) =>
      projectsApi.removeService(projectId as number, serviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useCalculateProject(projectId: number | undefined) {
  return useMutation<CalculateResult, Error, UsageInputs>({
    mutationFn: (usage) => projectsApi.calculate(projectId as number, usage),
  });
}

// ---- Aggregate stats for the dashboard ------------------------------------

export interface DashboardStats {
  projects: number;
  services: number;
  variants: number;
  votes: number;
  topServices: Array<{ service: Service; project_count: number }>;
}

export function useDashboardStats() {
  const { data: services } = useServices();
  const { data: projects } = useProjects();
  return {
    isLoading: !services || !projects,
    stats: {
      projects: projects?.count ?? 0,
      services: services?.count ?? 0,
      variants:
        services?.results.reduce((sum, s) => sum + (s.variant_count ?? 0), 0) ??
        0,
      topServices: (services?.results ?? [])
        .slice()
        .sort((a, b) => (b.project_count ?? 0) - (a.project_count ?? 0))
        .slice(0, 6)
        .map((service) => ({
          service,
          project_count: service.project_count ?? 0,
        })),
    } as DashboardStats,
  };
}
