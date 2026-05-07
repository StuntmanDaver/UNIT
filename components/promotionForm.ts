export const PROMOTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PROMOTION_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

type CtaPair = {
  ctaText?: string | null;
  ctaLink?: string | null;
};

type CtaValidationError = {
  field: 'ctaText' | 'ctaLink';
  message: string;
};

type PromotionImageCandidate = {
  type: string;
  size: number;
};

export function normalizeOptionalFormValue(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export function validateCtaPair(values: CtaPair): CtaValidationError | null {
  const ctaText = normalizeOptionalFormValue(values.ctaText);
  const ctaLink = normalizeOptionalFormValue(values.ctaLink);

  if (ctaText && !ctaLink) {
    return {
      field: 'ctaLink',
      message: 'CTA URL is required when CTA text is provided',
    };
  }

  if (!ctaText && ctaLink) {
    return {
      field: 'ctaText',
      message: 'CTA text is required when CTA URL is provided',
    };
  }

  if (ctaLink && !/^https?:\/\//i.test(ctaLink)) {
    return {
      field: 'ctaLink',
      message: 'CTA URL must start with http:// or https://',
    };
  }

  return null;
}

export function getPromotionImageValidationError(file: PromotionImageCandidate): string | null {
  if (!PROMOTION_IMAGE_TYPES.includes(file.type as (typeof PROMOTION_IMAGE_TYPES)[number])) {
    return 'Upload a JPEG, PNG, or WebP image';
  }

  if (file.size > PROMOTION_IMAGE_MAX_BYTES) {
    return 'Image must be 5 MB or smaller';
  }

  return null;
}
