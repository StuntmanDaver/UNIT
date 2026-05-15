'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  AdminContentReport,
  ContentReportStatus,
} from '@/lib/admin/moderation';

export type ModerationProperty = {
  id: string;
  name: string;
};

export type ModerationActions = {
  updateReportStatus: (input: {
    id: string;
    status: ContentReportStatus;
    resolutionNote?: string | null;
  }) => Promise<void>;
};

type Props = {
  properties: ModerationProperty[];
  reports: AdminContentReport[];
  selectedPropertyId: string;
  actions: ModerationActions;
};

const STATUS_LABEL: Record<ContentReportStatus, string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const TARGET_LABEL: Record<AdminContentReport['target_type'], string> = {
  post: 'Post',
  business: 'Business',
  promotion: 'Promotion',
};

const REASON_LABEL: Record<AdminContentReport['reason'], string> = {
  spam: 'Spam or unwanted promotion',
  harassment: 'Harassment or abuse',
  misleading: 'Misleading or fraudulent',
  inappropriate: 'Inappropriate content',
  other: 'Other',
};

function statusClassName(status: ContentReportStatus): string {
  if (status === 'resolved') return 'unit-status bg-emerald-50 text-emerald-700';
  if (status === 'dismissed') return 'unit-status bg-slate-100 text-slate-700';
  if (status === 'reviewing') return 'unit-status bg-blue-50 text-blue-700';
  return 'unit-status bg-amber-50 text-amber-700';
}

export function ModerationClient({ properties, reports, selectedPropertyId, actions }: Props) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function handleAction(
    report: AdminContentReport,
    status: ContentReportStatus,
  ): Promise<void> {
    const key = `${report.id}:${status}`;
    setPendingKey(key);
    try {
      await actions.updateReportStatus({ id: report.id, status });
      toast.success(`Report marked ${STATUS_LABEL[status].toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update report');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">Moderation Queue</h1>
          <p className="mt-1 text-sm text-[#465A75]">
            Review tenant reports for posts, businesses, and promotions.
          </p>
        </div>
        <form className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row" action="/admin/moderation">
          <select
            name="propertyId"
            className="unit-input"
            defaultValue={selectedPropertyId}
            aria-label="Select property"
          >
            {properties.length === 0 && <option value="">No assigned properties</option>}
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <button type="submit" className="unit-btn unit-btn-primary shrink-0">
            Switch
          </button>
        </form>
      </header>

      {!selectedPropertyId ? (
        <div className="unit-card py-12 text-center text-sm text-[#465A75]">
          Select a property to view its moderation queue.
        </div>
      ) : reports.length === 0 ? (
        <div className="unit-card py-12 text-center text-sm text-[#465A75]">
          No reports for this property.
        </div>
      ) : (
        <section className="space-y-3">
          {reports.map((report) => {
            const reviewing = pendingKey === `${report.id}:reviewing`;
            const resolving = pendingKey === `${report.id}:resolved`;
            const dismissing = pendingKey === `${report.id}:dismissed`;
            const anyPending = reviewing || resolving || dismissing;
            return (
              <article key={report.id} className="unit-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black">{TARGET_LABEL[report.target_type]} report</h2>
                      <span className={statusClassName(report.status)}>{STATUS_LABEL[report.status]}</span>
                    </div>
                    <p className="text-sm text-[#465A75]">
                      Reason: {REASON_LABEL[report.reason]}
                    </p>
                    {report.details && (
                      <p className="text-sm text-[#101B29]">{report.details}</p>
                    )}
                    <p className="text-xs font-medium text-[#465A75]">
                      Target ID: <span className="font-mono">{report.target_id}</span>
                    </p>
                    {report.resolution_note && (
                      <p className="text-xs text-[#465A75]">
                        Note: {report.resolution_note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="unit-btn unit-btn-secondary"
                      aria-label={`Mark report as reviewing`}
                      disabled={anyPending || report.status === 'reviewing'}
                      onClick={() => void handleAction(report, 'reviewing')}
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      className="unit-btn unit-btn-primary"
                      aria-label={`Resolve report`}
                      disabled={anyPending || report.status === 'resolved'}
                      onClick={() => void handleAction(report, 'resolved')}
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      className="unit-btn unit-btn-secondary"
                      aria-label={`Dismiss report`}
                      disabled={anyPending || report.status === 'dismissed'}
                      onClick={() => void handleAction(report, 'dismissed')}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
