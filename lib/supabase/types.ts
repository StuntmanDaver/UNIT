export type AdvertiserProfile = {
  id: string;
  business_name: string;
  contact_email: string;
  stripe_customer_id: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
};

export type ReviewStatus =
  | 'draft' | 'pending' | 'approved' | 'revision_requested'
  | 'rejected' | 'expired' | 'suspended';

export type PaymentStatus = 'unpaid' | 'paid' | 'repayment_required' | 'refunded' | null;

export type Promotion = {
  id: string;
  property_id: string;
  advertiser_id: string;
  business_name: string;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  review_status: ReviewStatus;
  payment_status: PaymentStatus;
  review_note: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type AdAnalyticsRow = {
  event_type: 'view' | 'tap';
  created_at: string;
};
