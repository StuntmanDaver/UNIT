import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ACTION_LABELS = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  status_changed: 'Status changed',
};

const ENTITY_LABELS = {
  invoice: 'Invoice',
  lease: 'Lease',
  expense: 'Expense',
  payment: 'Payment',
  recurring_payment: 'Recurring payment',
  recommendation: 'Request',
};

export default function AuditLogEntry({ entry }) {
  const actionLabel = ACTION_LABELS[entry.action] || entry.action;
  const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;
  const timestamp = format(new Date(entry.performed_at), 'MMM d, yyyy h:mm a');

  return (
    <div className="flex flex-col gap-1 py-3 border-b border-white/5 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{timestamp}</span>
        <Badge variant="outline" className="text-xs border-white/10 text-zinc-300">
          {actionLabel}
        </Badge>
      </div>
      <div className="text-base text-zinc-100">
        {entry.performed_by_email}
      </div>
      <div className="text-sm text-zinc-400">
        {actionLabel} {entityLabel.toLowerCase()}
      </div>
      {(entry.old_value || entry.new_value) && (
        <div className="mt-1 text-sm text-zinc-500 font-mono">
          {entry.old_value && (
            <span className="text-red-400/70">- {JSON.stringify(entry.old_value)}</span>
          )}
          {entry.old_value && entry.new_value && <br />}
          {entry.new_value && (
            <span className="text-green-400/70">+ {JSON.stringify(entry.new_value)}</span>
          )}
        </div>
      )}
    </div>
  );
}
