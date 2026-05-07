import { describe, expect, it } from 'vitest';
import {
  getPromotionImageValidationError,
  normalizeOptionalFormValue,
  validateCtaPair,
} from './promotionForm';

describe('promotion form helpers', () => {
  it('requires CTA text and URL to be provided together', () => {
    expect(validateCtaPair({ ctaText: 'Book now', ctaLink: '' })).toEqual({
      field: 'ctaLink',
      message: 'CTA URL is required when CTA text is provided',
    });

    expect(validateCtaPair({ ctaText: '', ctaLink: 'https://example.com' })).toEqual({
      field: 'ctaText',
      message: 'CTA text is required when CTA URL is provided',
    });
  });

  it('requires CTA URLs to use http or https', () => {
    expect(validateCtaPair({ ctaText: 'Book now', ctaLink: 'example.com' })).toEqual({
      field: 'ctaLink',
      message: 'CTA URL must start with http:// or https://',
    });

    expect(validateCtaPair({ ctaText: 'Book now', ctaLink: 'https://example.com' })).toBeNull();
  });

  it('normalizes empty optional form values to null', () => {
    expect(normalizeOptionalFormValue('  ')).toBeNull();
    expect(normalizeOptionalFormValue('  https://example.com  ')).toBe('https://example.com');
  });

  it('accepts JPEG, PNG, and WebP promotion images up to 5 MB', () => {
    expect(getPromotionImageValidationError({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull();
    expect(getPromotionImageValidationError({ type: 'image/gif', size: 100 })).toBe(
      'Upload a JPEG, PNG, or WebP image'
    );
    expect(getPromotionImageValidationError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe(
      'Image must be 5 MB or smaller'
    );
  });
});
