import { supabase } from './supabaseClient';

export const postsService = {
  async filter(filters, orderBy = 'created_date', ascending = false) {
    let query = supabase.from('posts').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(postData) {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
