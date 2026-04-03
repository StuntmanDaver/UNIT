import { supabase } from './supabaseClient';
import { getSlaDeadline } from '@/lib/sla';

export const recommendationsService = {
  async filter(filters, orderBy = 'created_date', ascending = false) {
    let query = supabase.from('recommendations').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(recData) {
    const dataWithSla = {
      ...recData,
      sla_deadline: getSlaDeadline(recData.priority),
      escalated: false
    };
    const { data, error } = await supabase
      .from('recommendations')
      .insert(dataWithSla)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('recommendations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
