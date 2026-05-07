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

function getUploadPath(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'image';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'image';
  return `promotions/${crypto.randomUUID()}.${safeExtension}`;
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
      const path = getUploadPath(file);
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
      <label htmlFor="promotionImage" className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          <div className="relative aspect-[16/9] w-full bg-gray-100">
            <Image src={imageUrl} alt="Promotion image preview" fill className="object-cover" unoptimized />
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-200 bg-white p-3 sm:flex-row">
            <button
              type="button"
              onClick={triggerPicker}
              disabled={disabled || isUploading}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Replace image'}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || isUploading}
              className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove image
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerPicker}
          disabled={disabled || isUploading}
          className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:bg-gray-100 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-gray-800">
            {isUploading ? 'Uploading...' : 'Upload image'}
          </span>
          <span className="mt-1 text-xs text-gray-500">JPEG, PNG, or WebP. Max 5 MB.</span>
        </button>
      )}
    </div>
  );
}
