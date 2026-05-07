'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PromotionMediaField } from '@/components/PromotionMediaField';
import type { AdminPropertyOption } from './AdminPromotionsClient';
import type { FormEvent } from 'react';

export type ExternalPromotionFormInput = {
  propertyId: string;
  businessName: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  externalContactName: string | null;
  externalContactEmail: string | null;
  externalContactPhone: string | null;
  startDate: string;
  endDate: string;
};

type Props = {
  properties: AdminPropertyOption[];
  selectedPropertyId?: string | null;
  onSubmit: (input: ExternalPromotionFormInput) => Promise<string | void> | string | void;
  onCancel?: () => void;
};

type FormErrorKey =
  | 'propertyId'
  | 'businessName'
  | 'headline'
  | 'description'
  | 'ctaText'
  | 'ctaLink'
  | 'startDate'
  | 'endDate'
  | 'form';

type FormErrors = Partial<Record<FormErrorKey, string>>;

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ExternalPromotionForm({
  properties,
  selectedPropertyId,
  onSubmit,
  onCancel,
}: Props) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(selectedPropertyId ?? properties[0]?.id ?? '');
  const [businessName, setBusinessName] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!propertyId) nextErrors.propertyId = 'Property is required';
    if (!businessName.trim()) nextErrors.businessName = 'Business name is required';
    if (!headline.trim()) nextErrors.headline = 'Headline is required';
    if (!description.trim()) nextErrors.description = 'Description is required';
    if (!ctaText.trim()) nextErrors.ctaText = 'CTA label is required';
    if (!ctaLink.trim()) nextErrors.ctaLink = 'CTA URL is required';
    if (!startDate) nextErrors.startDate = 'Start date is required';
    if (!endDate) nextErrors.endDate = 'End date is required';
    if (startDate && endDate && endDate <= startDate) {
      nextErrors.endDate = 'End date must be after start date';
    }
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const promotionId = await onSubmit({
        propertyId,
        businessName: businessName.trim(),
        headline: headline.trim(),
        description: description.trim(),
        imageUrl,
        ctaText: ctaText.trim(),
        ctaLink: ctaLink.trim(),
        externalContactName: trimOrNull(contactName),
        externalContactEmail: trimOrNull(contactEmail),
        externalContactPhone: trimOrNull(contactPhone),
        startDate,
        endDate,
      });
      toast.success('External promotion created');
      if (typeof promotionId === 'string' && promotionId.length > 0) {
        router.push(`/admin/promotions/${promotionId}`);
      } else {
        router.push('/admin/promotions');
      }
      router.refresh();
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Failed to create external promotion',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSubmitting || isUploading;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.form && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <div>
        <label htmlFor="external-promotion-property" className="unit-label">
          Property
        </label>
        <select
          id="external-promotion-property"
          className="unit-input"
          value={propertyId}
          onChange={(event) => {
            setPropertyId(event.target.value);
            setErrors((current) => ({ ...current, propertyId: undefined }));
          }}
          disabled={disabled}
        >
          {properties.length === 0 && <option value="">No properties</option>}
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        {errors.propertyId && <p className="mt-1 text-sm font-semibold text-red-600">{errors.propertyId}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="external-promotion-business" className="unit-label">
            Business Name
          </label>
          <input
            id="external-promotion-business"
            className="unit-input"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            disabled={disabled}
          />
          {errors.businessName && <p className="mt-1 text-sm font-semibold text-red-600">{errors.businessName}</p>}
        </div>
        <div>
          <label htmlFor="external-promotion-headline" className="unit-label">
            Headline
          </label>
          <input
            id="external-promotion-headline"
            className="unit-input"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            disabled={disabled}
          />
          {errors.headline && <p className="mt-1 text-sm font-semibold text-red-600">{errors.headline}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="external-promotion-description" className="unit-label">
          Description
        </label>
        <textarea
          id="external-promotion-description"
          className="unit-input min-h-32"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled}
        />
        {errors.description && <p className="mt-1 text-sm font-semibold text-red-600">{errors.description}</p>}
      </div>

      <PromotionMediaField
        imageUrl={imageUrl}
        onChange={setImageUrl}
        disabled={isSubmitting}
        onUploadingChange={setIsUploading}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="external-promotion-cta-label" className="unit-label">
            CTA Label
          </label>
          <input
            id="external-promotion-cta-label"
            className="unit-input"
            value={ctaText}
            onChange={(event) => setCtaText(event.target.value)}
            disabled={disabled}
          />
          {errors.ctaText && <p className="mt-1 text-sm font-semibold text-red-600">{errors.ctaText}</p>}
        </div>
        <div>
          <label htmlFor="external-promotion-cta-url" className="unit-label">
            CTA URL
          </label>
          <input
            id="external-promotion-cta-url"
            type="url"
            className="unit-input"
            value={ctaLink}
            onChange={(event) => setCtaLink(event.target.value)}
            disabled={disabled}
          />
          {errors.ctaLink && <p className="mt-1 text-sm font-semibold text-red-600">{errors.ctaLink}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="external-promotion-start-date" className="unit-label">
            Start Date
          </label>
          <input
            id="external-promotion-start-date"
            type="date"
            className="unit-input"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={disabled}
          />
          {errors.startDate && <p className="mt-1 text-sm font-semibold text-red-600">{errors.startDate}</p>}
        </div>
        <div>
          <label htmlFor="external-promotion-end-date" className="unit-label">
            End Date
          </label>
          <input
            id="external-promotion-end-date"
            type="date"
            className="unit-input"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            disabled={disabled}
          />
          {errors.endDate && <p className="mt-1 text-sm font-semibold text-red-600">{errors.endDate}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <h2 className="text-base font-bold text-[#101B29]">External Contact</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="external-promotion-contact-name" className="unit-label">
              Name
            </label>
            <input
              id="external-promotion-contact-name"
              className="unit-input"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor="external-promotion-contact-email" className="unit-label">
              Email
            </label>
            <input
              id="external-promotion-contact-email"
              type="email"
              className="unit-input"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor="external-promotion-contact-phone" className="unit-label">
              Phone
            </label>
            <input
              id="external-promotion-contact-phone"
              type="tel"
              className="unit-input"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            className="unit-btn unit-btn-secondary"
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="unit-btn unit-btn-primary" disabled={disabled}>
          {isSubmitting ? 'Creating...' : 'Create Promotion'}
        </button>
      </div>
    </form>
  );
}
