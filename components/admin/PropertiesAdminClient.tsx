'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { AdminProperty } from '@/lib/admin/types';

export type PropertyCreateInput = {
  name: string;
  address: string;
  city: string;
  state: string;
  type?: string;
  totalUnits?: number;
};

type Props = {
  properties: AdminProperty[];
  onCreateProperty: (input: PropertyCreateInput) => Promise<string>;
};

const EMPTY_FORM: PropertyCreateInput = {
  name: '',
  address: '',
  city: '',
  state: '',
  type: 'commercial',
  totalUnits: 0,
};

export function PropertiesAdminClient({ properties, onCreateProperty }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PropertyCreateInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitProperty(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateProperty({
        ...form,
        totalUnits: Number(form.totalUnits ?? 0),
      });
      toast.success('Property created');
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create property');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Properties</h1>
        <p className="mt-1 text-sm text-[#465A75]">Manage the properties assigned to this admin account.</p>
      </header>

      <form className="unit-card space-y-4 p-5" onSubmit={(event) => void submitProperty(event)}>
        <div>
          <h2 className="text-lg font-black">Create Property</h2>
          <p className="mt-1 text-sm text-[#465A75]">
            New properties are added to your admin access after creation.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="unit-label">Name</span>
            <input
              className="unit-input"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            <span className="unit-label">Type</span>
            <input
              className="unit-input"
              value={form.type ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="unit-label">Address</span>
            <input
              className="unit-input"
              required
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </label>
          <label>
            <span className="unit-label">City</span>
            <input
              className="unit-input"
              required
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
          </label>
          <label>
            <span className="unit-label">State</span>
            <input
              className="unit-input"
              required
              maxLength={2}
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
            />
          </label>
          <label>
            <span className="unit-label">Total Units</span>
            <input
              className="unit-input"
              type="number"
              min={0}
              value={form.totalUnits ?? 0}
              onChange={(event) => setForm((current) => ({ ...current, totalUnits: Number(event.target.value) }))}
            />
          </label>
        </div>
        <button type="submit" className="unit-btn unit-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Property'}
        </button>
      </form>

      <section className="grid gap-3 md:grid-cols-2">
        {properties.map((property) => (
          <article key={property.id} className="unit-card p-5">
            <h2 className="text-base font-black">{property.name}</h2>
            <p className="mt-1 text-sm text-[#465A75]">
              {property.address}, {property.city}, {property.state}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-bold text-[#465A75]">Type</dt>
                <dd className="mt-1 font-semibold">{property.type ?? 'commercial'}</dd>
              </div>
              <div>
                <dt className="font-bold text-[#465A75]">Units</dt>
                <dd className="mt-1 font-semibold">{property.total_units ?? 0}</dd>
              </div>
            </dl>
          </article>
        ))}
        {properties.length === 0 && (
          <div className="unit-card py-12 text-center text-sm text-[#465A75]">
            No properties are assigned to this admin account.
          </div>
        )}
      </section>
    </div>
  );
}
