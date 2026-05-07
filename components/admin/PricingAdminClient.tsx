'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { AdminPromotionPriceTier } from '@/lib/admin/types';

export type PriceTierFormInput = {
  id?: string;
  name: string;
  durationDays: number;
  priceCents: number;
  isFeatured: boolean;
  isActive: boolean;
};

type Props = {
  tiers: AdminPromotionPriceTier[];
  onUpsertTier: (input: PriceTierFormInput) => Promise<void>;
  onDeactivateTier: (id: string) => Promise<void>;
};

const EMPTY_TIER: PriceTierFormInput = {
  name: '',
  durationDays: 30,
  priceCents: 0,
  isFeatured: false,
  isActive: true,
};

function toFormInput(tier: AdminPromotionPriceTier): PriceTierFormInput {
  return {
    id: tier.id,
    name: tier.name,
    durationDays: tier.duration_days,
    priceCents: tier.price_cents,
    isFeatured: tier.is_featured,
    isActive: tier.is_active,
  };
}

export function PricingAdminClient({ tiers, onUpsertTier, onDeactivateTier }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PriceTierFormInput | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const activeTiers = useMemo(() => tiers.filter((tier) => tier.is_active), [tiers]);

  async function submitTier(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    setBusyKey(form.id ?? 'new');
    try {
      await onUpsertTier({
        ...form,
        durationDays: Number(form.durationDays),
        priceCents: Number(form.priceCents),
      });
      toast.success(form.id ? 'Pricing tier updated' : 'Pricing tier created');
      setForm(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save pricing tier');
    } finally {
      setBusyKey(null);
    }
  }

  async function updateTier(tier: AdminPromotionPriceTier, patch: Partial<PriceTierFormInput>): Promise<void> {
    setBusyKey(tier.id);
    try {
      await onUpsertTier({ ...toFormInput(tier), ...patch });
      toast.success('Pricing tier updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update pricing tier');
    } finally {
      setBusyKey(null);
    }
  }

  async function deactivateTier(tier: AdminPromotionPriceTier): Promise<void> {
    setBusyKey(tier.id);
    try {
      await onDeactivateTier(tier.id);
      toast.success('Pricing tier deactivated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not deactivate pricing tier');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Pricing</h1>
          <p className="mt-1 text-sm text-[#465A75]">Set promotion tiers used by future checkout sessions.</p>
        </div>
        <button type="button" className="unit-btn unit-btn-primary" onClick={() => setForm(EMPTY_TIER)}>
          Add Tier
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="unit-stat">
          <p className="text-xs font-bold uppercase text-[#465A75]">Active Tiers</p>
          <p className="mt-1 text-2xl font-black">{activeTiers.length}</p>
        </div>
        <div className="unit-stat">
          <p className="text-xs font-bold uppercase text-[#465A75]">Featured</p>
          <p className="mt-1 text-2xl font-black">{tiers.filter((tier) => tier.is_featured).length}</p>
        </div>
        <div className="unit-stat">
          <p className="text-xs font-bold uppercase text-[#465A75]">All Tiers</p>
          <p className="mt-1 text-2xl font-black">{tiers.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        {tiers.map((tier) => (
          <article key={tier.id} className="unit-card p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black">{tier.name}</h2>
                  <span className={tier.is_active ? 'unit-status bg-emerald-50 text-emerald-700' : 'unit-status bg-red-50 text-red-700'}>
                    {tier.is_active ? 'active' : 'inactive'}
                  </span>
                  {tier.is_featured && <span className="unit-status bg-amber-50 text-amber-700">featured</span>}
                </div>
                <p className="mt-1 text-sm text-[#465A75]">
                  ${(tier.price_cents / 100).toFixed(2)} for {tier.duration_days} days
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="unit-btn unit-btn-secondary" onClick={() => setForm(toFormInput(tier))}>
                  Edit
                </button>
                <button
                  type="button"
                  className="unit-btn unit-btn-secondary"
                  disabled={busyKey === tier.id}
                  onClick={() => void updateTier(tier, { isFeatured: !tier.is_featured })}
                >
                  {tier.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  type="button"
                  className="unit-btn unit-btn-secondary"
                  disabled={busyKey === tier.id}
                  onClick={() => void updateTier(tier, { isActive: !tier.is_active })}
                >
                  {tier.is_active ? 'Mark Inactive' : 'Mark Active'}
                </button>
                {tier.is_active && (
                  <button
                    type="button"
                    className="unit-btn unit-btn-danger"
                    disabled={busyKey === tier.id}
                    onClick={() => void deactivateTier(tier)}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {tiers.length === 0 && (
          <div className="unit-card py-12 text-center text-sm text-[#465A75]">
            No pricing tiers have been created yet.
          </div>
        )}
      </section>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="tier-form-title">
          <form className="unit-card w-full max-w-lg space-y-4 p-5" onSubmit={(event) => void submitTier(event)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="tier-form-title" className="text-lg font-black">
                  {form.id ? 'Edit Tier' : 'Add Tier'}
                </h2>
                <p className="mt-1 text-sm text-[#465A75]">Pricing changes apply to future checkouts only.</p>
              </div>
              <button type="button" className="unit-btn unit-btn-secondary" onClick={() => setForm(null)}>
                Close
              </button>
            </div>
            <label>
              <span className="unit-label">Name</span>
              <input className="unit-input" required value={form.name} onChange={(event) => setForm((current) => current && ({ ...current, name: event.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="unit-label">Duration Days</span>
                <input className="unit-input" type="number" min={1} required value={form.durationDays} onChange={(event) => setForm((current) => current && ({ ...current, durationDays: Number(event.target.value) }))} />
              </label>
              <label>
                <span className="unit-label">Price Cents</span>
                <input className="unit-input" type="number" min={0} required value={form.priceCents} onChange={(event) => setForm((current) => current && ({ ...current, priceCents: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm((current) => current && ({ ...current, isFeatured: event.target.checked }))} />
                Featured
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => current && ({ ...current, isActive: event.target.checked }))} />
                Active
              </label>
            </div>
            <button type="submit" className="unit-btn unit-btn-primary" disabled={busyKey === (form.id ?? 'new')}>
              Save Tier
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
