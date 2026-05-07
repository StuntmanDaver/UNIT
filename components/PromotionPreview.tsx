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
          className="h-48 w-full rounded-xl border border-gray-200 bg-gray-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${promotion.image_url})` }}
        />
      )}
      {hasCta && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Call to action</p>
          {promotion.cta_link ? (
            <a
              href={promotion.cta_link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {ctaText}
            </a>
          ) : (
            <span className="mt-2 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              {ctaText}
            </span>
          )}
          {promotion.cta_link && (
            <p className="mt-2 break-all text-xs text-blue-700">{promotion.cta_link}</p>
          )}
        </div>
      )}
    </div>
  );
}
