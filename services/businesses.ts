import { supabase } from './supabase';

export type Business = {
  id: string;
  property_id: string;
  owner_email: string;
  business_name: string;
  unit_number: string | null;
  category: string;
  business_description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  logo_url: string | null;
  is_featured: boolean;
  created_at: string;
};

export const businessesService = {
  async filter(
    filters: Record<string, string>,
    search?: string
  ): Promise<Business[]> {
    let query = supabase.from('businesses').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,business_description.ilike.%${search}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(businessData: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getOccupiedUnits(propertyId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('businesses')
      .select('unit_number')
      .eq('property_id', propertyId);
    if (error) throw error;
    return new Set(
      (data ?? [])
        .map((row: { unit_number: string | null }) => row.unit_number)
        .filter((unitNumber): unitNumber is string => !!unitNumber)
    );
  },
};
