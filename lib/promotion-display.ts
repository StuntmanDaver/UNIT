export type PriceDisplayInput = {
  price_cents: number;
  currency: string;
};

export function formatPrice({ price_cents, currency }: PriceDisplayInput): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(price_cents / 100);
}

export function formatDuration(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function getReviewHref(
  promotionId: string,
  options: { repayment?: boolean } = {}
): string {
  const params = new URLSearchParams({ id: promotionId });
  if (options.repayment) {
    params.set('repayment', 'true');
  }
  return `/promotions/new/review?${params.toString()}`;
}
