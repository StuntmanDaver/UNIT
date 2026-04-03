import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function SlaDeadlineBadge({ slaDeadline, escalated }) {
  if (!slaDeadline) return null;

  const daysRemaining = Math.ceil((new Date(slaDeadline) - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {escalated && (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 font-semibold">
          Escalated
        </Badge>
      )}
      {daysRemaining > 0 ? (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          Due in {daysRemaining}d
        </Badge>
      ) : (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          Overdue {Math.abs(daysRemaining)}d
        </Badge>
      )}
    </div>
  );
}
