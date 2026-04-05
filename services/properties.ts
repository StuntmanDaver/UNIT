import { supabase } from './supabase';

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
  total_units: number;
  image_url: string | null;
  created_at: string;
};

const PROPERTY_COLUMNS = 'id, name, address, city, state, type, total_units, image_url, created_at';

export const propertiesService = {
  async list(): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select(PROPERTY_COLUMNS);
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .select(PROPERTY_COLUMNS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async filter(filters: Record<string, string>): Promise<Property[]> {
    let query = supabase.from('properties').select(PROPERTY_COLUMNS);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(propertyData: Omit<Property, 'id' | 'created_at'>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
