import { supabase } from './supabaseClient';

export const notificationsService = {
  async filter(filters, orderBy = 'created_date', ascending = false, limit = null) {
    let query = supabase.from('notifications').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(notificationData) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markAllRead(userEmail, propertyId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_email', userEmail)
      .eq('property_id', propertyId)
      .eq('read', false);
    if (error) throw error;
  }
};
