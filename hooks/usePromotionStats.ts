// hooks/usePromotionStats.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export type MonthRevenue = {
  month: string;   // 'YYYY-MM'
  gross: number;   // sum of amount_cents for completed attempts, in dollars
  net: number;     // gross minus refunds, in dollars
};

export type AdEngagement = {
  totalViews: number;
  totalTaps: number;
};

/** 6 months of gross/net revenue data for the admin revenue chart. */
export function useMonthlyRevenue(propertyId: string) {
  return useQuery<MonthRevenue[]>({
    queryKey: ['monthly-revenue', propertyId],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const since = sixMonthsAgo.toISOString();

      const { data: attempts, error } = await supabase
        .from('promotion_payment_attempts')
        .select(
          `id, amount_cents, status, created_at,
           promotions!inner(property_id)`
        )
        .eq('promotions.property_id', propertyId)
        .in('status', ['completed', 'refunded'])
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const byMonth: Record<string, { gross: number; refunds: number }> = {};

      for (const attempt of attempts ?? []) {
        const month = attempt.created_at.slice(0, 7); // 'YYYY-MM'
        if (!byMonth[month]) byMonth[month] = { gross: 0, refunds: 0 };
        // Both completed and refunded represent gross revenue received
        byMonth[month].gross += attempt.amount_cents;
        // Only refunded ones subtract from net
        if (attempt.status === 'refunded') {
          byMonth[month].refunds += attempt.amount_cents;
        }
      }

      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { gross, refunds }]) => ({
          month,
          gross: gross / 100,
          net: (gross - refunds) / 100,
        }));
    },
    enabled: !!propertyId,
  });
}

/** Current calendar month view + tap totals for ad engagement section. */
export function useMonthlyEngagement(propertyId: string) {
  return useQuery<AdEngagement>({
    queryKey: ['monthly-engagement', propertyId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data, error } = await supabase
        .from('ad_analytics')
        .select(
          `event_type,
           promotions!inner(property_id)`
        )
        .eq('promotions.property_id', propertyId)
        .gte('created_at', monthStart);

      if (error) throw error;

      let totalViews = 0;
      let totalTaps = 0;
      for (const row of data ?? []) {
        if (row.event_type === 'view') totalViews++;
        else if (row.event_type === 'tap') totalTaps++;
      }

      return { totalViews, totalTaps };
    },
    enabled: !!propertyId,
  });
}
