type PropertyAccessProfile = {
  property_ids?: unknown;
};

export function normalizePropertyIds(propertyIds: unknown): string[] {
  if (!Array.isArray(propertyIds)) return [];

  return propertyIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

export function canAccessProperty(profile: PropertyAccessProfile, propertyId: string): boolean {
  if (!propertyId.trim()) return false;
  return normalizePropertyIds(profile.property_ids).includes(propertyId);
}
