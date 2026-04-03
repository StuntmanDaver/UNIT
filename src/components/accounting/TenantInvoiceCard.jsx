import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

export default function TenantInvoiceCard({ invoice }) {
  const statusClass = STATUS_STYLES[invoice.status] || 'bg-gray-100 text-gray-600';

  return (
    <Card className="p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{invoice.invoice_number}</div>
          {invoice.description && (
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{invoice.description}</div>
          )}
          <div className="text-sm text-gray-500 mt-1">
            Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-lg font-bold text-gray-900">
            ${invoice.amount?.toLocaleString() ?? '—'}
          </div>
          <Badge className={statusClass}>
            {invoice.status}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
