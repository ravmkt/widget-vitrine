export const MODULES = {
  VIDLYTICS: 'vidlytics',
  LIVE_COMMERCE: 'live-commerce',
  PDV: 'pdv',
  CHECKOUT: 'checkout',
  CRM: 'crm',
  CUPONS: 'cupons',
  METRICAS: 'metricas',
  WIDGETS: 'widgets',
} as const;

export type ModuleId = typeof MODULES[keyof typeof MODULES];

export interface PlanModules {
  modules?: ModuleId[] | string[] | null;
}

export function hasModuleAccess(
  moduleId: ModuleId,
  enabledModules: ModuleId[] | string[] | null | undefined,
): boolean {
  if (!enabledModules) return false;
  return enabledModules.includes(moduleId);
}

export function planHasModule(
  plan: PlanModules | null | undefined,
  moduleId: ModuleId,
): boolean {
  return hasModuleAccess(moduleId, plan?.modules);
}
