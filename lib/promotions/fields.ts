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

function optionalHttpUrl(value: string | null, fieldName: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`${fieldName} must start with http:// or https://`);
    }
    return url.toString();
  } catch {
    throw new Error(`${fieldName} must be a valid http:// or https:// URL`);
  }
}

export function normalizeAdvertiserPromotionFields(
  data: AdvertiserPromotionFieldsInput
): NormalizedAdvertiserPromotionFields {
  const startDate = requiredText(data.startDate, 'Start date');
  const endDate = requiredText(data.endDate, 'End date');
  const ctaText = optionalText(data.ctaText);
  const ctaLink = optionalHttpUrl(optionalText(data.ctaLink), 'CTA URL');

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }
  if (ctaText && !ctaLink) {
    throw new Error('CTA URL is required when CTA text is set');
  }
  if (!ctaText && ctaLink) {
    throw new Error('CTA text is required when CTA URL is set');
  }

  return {
    headline: requiredText(data.headline, 'Headline'),
    description: optionalText(data.description),
    start_date: startDate,
    end_date: endDate,
    image_url: optionalText(data.imageUrl),
    cta_text: ctaText,
    cta_link: ctaLink,
  };
}
