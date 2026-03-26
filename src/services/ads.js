import { supabase } from './supabaseClient';

export const adsService = {
  async filter(filters) {
    let query = supabase.from('ads').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
