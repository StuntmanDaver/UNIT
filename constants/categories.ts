export const BUSINESS_CATEGORIES = [
  'restaurant',
  'accounting',
  'legal',
  'hvac',
  'medical',
  'retail',
  'technology',
  'construction',
  'manufacturing',
  'logistics',
  'food_service',
  'professional_services',
  'healthcare',
  'automotive',
  'other',
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export function getCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
