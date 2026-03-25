// Brand hex values for canvas/chart contexts (non-Tailwind)
export const BRAND = {
  navy: '#101B29',
  blue: '#1D263A',
  slate: '#465A75',
  steel: '#7C8DA7',
  gray: '#E0E1DE',
};

// Semantic status colors (Tailwind classes)
export const STATUS_COLORS = {
  submitted: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-600',
};

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export const FINANCIAL_COLORS = {
  revenue: { bg: 'bg-green-50', text: 'text-green-700' },
  expense: { bg: 'bg-red-50', text: 'text-red-700' },
  forecast: { bg: 'bg-blue-50', text: 'text-blue-700' },
  liability: { bg: 'bg-orange-50', text: 'text-orange-700' },
  profit: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  loss: { bg: 'bg-red-100', text: 'text-red-700' },
};

// Chart hex colors (for Recharts fill/stroke)
export const CHART_COLORS = {
  revenue: '#10b981',
  expense: '#ef4444',
  net: '#465A75',
  forecast: '#3b82f6',
  category: ['#101B29', '#1D263A', '#465A75', '#7C8DA7', '#E0E1DE', '#3b82f6'],
};

// Category colors mapped to brand shades (Tailwind classes)
export const CATEGORY_COLORS = {
  manufacturing: 'bg-brand-navy/10 text-brand-navy',
  logistics: 'bg-brand-blue/20 text-brand-blue',
  retail: 'bg-brand-slate/10 text-brand-slate',
  food_service: 'bg-brand-steel/15 text-brand-steel',
  professional_services: 'bg-brand-navy/10 text-brand-navy',
  technology: 'bg-brand-slate/10 text-brand-slate',
  healthcare: 'bg-brand-blue/20 text-brand-blue',
  construction: 'bg-brand-steel/15 text-brand-steel',
  automotive: 'bg-brand-gray text-brand-slate',
  other: 'bg-brand-gray text-brand-slate',
};

// Category gradient colors (for FloorMapView pins)
export const CATEGORY_GRADIENTS = {
  manufacturing: 'from-brand-navy to-brand-blue',
  logistics: 'from-brand-blue to-brand-slate',
  retail: 'from-brand-slate to-brand-steel',
  food_service: 'from-brand-steel to-brand-gray',
  professional_services: 'from-brand-navy to-brand-slate',
  technology: 'from-brand-blue to-brand-steel',
  healthcare: 'from-brand-navy to-brand-blue',
  construction: 'from-brand-slate to-brand-navy',
  automotive: 'from-brand-steel to-brand-slate',
  other: 'from-brand-slate to-brand-steel',
};
