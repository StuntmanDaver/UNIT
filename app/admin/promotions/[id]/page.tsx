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

  return (
    <div className="space-y-5">
      <Link href="/admin/promotions" className="unit-link">Back to promotions</Link>
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
