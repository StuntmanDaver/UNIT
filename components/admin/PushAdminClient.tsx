'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { AdminNotification, AdminProperty } from '@/lib/admin/types';

type PushBroadcastInput = {
  propertyId: string;
  title: string;
  message: string;
  audience: 'all' | 'active';
};

type PushResult = {
  sent: number;
  failed: number;
  total: number;
};

type Props = {
  properties: AdminProperty[];
  selectedPropertyId: string;
  notifications: AdminNotification[];
  onSendBroadcast: (input: PushBroadcastInput) => Promise<PushResult>;
};

export function PushAdminClient({ properties, selectedPropertyId, notifications, onSendBroadcast }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [propertyId, setPropertyId] = useState(selectedPropertyId);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'active'>('all');
  const [isSending, setIsSending] = useState(false);

  function updateProperty(nextPropertyId: string): void {
    setPropertyId(nextPropertyId);
    const params = new URLSearchParams(searchParams.toString());
    if (nextPropertyId) params.set('propertyId', nextPropertyId);
    else params.delete('propertyId');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  async function submitBroadcast(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!propertyId) {
      toast.error('Select a property before sending a broadcast');
      return;
    }
    if (title.trim().length === 0 || title.length > 50) {
      toast.error('Title must be 1-50 characters');
      return;
    }
    if (message.trim().length === 0 || message.length > 200) {
      toast.error('Message must be 1-200 characters');
      return;
    }
    const confirmed = window.confirm(`Send this broadcast to ${audience === 'all' ? 'all tenants' : 'active tenants'}?`);
    if (!confirmed) return;

    setIsSending(true);
    try {
      const result = await onSendBroadcast({ propertyId, title, message, audience });
      toast.success(`Sent ${result.sent} of ${result.total} notifications`);
      setTitle('');
      setMessage('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send broadcast');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Broadcasts</h1>
        <p className="mt-1 text-sm text-[#465A75]">
          Compose property-scoped announcements and review recent broadcast history.
        </p>
      </header>

      <form className="unit-card space-y-4 p-5" onSubmit={(event) => void submitBroadcast(event)}>
        <label>
          <span className="unit-label">Property</span>
          <select className="unit-input" value={propertyId} onChange={(event) => updateProperty(event.target.value)}>
            <option value="">Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
          <label>
            <span className="unit-label">Title ({title.length}/50)</span>
            <input
              className="unit-input"
              maxLength={50}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="unit-label">Audience</span>
            <select className="unit-input" value={audience} onChange={(event) => setAudience(event.target.value as 'all' | 'active')}>
              <option value="all">All tenants</option>
              <option value="active">Active tenants</option>
            </select>
          </label>
        </div>

        <label>
          <span className="unit-label">Message ({message.length}/200)</span>
          <textarea
            className="unit-input min-h-28"
            maxLength={200}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
          />
        </label>

        <div className="rounded-lg border border-[#E5E7EB] bg-[#F4F5F7] p-4">
          <p className="text-xs font-bold uppercase text-[#465A75]">Preview</p>
          <p className="mt-2 font-black">{title || 'Broadcast title'}</p>
          <p className="mt-1 text-sm text-[#465A75]">{message || 'Broadcast message preview'}</p>
        </div>

        <button type="submit" className="unit-btn unit-btn-primary" disabled={isSending}>
          {isSending ? 'Sending...' : 'Send Broadcast'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-black">Sent History</h2>
        {notifications.map((notification) => (
          <article key={notification.id} className="unit-card p-4">
            <p className="font-black">{notification.title}</p>
            <p className="mt-1 text-sm text-[#465A75]">{notification.message}</p>
            <p className="mt-2 text-xs font-semibold text-[#5F708A]">
              {notification.user_email} - {new Date(notification.created_date).toLocaleString()}
            </p>
          </article>
        ))}
        {notifications.length === 0 && (
          <div className="unit-card py-12 text-center text-sm text-[#465A75]">
            No broadcast history for this property yet.
          </div>
        )}
      </section>
    </div>
  );
}
