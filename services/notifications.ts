import { supabase } from './supabase';

export type Notification = {
  id: string;
  user_id: string;
  user_email: string;
  property_id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  read: boolean;
  created_date: string;
};

export const notificationsService = {
  async filter(
    filters: Record<string, string | boolean>,
    orderBy = 'created_date',
    ascending = false,
    limit: number | null = null
  ): Promise<Notification[]> {
    let query = supabase.from('notifications').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    if (limit !== null) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Notification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markAllRead(userId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .eq('read', false);
    if (error) throw error;
  },

  async getUnreadCount(userId: string, propertyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .eq('read', false);
    if (error) throw error;
    return count ?? 0;
  },
};
