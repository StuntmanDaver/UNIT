// services/analytics.ts
import { supabase } from './supabase';

export const analyticsService = {
  /**
   * Record a view event. Silently swallows duplicate inserts (unique constraint
   * on (promotion_id, tenant_id, session_id) WHERE event_type = 'view').
   */
  async recordView(
    promotionId: string,
    tenantId: string,
    propertyId: string,
    sessionId: string
  ): Promise<void> {
    const { error } = await supabase.from('ad_analytics').insert({
      promotion_id: promotionId,
      tenant_id: tenantId,
      property_id: propertyId,
      session_id: sessionId,
      event_type: 'view',
    });
    // 23505 = unique_violation — server-side dedup; not an error
    if (error && error.code !== '23505') {
      throw new Error(error.message ?? `Database error: ${error.code}`);
    }
  },

  /** Record a tap event (no dedup — multiple taps per session are valid). */
  async recordTap(
    promotionId: string,
    tenantId: string,
    propertyId: string,
    sessionId: string
  ): Promise<void> {
    const { error } = await supabase.from('ad_analytics').insert({
      promotion_id: promotionId,
      tenant_id: tenantId,
      property_id: propertyId,
      session_id: sessionId,
      event_type: 'tap',
    });
    if (error) throw new Error(error.message ?? `Database error: ${error.code}`);
  },
};
