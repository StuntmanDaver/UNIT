'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', section: 'Overview', propertyScoped: true },
  { href: '/admin/tenants', label: 'Tenant Directory', section: 'People', propertyScoped: true },
  { href: '/admin/advertiser-accounts', label: 'Advertiser Approval', section: 'People', propertyScoped: false },
  { href: '/admin/advertisers', label: 'Review Queue', section: 'Promotions', propertyScoped: true },
  { href: '/admin/promotions', label: 'Promotion Library', section: 'Promotions', propertyScoped: true },
  { href: '/admin/pricing', label: 'Pricing Tiers', section: 'Promotions', propertyScoped: false },
  { href: '/admin/promotions/new-external', label: 'New External', section: 'Promotions', propertyScoped: true },
  { href: '/admin/properties', label: 'Properties', section: 'Operations', propertyScoped: false },
  { href: '/admin/push', label: 'Broadcasts', section: 'Operations', propertyScoped: true },
  { href: '/admin/moderation', label: 'Moderation', section: 'Operations', propertyScoped: true },
  { href: '/admin/profile', label: 'Admin Profile', section: 'Account', propertyScoped: false },
];

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const hrefFor = (href: string, propertyScoped: boolean): string => {
    if (!propertyScoped || !propertyId) return href;
    return `${href}?propertyId=${encodeURIComponent(propertyId)}`;
  };

  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));

  return (
    <div className="flex gap-4 overflow-x-auto pb-1" aria-label="Admin navigation">
      {sections.map((section) => (
        <div key={section} className="flex shrink-0 items-center gap-2">
          <span className="text-[0.68rem] font-black uppercase tracking-wide text-[#5F708A]">
            {section}
          </span>
          {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
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
      ))}
    </div>
  );
}
