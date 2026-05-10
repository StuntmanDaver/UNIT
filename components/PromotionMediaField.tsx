'use client';

import Image from 'next/image';
import type { ChangeEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getPromotionImageValidationError,
  PROMOTION_IMAGE_TYPES,
} from './promotionForm';

type PromotionMediaFieldProps = {
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
  disabled?: boolean;
  onUploadingChange?: (isUploading: boolean) => void;
};

function getUploadPath(file: File, userId: string): string {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'image';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'image';
  return `${userId}/promotions/${crypto.randomUUID()}.${safeExtension}`;
}

export function PromotionMediaField({
  imageUrl,
  onChange,
  disabled = false,
  onUploadingChange,
}: PromotionMediaFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [isUploading, setIsUploading] = useState(false);

  const setUploading = (value: boolean) => {
    setIsUploading(value);
    onUploadingChange?.(value);
  };

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = getPromotionImageValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('You must be signed in to upload images');

      const path = getUploadPath(file, user.id);
      const { error } = await supabase.storage
        .from('public-assets')
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const triggerPicker = () => {
    inputRef.current?.click();
  };

  return (
    <div>
      <label htmlFor="promotionImage" className="unit-label">Image (optional)</label>
      <input
        id="promotionImage"
        ref={inputRef}
        type="file"
        accept={PROMOTION_IMAGE_TYPES.join(',')}
        onChange={handleSelect}
        className="sr-only"
        disabled={disabled || isUploading}
      />

      {imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F4F5F7]">
          <div className="relative aspect-[16/9] w-full bg-[#F4F5F7]">
            <Image src={imageUrl} alt="Promotion image preview" fill className="object-cover" unoptimized />
          </div>
          <div className="flex flex-col gap-2 border-t border-[#E5E7EB] bg-white p-3 sm:flex-row">
            <button
              type="button"
              onClick={triggerPicker}
              disabled={disabled || isUploading}
              className="unit-btn unit-btn-secondary flex-1"
            >
              {isUploading ? 'Uploading…' : 'Replace Image'}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || isUploading}
              className="unit-btn unit-btn-danger flex-1"
            >
              Remove Image
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerPicker}
          disabled={disabled || isUploading}
          className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#465A75]/40 bg-[#F4F5F7] px-4 py-8 text-center transition-colors hover:border-[#465A75]/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#465A75]/30 disabled:opacity-50"
        >
          <span className="text-sm font-bold text-[#101B29]">
            {isUploading ? 'Uploading…' : 'Upload Image'}
          </span>
          <span className="mt-1 text-xs text-[#465A75]">JPEG, PNG, or WebP. Max 5 MB.</span>
        </button>
      )}
    </div>
  );
}
