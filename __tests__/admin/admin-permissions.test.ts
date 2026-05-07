import { describe, expect, it } from 'vitest';
import { canAccessProperty, normalizePropertyIds } from '@/lib/admin/permissions';

describe('admin permissions', () => {
  it('normalizes invalid property id payloads to an empty list', () => {
    expect(normalizePropertyIds(null)).toEqual([]);
    expect(normalizePropertyIds('not-an-array')).toEqual([]);
    expect(normalizePropertyIds(['prop-1', 42, '', 'prop-2'])).toEqual(['prop-1', 'prop-2']);
  });

  it('allows landlords to operate only assigned properties', () => {
    const profile = { property_ids: ['prop-1', 'prop-2'] };

    expect(canAccessProperty(profile, 'prop-1')).toBe(true);
    expect(canAccessProperty(profile, 'prop-3')).toBe(false);
    expect(canAccessProperty(profile, '')).toBe(false);
  });
});
