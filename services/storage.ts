import { supabase } from './supabase';

export const storageService = {
  async uploadFile(uri: string, fileExtension = 'jpg'): Promise<{ file_url: string }> {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `uploads/${fileName}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('public-assets')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);

    return { file_url: publicUrl };
  },
};
