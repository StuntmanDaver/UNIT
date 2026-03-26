import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AuditLogEntry from '@/components/AuditLogEntry';

export default function AuditLogTimeline({ entries, isLoading }) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-brand-navy/50 backdrop-blur-xl border-white/10">
        {[1, 2, 3].map(i => (
          <div key={i} className="py-3 space-y-2">
            <Skeleton className="h-4 w-32 bg-white/5" />
            <Skeleton className="h-5 w-48 bg-white/5" />
            <Skeleton className="h-4 w-40 bg-white/5" />
          </div>
        ))}
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card className="p-8 bg-brand-navy/50 backdrop-blur-xl border-white/10 text-center">
        <h3 className="text-xl font-bold text-white mb-2">No activity yet</h3>
        <p className="text-zinc-400">
          Audit entries will appear here when financial records or request statuses are changed.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-brand-navy/50 backdrop-blur-xl border-white/10">
      {entries.map(entry => (
        <AuditLogEntry key={entry.id} entry={entry} />
      ))}
    </Card>
  );
}
