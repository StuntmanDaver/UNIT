// hooks/usePromotionPricing.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  promotionPricingService,
  type PromotionPriceTier,
  type UpsertTierInput,
} from '@/services/promotionPricing';

const PRICING_KEY = ['promotion-price-tiers'] as const;

/** All tiers — admin sees all; tenants see only is_active=true (filtered by RLS). */
export function usePromotionPriceTiers() {
  return useQuery<PromotionPriceTier[]>({
    queryKey: PRICING_KEY,
    queryFn: () => promotionPricingService.listTiers(),
  });
}

/** Create or update a tier. Invalidates the tiers list cache on success. */
export function useUpsertPriceTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertTierInput) => promotionPricingService.upsertTier(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRICING_KEY }),
  });
}

/** Soft-delete (is_active=false). Invalidates the tiers list cache on success. */
export function useDeactivatePriceTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promotionPricingService.deactivateTier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRICING_KEY }),
  });
}
