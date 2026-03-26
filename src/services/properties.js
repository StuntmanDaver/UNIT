import { supabase } from './supabaseClient';

export const propertiesService = {
  async list() {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, city, state, type, total_units, image_url, created_at');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, city, state, type, total_units, image_url, created_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async filter(filters) {
    let query = supabase.from('properties').select('id, name, address, city, state, type, total_units, image_url, created_at');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
