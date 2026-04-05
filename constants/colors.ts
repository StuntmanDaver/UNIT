export const BRAND = {
  navy: '#101B29',
  navyLight: '#1D263A',
  blue: '#465A75',
  steel: '#7C8DA7',
  gray: '#E0E1DE',
} as const;

export const STATUS_COLORS = {
  invited: { bg: '#FEF3C7', text: '#92400E' },
  active: { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#F3F4F6', text: '#6B7280' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  approved: { bg: '#D1FAE5', text: '#065F46' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#EF4444',
  accounting: '#3B82F6',
  legal: '#8B5CF6',
  hvac: '#F59E0B',
  medical: '#10B981',
  retail: '#EC4899',
  technology: '#6366F1',
  construction: '#F97316',
  other: '#6B7280',
};
