import { supabase } from './supabase';

export type ReportTargetType = 'post' | 'business' | 'promotion';
export type ReportReason = 'spam' | 'harassment' | 'misleading' | 'inappropriate' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type ContentReport = {
  id: string;
  reporter_user_id: string | null;
  property_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CreateReportInput = {
  property_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details?: string | null;
};

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or unwanted promotion' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'misleading', label: 'Misleading or fraudulent' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export const contentModerationService = {
  async createReport(input: CreateReportInput): Promise<ContentReport> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in to report content.');

    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_user_id: user.id,
        property_id: input.property_id,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason,
        details: input.details?.trim() || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async listReports(propertyId: string): Promise<ContentReport[]> {
    const { data, error } = await supabase
      .from('content_reports')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateReportStatus(params: {
    id: string;
    status: ReportStatus;
    resolution_note?: string | null;
  }): Promise<ContentReport> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('content_reports')
      .update({
        status: params.status,
        resolution_note: params.resolution_note?.trim() || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async listBlockedBusinessIds(propertyId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_business_blocks')
      .select('business_id')
      .eq('property_id', propertyId);
    if (error) throw error;
    return (data ?? []).map((row: { business_id: string }) => row.business_id);
  },

  async blockBusiness(params: { business_id: string; property_id: string }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in to block a business.');

    const { error } = await supabase
      .from('user_business_blocks')
      .upsert({
        user_id: user.id,
        business_id: params.business_id,
        property_id: params.property_id,
      }, { onConflict: 'user_id,business_id' });
    if (error) throw error;
  },

  async unblockBusiness(businessId: string): Promise<void> {
    const { error } = await supabase
      .from('user_business_blocks')
      .delete()
      .eq('business_id', businessId);
    if (error) throw error;
  },
};
