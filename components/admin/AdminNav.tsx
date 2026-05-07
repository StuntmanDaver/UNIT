'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', propertyScoped: true },
  { href: '/admin/tenants', label: 'Tenants', propertyScoped: true },
  { href: '/admin/advertisers', label: 'Promotion Review', propertyScoped: true },
  { href: '/admin/promotions', label: 'All Promotions', propertyScoped: true },
  { href: '/admin/advertiser-accounts', label: 'Advertiser Accounts', propertyScoped: false },
  { href: '/admin/properties', label: 'Properties', propertyScoped: false },
  { href: '/admin/pricing', label: 'Pricing', propertyScoped: false },
  { href: '/admin/push', label: 'Push', propertyScoped: true },
  { href: '/admin/profile', label: 'Profile', propertyScoped: false },
];

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const hrefFor = (href: string, propertyScoped: boolean): string => {
    if (!propertyScoped || !propertyId) return href;
    return `${href}?propertyId=${encodeURIComponent(propertyId)}`;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={hrefFor(item.href, item.propertyScoped)}
            className={isActive ? 'unit-btn unit-btn-primary shrink-0' : 'unit-btn unit-btn-secondary shrink-0'}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
