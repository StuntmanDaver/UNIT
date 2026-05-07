export type AdvertiserPromotionFieldsInput = {
  headline: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
};

export type NormalizedAdvertiserPromotionFields = {
  headline: string;
  description: string | null;
  start_date: string;
  end_date: string;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
};

function requiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldName} is required`);
  return trimmed;
}

function optionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeAdvertiserPromotionFields(
  data: AdvertiserPromotionFieldsInput
): NormalizedAdvertiserPromotionFields {
  const startDate = requiredText(data.startDate, 'Start date');
  const endDate = requiredText(data.endDate, 'End date');

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  return {
    headline: requiredText(data.headline, 'Headline'),
    description: optionalText(data.description),
    start_date: startDate,
    end_date: endDate,
    image_url: optionalText(data.imageUrl),
    cta_text: optionalText(data.ctaText),
    cta_link: optionalText(data.ctaLink),
  };
}
