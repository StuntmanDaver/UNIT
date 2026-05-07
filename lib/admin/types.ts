import type { AdvertiserProfile, PaymentStatus, ReviewStatus } from '@/lib/supabase/types';

export type AdminProfile = {
  id: string;
  role: 'tenant' | 'landlord';
  property_ids: string[];
  email: string;
  push_token?: string | null;
  needs_password_change?: boolean;
  display_name?: string | null;
  full_name?: string | null;
  invited_at?: string | null;
  activated_at?: string | null;
  status: 'invited' | 'active' | 'inactive';
  created_at: string;
};

export type AdminProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string | null;
  total_units: number;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type AdminBusiness = {
  id: string;
  property_id: string;
  owner_email: string;
  business_name: string;
  category: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  business_description: string | null;
  unit_number: string | null;
};

export type AdminTenant = {
  profile: AdminProfile;
  business: AdminBusiness | null;
};

export type AdminPromotion = {
  id: string;
  property_id: string;
  advertiser_id: string | null;
  business_name: string;
  business_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  payment_status: PaymentStatus;
  review_status: ReviewStatus;
  current_payment_intent_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  created_by_admin_id: string | null;
  external_contact_name: string | null;
  external_contact_email: string | null;
  external_contact_phone: string | null;
};

export type AdminPromotionReviewAction =
  | { action: 'approve' }
  | { action: 'allow_revision'; note: string }
  | { action: 'require_repayment'; note: string }
  | { action: 'reject'; note: string };

export type AdminPromotionPriceTier = {
  id: string;
  name: string;
  duration_days: number;
  is_featured: boolean;
  price_cents: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminNotification = {
  id: string;
  user_id: string;
  user_email: string;
  property_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_date: string;
};

export type AdminStats = {
  totalTenants: number;
  activeAccounts: number;
  pendingInvites: number;
  activePromotions: number;
};

export type AdminActivity = {
  id: string;
  type: 'tenant' | 'promotion';
  label: string;
  sublabel: string;
  created_at: string;
};

export type AdminDashboardData = {
  properties: AdminProperty[];
  selectedPropertyId: string;
  stats: AdminStats | null;
  recentActivity: AdminActivity[];
};

export type TenantImportInput = {
  email: string;
  business_name: string;
  category: string;
  contact_name?: string;
  contact_phone?: string;
  services?: string;
  description?: string;
  unit_number?: string;
  property_id: string;
};

export type TenantImportResult = {
  imported: number;
  failed: Array<{ email: string; reason: string }>;
  total: number;
};

export type AdvertiserAccount = AdvertiserProfile;
