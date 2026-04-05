import { useQuery } from '@tanstack/react-query';
import { profilesService, type Profile } from '@/services/profiles';
import { businessesService, type Business } from '@/services/businesses';

export type TenantWithBusiness = {
  profile: Profile;
  business: Business | null;
};

export function useTenants(propertyId: string, status?: string, search?: string) {
  return useQuery<TenantWithBusiness[]>({
    queryKey: ['tenants', propertyId, { status, search }],
    queryFn: async () => {
      const [profiles, businesses] = await Promise.all([
        profilesService.listByProperty(propertyId),
        businessesService.filter({ property_id: propertyId }),
      ]);

      const businessByEmail = new Map<string, Business>();
      for (const business of businesses) {
        businessByEmail.set(business.owner_email, business);
      }

      let tenants: TenantWithBusiness[] = profiles.map((profile) => ({
        profile,
        business: businessByEmail.get(profile.email) ?? null,
      }));

      if (status) {
        tenants = tenants.filter((t) => t.profile.status === status);
      }

      if (search) {
        const q = search.toLowerCase();
        tenants = tenants.filter(
          (t) =>
            t.profile.email.toLowerCase().includes(q) ||
            (t.business?.business_name ?? '').toLowerCase().includes(q)
        );
      }

      return tenants;
    },
    enabled: !!propertyId,
  });
}
