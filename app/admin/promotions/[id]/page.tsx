export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { PromotionReviewPanel } from '@/components/admin/PromotionReviewPanel';
import {
  getAdminPromotionDetail,
  submitPromotionRefundAction,
  submitPromotionReviewAction,
  submitPromotionSuspensionAction,
} from '@/lib/admin/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPromotionDetailPage({ params }: Props) {
  const { id } = await params;
  const { promotion, anomaly } = await getAdminPromotionDetail(id);
  const backHref = `/admin/promotions?propertyId=${encodeURIComponent(promotion.property_id)}&filter=All`;

  return (
    <div className="space-y-5">
      <Link href={backHref} className="unit-link">Back to all promotions</Link>
      <PromotionReviewPanel
        promotion={promotion}
        paymentAnomaly={anomaly}
        onReviewAction={submitPromotionReviewAction}
        onToggleSuspension={submitPromotionSuspensionAction}
        onIssueRefund={submitPromotionRefundAction}
      />
    </div>
  );
}
