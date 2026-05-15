'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { assertAdminPropertyAccess, requireAdminAction } from './auth';
import { getAssignedProperties, selectedPropertyId, throwIfError } from './shared';
import type { AdminProperty } from './types';

export type ContentReportTargetType = 'post' | 'business' | 'promotion';
export type ContentReportReason = 'spam' | 'harassment' | 'misleading' | 'inappropriate' | 'other';
export type ContentReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type AdminContentReport = {
  id: string;
  reporter_user_id: string | null;
  property_id: string;
  target_type: ContentReportTargetType;
  target_id: string;
  reason: ContentReportReason;
  details: string | null;
  status: ContentReportStatus;
  resolution_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export async function getContentReports(requestedPropertyId?: string | null): Promise<{
  properties: AdminProperty[];
  selectedPropertyId: string;
  reports: AdminContentReport[];
}> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const propertyId = selectedPropertyId(context.propertyIds, requestedPropertyId);
  if (!propertyId) return { properties, selectedPropertyId: '', reports: [] };
  assertAdminPropertyAccess(context, propertyId);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  throwIfError(error);

  return {
    properties,
    selectedPropertyId: propertyId,
    reports: (data ?? []) as AdminContentReport[],
  };
}

type UpdateReportStatusInput = {
  id: string;
  status: ContentReportStatus;
  resolutionNote?: string | null;
};

export async function updateContentReportStatusAction(input: UpdateReportStatusInput): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();

  const { data: report, error: fetchError } = await supabase
    .from('content_reports')
    .select('id, property_id')
    .eq('id', input.id)
    .single();
  throwIfError(fetchError);
  if (!report) throw new Error('Report not found');
  assertAdminPropertyAccess(context, report.property_id);

  const resolutionNote =
    input.status === 'resolved'
      ? input.resolutionNote?.trim() || 'Reviewed and resolved by admin.'
      : input.resolutionNote?.trim() || null;

  const { error } = await supabase
    .from('content_reports')
    .update({
      status: input.status,
      resolution_note: resolutionNote,
      reviewed_by: context.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.id);
  throwIfError(error);
  revalidatePath('/admin/moderation');
}
