export const BRAND = {
  navy: '#101B29',
  navyLight: '#1D263A',
  blue: '#465A75',
  steel: '#5F708A',
  gray: '#E0E1DE',
  cloud: '#F4F5F7',
  mist: '#FFFFFF',
  paper: '#E5E7EB',
  ink: '#101B29',
  inkMuted: '#465A75',
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
  manufacturing: '#78716C',
  logistics: '#0EA5E9',
  food_service: '#D97706',
  professional_services: '#7C3AED',
  healthcare: '#14B8A6',
  automotive: '#DC2626',
  other: '#6B7280',
};

function relativeLuminance(hexColor: string): number {
  const channels = hexColor
    .replace('#', '')
    .slice(0, 6)
    .match(/../g)
    ?.map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

  if (!channels || channels.length !== 3) return 0;
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(backgroundColor: string): string {
  return contrastRatio('#FFFFFF', backgroundColor) >= 4.5 ? '#FFFFFF' : '#000000';
}
