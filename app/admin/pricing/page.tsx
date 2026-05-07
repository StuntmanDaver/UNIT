export const dynamic = 'force-dynamic';

import { PricingAdminClient } from '@/components/admin/PricingAdminClient';
import { deactivatePricingTierAction, getPricingTiers, upsertPricingTierAction } from '@/lib/admin/actions';

export default async function AdminPricingPage() {
  const tiers = await getPricingTiers();
  return (
    <PricingAdminClient
      tiers={tiers}
      onUpsertTier={upsertPricingTierAction}
      onDeactivateTier={deactivatePricingTierAction}
    />
  );
}
