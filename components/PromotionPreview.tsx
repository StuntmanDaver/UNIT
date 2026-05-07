import type { Promotion } from '@/lib/supabase/types';

type Props = {
  promotion: Pick<Promotion, 'image_url' | 'cta_link' | 'cta_text'>;
};

export function PromotionPreview({ promotion }: Props) {
  const hasImage = Boolean(promotion.image_url);
  const hasCta = Boolean(promotion.cta_text || promotion.cta_link);

  if (!hasImage && !hasCta) {
    return null;
  }

  const ctaText = promotion.cta_text || 'Open link';

  return (
    <div className="space-y-3">
      {hasImage && (
        <div
          aria-label="Promotion image preview"
          className="h-48 w-full rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] bg-cover bg-center"
          style={{ backgroundImage: `url(${promotion.image_url})` }}
        />
      )}
      {hasCta && (
        <div className="rounded-xl border border-[#465A75]/30 bg-[#F4F5F7] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#465A75]">Call To Action</p>
          {promotion.cta_link ? (
            <a
              href={promotion.cta_link}
              target="_blank"
              rel="noreferrer"
              className="unit-btn unit-btn-primary mt-2"
            >
              {ctaText}
            </a>
          ) : (
            <span className="unit-btn unit-btn-primary mt-2">
              {ctaText}
            </span>
          )}
          {promotion.cta_link && (
            <p className="mt-2 break-all text-xs font-medium text-[#465A75]">{promotion.cta_link}</p>
          )}
        </div>
      )}
    </div>
  );
}
