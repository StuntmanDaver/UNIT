'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/advertisers', label: 'Review' },
  { href: '/admin/promotions', label: 'Promotions' },
  { href: '/admin/advertiser-accounts', label: 'Accounts' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/pricing', label: 'Pricing' },
  { href: '/admin/push', label: 'Push' },
  { href: '/admin/profile', label: 'Profile' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? 'unit-btn unit-btn-primary shrink-0' : 'unit-btn unit-btn-secondary shrink-0'}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
