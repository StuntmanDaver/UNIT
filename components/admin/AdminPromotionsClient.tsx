'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PaymentStatusBadge, ReviewStatusBadge } from '@/components/StatusBadges';
import type { AdminPromotion } from './PromotionReviewPanel';

export type AdminPropertyOption = {
  id: string;
  name: string;
};

export type AdminPromotionSegmentMode = 'overview' | 'review-status';

type Segment = 'All' | 'Pending' | 'Approved' | 'External' | 'Rejected';

type Props = {
  properties: AdminPropertyOption[];
  promotions: AdminPromotion[];
  selectedPropertyId?: string | null;
  selectedSegment?: string | null;
  segmentMode?: AdminPromotionSegmentMode;
  detailHref?: (promotion: AdminPromotion) => string;
  newExternalHref?: string | ((propertyId: string) => string);
  showNewExternalAction?: boolean;
  isLoading?: boolean;
  error?: string | null;
};

const OVERVIEW_SEGMENTS: Segment[] = ['All', 'Pending', 'Approved', 'External'];
const REVIEW_STATUS_SEGMENTS: Segment[] = ['Pending', 'Approved', 'Rejected'];

function getSegments(mode: AdminPromotionSegmentMode): Segment[] {
  return mode === 'review-status' ? REVIEW_STATUS_SEGMENTS : OVERVIEW_SEGMENTS;
}

function isExternalPromotion(promotion: AdminPromotion): boolean {
  return promotion.advertiser_id === null || Boolean(promotion.created_by_admin_id);
}

function filterPromotions(promotions: AdminPromotion[], segment: Segment): AdminPromotion[] {
  switch (segment) {
    case 'Pending':
      return promotions.filter((promotion) => promotion.review_status === 'pending');
    case 'Approved':
      return promotions.filter((promotion) =>
        promotion.review_status === 'approved' || promotion.review_status === 'suspended'
      );
    case 'Rejected':
      return promotions.filter((promotion) =>
        promotion.review_status === 'rejected' || promotion.review_status === 'expired'
      );
    case 'External':
      return promotions.filter(isExternalPromotion);
    case 'All':
    default:
      return promotions;
  }
}

function normalizeSegment(value: string | null | undefined, segments: Segment[]): Segment {
  return segments.find((segment) => segment.toLowerCase() === value?.toLowerCase()) ?? segments[0];
}

function defaultDetailHref(promotion: AdminPromotion): string {
  return `/admin/promotions/${promotion.id}`;
}

function getExternalHref(
  newExternalHref: Props['newExternalHref'],
  propertyId: string | null
): string | null {
  if (!propertyId) return null;
  if (typeof newExternalHref === 'function') return newExternalHref(propertyId);
  if (typeof newExternalHref === 'string') return newExternalHref;
  return `/admin/promotions/new-external?propertyId=${encodeURIComponent(propertyId)}`;
}

export function AdminPromotionsClient({
  properties,
  promotions,
  selectedPropertyId,
  selectedSegment,
  segmentMode = 'overview',
  detailHref = defaultDetailHref,
  newExternalHref,
  showNewExternalAction = true,
  isLoading = false,
  error = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = getSegments(segmentMode);
  const activePropertyId =
    selectedPropertyId ?? searchParams.get('propertyId') ?? properties[0]?.id ?? null;
  const activeSegment = normalizeSegment(
    selectedSegment ?? searchParams.get('filter') ?? searchParams.get('segment'),
    segments
  );
  const externalHref = getExternalHref(newExternalHref, activePropertyId);

  const setQueryValue = (key: 'propertyId' | 'filter', value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set(key, value);
    if (key === 'propertyId') nextParams.set('filter', segments[0]);
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  const propertyPromotions = activePropertyId
    ? promotions.filter((promotion) => promotion.property_id === activePropertyId)
    : [];
  const visiblePromotions = filterPromotions(propertyPromotions, activeSegment);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="admin-promotion-property" className="unit-label">
            Property
          </label>
          <select
            id="admin-promotion-property"
            className="unit-input"
            value={activePropertyId ?? ''}
            onChange={(event) => setQueryValue('propertyId', event.target.value)}
          >
            {properties.length === 0 && <option value="">No properties</option>}
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        {showNewExternalAction && externalHref && (
          <Link href={externalHref} className="unit-btn unit-btn-primary">
            New External Promotion
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Promotion filters">
        {segments.map((segment) => (
          <button
            key={segment}
            type="button"
            role="tab"
            aria-selected={segment === activeSegment}
            className={
              segment === activeSegment
                ? 'unit-btn unit-btn-primary shrink-0'
                : 'unit-btn unit-btn-secondary shrink-0'
            }
            onClick={() => setQueryValue('filter', segment)}
          >
            {segment}
          </button>
        ))}
      </div>

      {isLoading && <div className="unit-loading">Loading promotions...</div>}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && !activePropertyId && (
        <div className="unit-card p-6 text-center text-sm font-semibold text-[#465A75]">
          Select a property to manage promotions.
        </div>
      )}

      {!isLoading && !error && activePropertyId && visiblePromotions.length === 0 && (
        <div className="unit-card p-6 text-center">
          <h2 className="text-base font-bold text-[#101B29]">No promotions</h2>
          <p className="mt-1 text-sm text-[#465A75]">
            No {activeSegment.toLowerCase()} promotions for this property.
          </p>
        </div>
      )}

      {!isLoading && !error && visiblePromotions.length > 0 && (
        <div className="grid gap-3">
          {visiblePromotions.map((promotion) => (
            <Link
              key={promotion.id}
              href={detailHref(promotion)}
              className="unit-card-soft block p-4 transition-colors hover:border-[#465A75]/60 hover:bg-[#F9FAFB]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold leading-6 text-[#101B29]">{promotion.headline}</h2>
                    {isExternalPromotion(promotion) && (
                      <span className="unit-status bg-[#465A75] text-white">External</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#465A75]">{promotion.business_name}</p>
                  {promotion.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#101B29]">
                      {promotion.description}
                    </p>
                  )}
                  {(promotion.start_date || promotion.end_date) && (
                    <p className="mt-2 text-xs font-semibold text-[#5F708A]">
                      {promotion.start_date ?? 'No start'} to {promotion.end_date ?? 'No end'}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <ReviewStatusBadge status={promotion.review_status} />
                  <PaymentStatusBadge status={promotion.payment_status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
