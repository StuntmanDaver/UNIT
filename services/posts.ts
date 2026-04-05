import { supabase } from './supabase';

export type Post = {
  id: string;
  property_id: string;
  business_id: string;
  type: 'announcement' | 'event' | 'offer';
  title: string;
  content: string;
  event_date: string | null;
  event_time: string | null;
  expiry_date: string | null;
  image_url: string | null;
  created_date: string;
};

export const postsService = {
  async filter(
    filters: Record<string, string>,
    orderBy = 'created_date',
    ascending = false
  ): Promise<Post[]> {
    let query = supabase.from('posts').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(postData: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
