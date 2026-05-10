import { supabase } from './supabase';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function normalizeImageExtension(fileExtension: string): keyof typeof IMAGE_CONTENT_TYPES {
  const normalized = fileExtension.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized in IMAGE_CONTENT_TYPES) {
    return normalized as keyof typeof IMAGE_CONTENT_TYPES;
  }
  throw new Error('Only JPEG, PNG, and WebP images are supported');
}

export const storageService = {
  async uploadFile(uri: string, fileExtension = 'jpg'): Promise<{ file_url: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in to upload files');

    const extension = normalizeImageExtension(fileExtension);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
    const filePath = `${user.id}/uploads/${fileName}`;

    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const blob = await response.blob();
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error('Image must be 5 MB or smaller');
    if (blob.type && blob.type !== IMAGE_CONTENT_TYPES[extension]) {
      throw new Error('Image type does not match the selected file extension');
    }
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('public-assets')
      .upload(filePath, arrayBuffer, {
        contentType: IMAGE_CONTENT_TYPES[extension],
        upsert: false,
      });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);

    return { file_url: publicUrl };
  },
};
