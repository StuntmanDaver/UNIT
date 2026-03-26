import { supabase } from './supabaseClient';

export const unitsService = {
  async listByProperty(propertyId) {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .order('unit_number');
    if (error) throw error;
    return data;
  },

  async getVacant(propertyId) {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'vacant')
      .order('unit_number');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('units')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
