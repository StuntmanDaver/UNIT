import { supabase } from './supabaseClient';

export const storageService = {
  async uploadFile(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from('public-assets')
      .upload(filePath, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);

    return { file_url: publicUrl };
  }
};
